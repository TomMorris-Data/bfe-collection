"""
Weekly magic-link dispatch script.
Run via: python scripts/dispatch.py
Or schedule via GitHub Actions / cron to run every Monday at 08:00.

Requires:
  DATABASE_URL, RESEND_API_KEY, APP_BASE_URL set in environment (or .env).
"""
import asyncio
import sys
import os
from datetime import date, timedelta

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select
from app.database import SessionLocal
from app.models.orm import Farm
from app.services.magic_link import create_token
from app.services.email import send_checkin_email


def this_week_period():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(days=13)


async def dispatch_all(dry_run: bool = False):
    period_start, period_end = this_week_period()
    print(f"Dispatching for period {period_start} – {period_end}")

    async with SessionLocal() as db:
        result = await db.execute(
            select(Farm).where(Farm.active == True, Farm.email.isnot(None))
        )
        farms = result.scalars().all()
        print(f"Found {len(farms)} active farms with email")

        sent = 0
        skipped = 0
        for farm in farms:
            if dry_run:
                print(f"  [DRY RUN] Would send to {farm.name} <{farm.email}>")
                skipped += 1
                continue
            try:
                token = await create_token(db, farm, period_start, period_end)
                ok = await send_checkin_email(farm, token)
                if ok:
                    sent += 1
                    print(f"  ✓ {farm.name} <{farm.email}>")
                else:
                    skipped += 1
                    print(f"  ✗ {farm.name} — email failed")
            except Exception as exc:
                skipped += 1
                print(f"  ✗ {farm.name} — error: {exc}")

    print(f"\nDone: {sent} sent, {skipped} skipped")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(dispatch_all(dry_run=dry))
