import secrets
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.orm import CheckInToken, Farm
from app.config import settings


async def create_token(db: AsyncSession, farm: Farm, period_start, period_end) -> CheckInToken:
    token_str = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(days=settings.token_expiry_days)
    token = CheckInToken(
        farm_id=farm.id,
        token=token_str,
        period_start=period_start,
        period_end=period_end,
        expires_at=expires_at,
        created_at=datetime.utcnow(),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def validate_token(db: AsyncSession, token_str: str) -> CheckInToken | None:
    result = await db.execute(
        select(CheckInToken).where(CheckInToken.token == token_str)
    )
    token = result.scalar_one_or_none()
    if token is None:
        return None
    if datetime.utcnow() > token.expires_at:
        return None
    # Record first access
    if token.first_accessed_at is None:
        token.first_accessed_at = datetime.utcnow()
        await db.commit()
    return token


def checkin_url(token_str: str) -> str:
    return f"{settings.app_base_url}/checkin/{token_str}"
