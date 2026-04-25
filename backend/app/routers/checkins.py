from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.orm import CheckInToken, CheckInResponse, Farm
from app.schemas.schemas import TokenValidation, QuestionOut, SubmitIn
from app.services.magic_link import validate_token
from app.services.questions import get_questions_for_farm

router = APIRouter()


async def _get_token_or_404(token_str: str, db: AsyncSession) -> CheckInToken:
    token = await validate_token(db, token_str)
    if token is None:
        raise HTTPException(status_code=404, detail="Link not found or expired")
    return token


@router.get("/{token}", response_model=TokenValidation)
async def get_checkin(token: str, db: AsyncSession = Depends(get_db)):
    tok = await _get_token_or_404(token, db)

    farm_result = await db.execute(select(Farm).where(Farm.id == tok.farm_id))
    farm = farm_result.scalar_one()

    month = tok.period_start.month
    questions = get_questions_for_farm(farm.enterprise_types, month)

    # Load existing responses for this token
    resp_result = await db.execute(
        select(CheckInResponse).where(CheckInResponse.token_id == tok.id)
    )
    existing = resp_result.scalars().all()
    existing_map: dict[str, str | float | None] = {}
    for r in existing:
        val = r.value_num if r.value_num is not None else (r.value_option or r.value_text)
        existing_map[r.question_key] = val

    return TokenValidation(
        farm=farm,
        period_start=tok.period_start,
        period_end=tok.period_end,
        questions=[
            QuestionOut(
                key=q.key,
                section=q.section,
                label=q.label,
                type=q.type,
                unit=q.unit,
                options=q.options or None,
                hint=q.hint,
            )
            for q in questions
        ],
        existing_responses=existing_map,
        completed=tok.completed_at is not None,
    )


@router.post("/{token}/save")
async def save_response(token: str, body: SubmitIn, db: AsyncSession = Depends(get_db)):
    """Upsert individual responses (partial save — farmer can return later)."""
    tok = await _get_token_or_404(token, db)

    for resp in body.responses:
        # Delete existing response for this question in this token period
        await db.execute(
            delete(CheckInResponse).where(
                CheckInResponse.token_id == tok.id,
                CheckInResponse.question_key == resp.question_key,
            )
        )
        db.add(CheckInResponse(
            farm_id=tok.farm_id,
            token_id=tok.id,
            period_start=tok.period_start,
            section=resp.section,
            question_key=resp.question_key,
            value_num=resp.value_num,
            value_text=resp.value_text,
            value_option=resp.value_option,
            submitted_at=datetime.utcnow(),
        ))

    await db.commit()
    return {"saved": len(body.responses)}


@router.post("/{token}/complete")
async def complete_checkin(token: str, body: SubmitIn, db: AsyncSession = Depends(get_db)):
    """Save final responses and mark token as completed."""
    tok = await _get_token_or_404(token, db)

    for resp in body.responses:
        await db.execute(
            delete(CheckInResponse).where(
                CheckInResponse.token_id == tok.id,
                CheckInResponse.question_key == resp.question_key,
            )
        )
        db.add(CheckInResponse(
            farm_id=tok.farm_id,
            token_id=tok.id,
            period_start=tok.period_start,
            section=resp.section,
            question_key=resp.question_key,
            value_num=resp.value_num,
            value_text=resp.value_text,
            value_option=resp.value_option,
            submitted_at=datetime.utcnow(),
        ))

    tok.completed_at = datetime.utcnow()
    await db.commit()
    return {"completed": True}
