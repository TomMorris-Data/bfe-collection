import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


def uuid_pk():
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def now_utc():
    return datetime.utcnow()


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[uuid.UUID] = uuid_pk()
    client_ref: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    enterprise_types: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    sbi_no: Mapped[str | None] = mapped_column(String(50))
    ahwp_agreement_no: Mapped[str | None] = mapped_column(String(50))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    tokens: Mapped[list["CheckInToken"]] = relationship(back_populates="farm")
    responses: Mapped[list["CheckInResponse"]] = relationship(back_populates="farm")


class CheckInToken(Base):
    __tablename__ = "check_in_tokens"

    id: Mapped[uuid.UUID] = uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    first_accessed_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    farm: Mapped["Farm"] = relationship(back_populates="tokens")
    responses: Mapped[list["CheckInResponse"]] = relationship(back_populates="token")


class CheckInResponse(Base):
    __tablename__ = "check_in_responses"

    id: Mapped[uuid.UUID] = uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id"))
    token_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("check_in_tokens.id"))
    period_start: Mapped[date] = mapped_column(Date, index=True)
    section: Mapped[str] = mapped_column(String(100))
    question_key: Mapped[str] = mapped_column(String(100))
    value_num: Mapped[float | None] = mapped_column(Numeric)
    value_text: Mapped[str | None] = mapped_column(Text)
    value_option: Mapped[str | None] = mapped_column(String(200))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    farm: Mapped["Farm"] = relationship(back_populates="responses")
    token: Mapped["CheckInToken"] = relationship(back_populates="responses")


class SeasonalConfig(Base):
    __tablename__ = "seasonal_config"

    id: Mapped[uuid.UUID] = uuid_pk()
    enterprise_type: Mapped[str] = mapped_column(String(50))
    month: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(100))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id: Mapped[uuid.UUID] = uuid_pk()
    enterprise_type: Mapped[str] = mapped_column(String(50))
    kpi_key: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str] = mapped_column(String(200))
    unit: Mapped[str] = mapped_column(String(20), default="%")
    red_below: Mapped[float | None] = mapped_column(Numeric)
    amber_below: Mapped[float | None] = mapped_column(Numeric)
    green_above: Mapped[float | None] = mapped_column(Numeric)
    higher_is_better: Mapped[bool] = mapped_column(Boolean, default=True)
