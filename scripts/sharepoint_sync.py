"""
Nightly SharePoint sync.
Reads a CSV/Parquet file from SharePoint (via Microsoft Graph API) and upserts farm records.

Requires env vars:
  AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
  SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID
  SHAREPOINT_FILE_PATH  (path to the file within the drive, e.g. /General/farms.csv)
  DATABASE_URL

Run: python scripts/sharepoint_sync.py
Or nightly via GitHub Actions.
"""
import asyncio
import sys
import os
import io
import csv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx
from sqlalchemy import select
from app.database import SessionLocal
from app.models.orm import Farm


TENANT_ID = os.getenv("AZURE_TENANT_ID", "")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "")
SITE_ID = os.getenv("SHAREPOINT_SITE_ID", "")
DRIVE_ID = os.getenv("SHAREPOINT_DRIVE_ID", "")
FILE_PATH = os.getenv("SHAREPOINT_FILE_PATH", "/General/farms.csv")


async def get_access_token(client: httpx.AsyncClient) -> str:
    resp = await client.post(
        f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def download_farms_csv(client: httpx.AsyncClient, token: str) -> list[dict]:
    url = (
        f"https://graph.microsoft.com/v1.0/sites/{SITE_ID}/drives/{DRIVE_ID}"
        f"/root:{FILE_PATH}:/content"
    )
    resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    return list(reader)


def parse_enterprise_types(raw: str) -> list[str]:
    """Parse 'Sheep,Suckler' → ['sheep', 'suckler']"""
    valid = {"sheep", "suckler", "calf_rearer"}
    return [
        t.strip().lower().replace(" ", "_")
        for t in raw.split(",")
        if t.strip().lower().replace(" ", "_") in valid
    ]


async def sync(dry_run: bool = False):
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SITE_ID, DRIVE_ID]):
        print("SharePoint credentials not set — skipping sync.")
        print("Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,")
        print("SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID in your environment.")
        return

    async with httpx.AsyncClient(timeout=30) as client:
        print("Authenticating with Microsoft Graph…")
        token = await get_access_token(client)
        print(f"Downloading farms file from SharePoint: {FILE_PATH}")
        rows = await download_farms_csv(client, token)
        print(f"Found {len(rows)} rows")

    async with SessionLocal() as db:
        created = updated = 0
        for row in rows:
            client_ref = row.get("client_ref", "").strip()
            if not client_ref:
                continue

            result = await db.execute(select(Farm).where(Farm.client_ref == client_ref))
            farm = result.scalar_one_or_none()

            enterprise_types = parse_enterprise_types(row.get("enterprise_types", ""))

            if farm is None:
                if not dry_run:
                    farm = Farm(
                        client_ref=client_ref,
                        name=row.get("name", ""),
                        contact_name=row.get("contact_name"),
                        email=row.get("email"),
                        phone=row.get("phone"),
                        enterprise_types=enterprise_types,
                        sbi_no=row.get("sbi_no"),
                        ahwp_agreement_no=row.get("ahwp_agreement_no"),
                        active=True,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(farm)
                created += 1
                print(f"  + {client_ref} {row.get('name', '')}")
            else:
                if not dry_run:
                    farm.name = row.get("name", farm.name)
                    farm.contact_name = row.get("contact_name", farm.contact_name)
                    farm.email = row.get("email", farm.email)
                    farm.phone = row.get("phone", farm.phone)
                    farm.enterprise_types = enterprise_types or farm.enterprise_types
                    farm.sbi_no = row.get("sbi_no", farm.sbi_no)
                    farm.updated_at = datetime.utcnow()
                updated += 1

        if not dry_run:
            await db.commit()

    label = "[DRY RUN] " if dry_run else ""
    print(f"\n{label}Done: {created} created, {updated} updated")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(sync(dry_run=dry))
