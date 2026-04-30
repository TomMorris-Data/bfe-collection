"""
Antibiotic prescription sync — reads local OneDrive-synced Rx CSVs,
calculates mg from volume × concentration, uploads to the Worker API.

No Azure credentials needed — runs against locally synced files.

Usage:
  python scripts/sync_prescriptions.py
  python scripts/sync_prescriptions.py --dry-run

Env vars:
  WORKER_API_URL   (optional, defaults to production Worker URL)
  WORKER_API_KEY   (optional shared secret, add to Worker if you want auth)
  RX_FOLDER        (optional override for the Rx Folder path)
"""

import csv
import io
import os
import sys
import json
import urllib.request
import urllib.error
from datetime import date, datetime, timedelta
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent

# Local OneDrive-synced SharePoint path
RX_FOLDER = Path(os.environ.get(
    "RX_FOLDER",
    r"C:\Users\Tom Morris\OneDrive - Belmont Farm & Equine Vets Ltd"
    r"\BFEVets Data - Documents\Rx Folder"
))

ITEMS_CSV         = RX_FOLDER / "view_ConsultationItems.csv"
CONCENTRATIONS_CSV = SCRIPT_DIR / "antibiotic_concentrations.csv"

WORKER_URL = os.environ.get("WORKER_API_URL", "https://bfe-health-api.tmorris.workers.dev")
API_KEY    = os.environ.get("WORKER_API_KEY", "")

# Antibiotic service categories in Rx
ANTIBIOTIC_SERVICES = {"Farm Antibiotics", "Farm CIAs"}


# ── Rolling 12-month window ────────────────────────────────────────────────

def rolling_window() -> tuple[date, date]:
    """Last day of previous month, back 12 months — matches Power BI DAX."""
    today = date.today()
    to = date(today.year, today.month, 1) - timedelta(days=1)
    fr = date(to.year - 1, to.month + 1, 1) if to.month < 12 else date(to.year, 1, 1)
    return fr, to


# ── Load concentration lookup ──────────────────────────────────────────────

def load_concentrations() -> dict[str, dict]:
    """Returns {item_code: {active_substance, ema_grade, mg_per_unit}}"""
    out: dict[str, dict] = {}
    with open(CONCENTRATIONS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                out[row["item_code"].strip()] = {
                    "active_substance": row["active_substance"].strip(),
                    "ema_grade":        row["ema_grade"].strip(),
                    "mg_per_unit":      float(row["mg_per_unit"]),
                    "item_name":        row["item_name"].strip(),
                }
            except (ValueError, KeyError):
                pass
    return out


# ── Parse ConsultationItems ────────────────────────────────────────────────

def parse_items(concentrations: dict, window_from: date, window_to: date) -> list[dict]:
    """
    Stream through view_ConsultationItems.csv (1M+ rows).
    Keep only antibiotic lines within the rolling 12-month window.
    Returns list of upload-ready dicts.
    """
    results: list[dict] = []
    skipped_date = skipped_conc = skipped_volume = 0

    with open(ITEMS_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Filter to antibiotic service categories
            if row.get("Item Service", "").strip() not in ANTIBIOTIC_SERVICES:
                continue

            # Filter by date
            raw_date = row.get("Consultation Date", "").strip()
            try:
                consult_date = datetime.fromisoformat(
                    raw_date.replace("Z", "+00:00")
                ).date()
            except ValueError:
                skipped_date += 1
                continue
            if not (window_from <= consult_date <= window_to):
                continue

            # Get concentration for this item
            item_code = row.get("Item Code", "").strip()
            conc = concentrations.get(item_code)
            if not conc:
                skipped_conc += 1
                continue

            # Calculate mg
            vol_raw = row.get("Item Component Number", "").strip()
            try:
                volume = float(vol_raw)
            except ValueError:
                skipped_volume += 1
                continue
            if volume <= 0:
                continue

            total_mg = volume * conc["mg_per_unit"]

            # Sale value
            sale_raw = row.get("Item Component Sale Price", "").strip()
            try:
                sale_value = float(sale_raw) if sale_raw else None
            except ValueError:
                sale_value = None

            results.append({
                "client_ref":       row.get("Client Number", "").strip(),
                "date":             consult_date.isoformat(),
                "product_name":     row.get("Item Name", "").strip() or None,
                "active_substance": conc["active_substance"] or None,
                "total_mg":         round(total_mg, 2),
                "volume_ml":        volume,
                "sale_value_gbp":   sale_value,
            })

    print(f"  Skipped: {skipped_date} bad dates, "
          f"{skipped_conc} unknown item codes, "
          f"{skipped_volume} bad volumes")
    return results


# ── Upload ─────────────────────────────────────────────────────────────────

def upload(payload: list[dict]) -> dict:
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Content-Length": str(len(data)),
    }
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    req = urllib.request.Request(
        f"{WORKER_URL}/api/antibiotics/prescriptions/upload",
        data=data,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Upload failed {e.code}: {body}") from e


# ── Main ───────────────────────────────────────────────────────────────────

def main(dry_run: bool = False):
    if not ITEMS_CSV.exists():
        print(f"ERROR: Cannot find {ITEMS_CSV}")
        print("Make sure the Rx Folder SharePoint library is synced in OneDrive.")
        sys.exit(1)

    window_from, window_to = rolling_window()
    print(f"Rolling window: {window_from} → {window_to}")

    print("Loading concentration lookup…")
    concentrations = load_concentrations()
    print(f"  {len(concentrations)} antibiotic products loaded")

    print(f"Reading {ITEMS_CSV.name} ({ITEMS_CSV.stat().st_size / 1e6:.0f} MB)…")
    rows = parse_items(concentrations, window_from, window_to)
    print(f"  {len(rows):,} antibiotic dispensing lines in window")

    if not rows:
        print("Nothing to upload.")
        return

    if dry_run:
        print("\n[DRY RUN] First 5 rows:")
        for r in rows[:5]:
            print(" ", r)
        total_mg = sum(r["total_mg"] for r in rows)
        clients = len({r["client_ref"] for r in rows})
        print(f"\nSummary: {total_mg:,.0f} mg across {clients} clients")
        return

    print(f"Uploading {len(rows):,} rows to {WORKER_URL}…")
    result = upload(rows)
    print(f"Done: {result.get('imported'):,} imported, "
          f"{result.get('skipped')} skipped (unknown client_ref), "
          f"batch={result.get('batch_id')}")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    main(dry_run=dry)
