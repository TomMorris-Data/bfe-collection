from datetime import date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.orm import Farm, CheckInToken, CheckInResponse
from app.schemas.schemas import FarmListItem, FarmOut
from app.services.magic_link import create_token
from app.services.email import send_checkin_email

router = APIRouter()


@router.get("/farms", response_model=list[FarmListItem])
async def list_farms(db: AsyncSession = Depends(get_db)):
    farms_result = await db.execute(select(Farm).where(Farm.active == True).order_by(Farm.name))
    farms = farms_result.scalars().all()

    items = []
    for farm in farms:
        # Latest response timestamp
        latest_result = await db.execute(
            select(func.max(CheckInResponse.submitted_at)).where(CheckInResponse.farm_id == farm.id)
        )
        last_response = latest_result.scalar_one_or_none()

        # Completion % — count distinct period_starts with at least one response this calendar year
        year_start = date(date.today().year, 1, 1)
        periods_result = await db.execute(
            select(func.count(func.distinct(CheckInResponse.period_start)))
            .where(CheckInResponse.farm_id == farm.id, CheckInResponse.period_start >= year_start)
        )
        periods_answered = periods_result.scalar_one() or 0
        # Approximate expected periods: 26 fortnights per year
        completion_pct = min(100.0, round(periods_answered / 26 * 100, 1))

        items.append(FarmListItem(
            id=farm.id,
            name=farm.name,
            client_ref=farm.client_ref,
            enterprise_types=farm.enterprise_types,
            email=farm.email,
            completion_pct=completion_pct,
            last_response=last_response,
            alert_count=0,  # placeholder — disease alert logic in Phase 2
        ))
    return items


@router.get("/farms/{farm_id}", response_model=FarmOut)
async def get_farm(farm_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.post("/farms/{farm_id}/dispatch")
async def dispatch_checkin(farm_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manually dispatch a magic link to a single farm (admin action)."""
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    if not farm.email:
        raise HTTPException(status_code=400, detail="Farm has no email address")

    today = date.today()
    period_start = today - timedelta(days=today.weekday())  # Monday
    period_end = period_start + timedelta(days=13)

    token = await create_token(db, farm, period_start, period_end)
    sent = await send_checkin_email(farm, token)
    return {"dispatched": sent, "token": token.token}


@router.post("/farms", response_model=FarmOut)
async def create_farm(farm_data: dict, db: AsyncSession = Depends(get_db)):
    """Create a farm manually (normally done via nightly sync)."""
    farm = Farm(**farm_data)
    db.add(farm)
    await db.commit()
    await db.refresh(farm)
    return farm
