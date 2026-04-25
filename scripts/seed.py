"""
Seed the database with test farms and sample responses for local development.
Run AFTER docker compose up:

  docker compose exec backend python /app/../scripts/seed.py
  -- or locally:
  python scripts/seed.py

Creates 3 test farms, issues a magic link for each, and seeds two years of
sample responses so the pre-visit report and AI briefing have data to show.
"""
import asyncio
import sys
import os
from datetime import date, datetime, timedelta
import uuid
import secrets

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models.orm import Farm, CheckInToken, CheckInResponse, SeasonalConfig, Benchmark


TEST_FARMS = [
    {
        "client_ref": "BFE001",
        "name": "Hilltop Farm",
        "contact_name": "John Shepherd",
        "email": "john@hilltopfarm.example",
        "enterprise_types": ["sheep"],
        "sbi_no": "123456789",
    },
    {
        "client_ref": "BFE002",
        "name": "Valley View Farm",
        "contact_name": "Sarah Catterton",
        "email": "sarah@valleyview.example",
        "enterprise_types": ["suckler"],
        "sbi_no": "987654321",
    },
    {
        "client_ref": "BFE003",
        "name": "Meadow End Farm",
        "contact_name": "Mike Thompson",
        "email": "mike@meadowend.example",
        "enterprise_types": ["sheep", "suckler"],
        "sbi_no": "111222333",
    },
]

SHEEP_RESPONSES = {
    "sheep_ewes_to_tup": 320,
    "sheep_scanning_pct": 178.0,
    "sheep_empty_at_scan": 12,
    "sheep_abortions": 8,
    "sheep_difficult_lambings": 14,
    "sheep_lambs_born_alive": 542,
    "sheep_lamb_losses_24h": 9,
    "sheep_lamb_losses_7d": 8,
    "sheep_lambs_turned_out": 525,
    "sheep_replacements_added": 40,
    "sheep_ewes_died": 11,
    "sheep_avg_weaning_weight": 32.5,
    "sheep_avg_weaning_age": 98,
    "sheep_lambs_sold_fat": 480,
    "sheep_avg_sale_weight": 42.0,
    "sheep_vaginal_prolapse": 3,
    "sheep_mastitis": 5,
    "sheep_fly_strike": 7,
    "sheep_watery_mouth": 4,
    "sheep_orf": 6,
    "sheep_scour_lambs": 9,
    "sheep_lameness_count": 8,
    "treatment_antibiotic_count": 11,
    "aims_went_well": "Lambing percentage up on last year, fewer difficult lambings than expected.",
    "aims_challenges": "Fly strike was worse than usual in August. Lost more lambs in first week.",
    "aims_targets": "Improve lamb survival in first 7 days. Look at colostrum management protocol.",
}

SHEEP_PRIOR = {**SHEEP_RESPONSES, "sheep_lambs_born_alive": 498, "sheep_lamb_losses_24h": 7,
               "sheep_lamb_losses_7d": 6, "sheep_ewes_died": 9, "treatment_antibiotic_count": 6,
               "sheep_scanning_pct": 165.0}

SUCKLER_RESPONSES = {
    "suckler_cows_calved": 112,
    "suckler_assisted_calvings": 9,
    "suckler_abortions": 2,
    "suckler_calves_born_alive": 108,
    "suckler_calves_dead_at_birth": 3,
    "suckler_calves_died_14d": 2,
    "suckler_calving_spread_weeks": 7,
    "suckler_calves_weaned": 103,
    "suckler_avg_weaning_weight": 285.0,
    "suckler_cows_to_bull": 118,
    "suckler_bull_weeks": 10,
    "suckler_in_calf_at_pd": 110,
    "suckler_pneumonia_calves": 8,
    "suckler_scour_calves": 11,
    "suckler_retained_cleansings": 4,
    "suckler_johnes_suspected": 1,
    "suckler_bvd_suspected": 0,
    "treatment_antibiotic_count": 11,
    "treatment_antibiotic_product": "Enrofloxacin, Penicillin",
}

SUCKLER_PRIOR = {**SUCKLER_RESPONSES, "suckler_calves_dead_at_birth": 2, "suckler_calves_died_14d": 1,
                 "suckler_pneumonia_calves": 3, "treatment_antibiotic_count": 6}

DEFAULT_BENCHMARKS = [
    # Sheep
    {"enterprise_type": "sheep", "kpi_key": "lambing_pct", "display_name": "Lambing %", "unit": "%",
     "red_below": 140, "amber_below": 160, "green_above": 160, "higher_is_better": True},
    {"enterprise_type": "sheep", "kpi_key": "scanning_pct", "display_name": "Scanning %", "unit": "%",
     "red_below": 150, "amber_below": 170, "green_above": 170, "higher_is_better": True},
    {"enterprise_type": "sheep", "kpi_key": "lamb_mortality_pct", "display_name": "Lamb mortality", "unit": "%",
     "red_below": 5.0, "amber_below": 3.0, "green_above": 3.0, "higher_is_better": False},
    {"enterprise_type": "sheep", "kpi_key": "ewe_mortality_pct", "display_name": "Ewe mortality", "unit": "%",
     "red_below": 4.0, "amber_below": 2.5, "green_above": 2.5, "higher_is_better": False},
    {"enterprise_type": "sheep", "kpi_key": "abortion_pct", "display_name": "Abortion rate", "unit": "%",
     "red_below": 3.0, "amber_below": 2.0, "green_above": 2.0, "higher_is_better": False},
    {"enterprise_type": "sheep", "kpi_key": "antibiotic_events", "display_name": "Antibiotic events", "unit": "events",
     "red_below": 10, "amber_below": 6, "green_above": 6, "higher_is_better": False},
    # Suckler
    {"enterprise_type": "suckler", "kpi_key": "calving_pct", "display_name": "Calving %", "unit": "%",
     "red_below": 90, "amber_below": 95, "green_above": 95, "higher_is_better": True},
    {"enterprise_type": "suckler", "kpi_key": "calf_mortality_pct", "display_name": "Calf mortality", "unit": "%",
     "red_below": 5.0, "amber_below": 3.0, "green_above": 3.0, "higher_is_better": False},
    {"enterprise_type": "suckler", "kpi_key": "assisted_pct", "display_name": "Assisted calvings", "unit": "%",
     "red_below": 10.0, "amber_below": 6.0, "green_above": 6.0, "higher_is_better": False},
    {"enterprise_type": "suckler", "kpi_key": "calving_spread", "display_name": "Calving spread", "unit": "weeks",
     "red_below": 12, "amber_below": 9, "green_above": 9, "higher_is_better": False},
    {"enterprise_type": "suckler", "kpi_key": "antibiotic_events", "display_name": "Antibiotic events", "unit": "events",
     "red_below": 10, "amber_below": 6, "green_above": 6, "higher_is_better": False},
]


def make_responses(farm_id, token_id, period_start, section_map: dict) -> list[CheckInResponse]:
    rows = []
    for key, val in section_map.items():
        rows.append(CheckInResponse(
            farm_id=farm_id,
            token_id=token_id,
            period_start=period_start,
            section=_section_for(key),
            question_key=key,
            value_num=val if isinstance(val, (int, float)) else None,
            value_text=val if isinstance(val, str) else None,
            value_option=None,
            submitted_at=datetime.utcnow(),
        ))
    return rows


def _section_for(key: str) -> str:
    prefixes = {
        "sheep_lambs_born": "sheep_lambing", "sheep_scanning": "sheep_lambing",
        "sheep_abortions": "sheep_lambing", "sheep_difficult": "sheep_lambing",
        "sheep_lamb_losses": "sheep_lambing", "sheep_empty": "sheep_lambing",
        "sheep_lambs_turned": "sheep_post_lambing", "sheep_replacements": "sheep_post_lambing",
        "sheep_ewes_died": "sheep_post_lambing",
        "sheep_avg_weaning": "sheep_weaning", "sheep_lambs_sold": "sheep_sales",
        "sheep_avg_sale": "sheep_sales", "sheep_ewes_to_tup": "sheep_tupping",
        "sheep_vaginal": "sheep_disease", "sheep_mastitis": "sheep_disease",
        "sheep_fly_strike": "sheep_disease", "sheep_watery": "sheep_disease",
        "sheep_orf": "sheep_disease", "sheep_scour": "sheep_disease",
        "sheep_lameness": "sheep_lameness",
        "suckler_cows_calved": "suckler_calving", "suckler_assisted": "suckler_calving",
        "suckler_abortions": "suckler_calving", "suckler_calves_born": "suckler_calving",
        "suckler_calves_dead": "suckler_calving", "suckler_calves_died": "suckler_calving",
        "suckler_calving_spread": "suckler_calving",
        "suckler_calves_weaned": "suckler_calf_perf", "suckler_avg_weaning": "suckler_calf_perf",
        "suckler_cows_to_bull": "suckler_breeding", "suckler_bull_weeks": "suckler_breeding",
        "suckler_in_calf": "suckler_breeding",
        "suckler_pneumonia": "suckler_disease", "suckler_scour_calves": "suckler_disease",
        "suckler_retained": "suckler_disease", "suckler_johnes": "suckler_disease",
        "suckler_bvd": "suckler_disease",
        "treatment_": "treatments",
        "aims_": "health_plan",
    }
    for prefix, section in prefixes.items():
        if key.startswith(prefix):
            return section
    return "general"


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        # Clear existing seed data
        await db.execute(text("DELETE FROM check_in_responses WHERE farm_id IN (SELECT id FROM farms WHERE client_ref LIKE 'BFE00%')"))
        await db.execute(text("DELETE FROM check_in_tokens WHERE farm_id IN (SELECT id FROM farms WHERE client_ref LIKE 'BFE00%')"))
        await db.execute(text("DELETE FROM farms WHERE client_ref LIKE 'BFE00%'"))
        await db.execute(text("DELETE FROM benchmarks"))
        await db.commit()

        # Benchmarks
        for bm_data in DEFAULT_BENCHMARKS:
            db.add(Benchmark(id=uuid.uuid4(), **bm_data))

        farm_ids = []
        for farm_data in TEST_FARMS:
            farm = Farm(
                id=uuid.uuid4(),
                active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **farm_data,
            )
            db.add(farm)
            await db.flush()
            farm_ids.append(farm.id)

            # Create a current live token
            token = CheckInToken(
                id=uuid.uuid4(),
                farm_id=farm.id,
                token=secrets.token_hex(32),
                period_start=date.today() - timedelta(days=date.today().weekday()),
                period_end=date.today() - timedelta(days=date.today().weekday()) + timedelta(days=13),
                expires_at=datetime.utcnow() + timedelta(days=7),
                created_at=datetime.utcnow(),
            )
            db.add(token)
            await db.flush()

            this_year = date.today().year
            prior_year = this_year - 1

            # Seed this-year responses
            if "sheep" in farm_data["enterprise_types"]:
                for r in make_responses(farm.id, token.id, date(this_year, 3, 1), SHEEP_RESPONSES):
                    db.add(r)
                for r in make_responses(farm.id, token.id, date(prior_year, 3, 1), SHEEP_PRIOR):
                    db.add(r)
            if "suckler" in farm_data["enterprise_types"]:
                for r in make_responses(farm.id, token.id, date(this_year, 4, 1), SUCKLER_RESPONSES):
                    db.add(r)
                for r in make_responses(farm.id, token.id, date(prior_year, 4, 1), SUCKLER_PRIOR):
                    db.add(r)

            print(f"  Created: {farm_data['name']} — token: {token.token[:16]}…")

        await db.commit()

    print("\nSeed complete. Magic links for local testing:")
    async with SessionLocal() as db:
        from sqlalchemy import select as sel
        tokens = (await db.execute(sel(CheckInToken))).scalars().all()
        for t in tokens:
            from app.services.magic_link import checkin_url
            print(f"  {checkin_url(t.token)}")


if __name__ == "__main__":
    asyncio.run(seed())
