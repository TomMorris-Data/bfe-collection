from __future__ import annotations
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class FarmBase(BaseModel):
    client_ref: str
    name: str
    contact_name: str | None = None
    email: str | None = None
    phone: str | None = None
    enterprise_types: list[str] = []
    sbi_no: str | None = None
    ahwp_agreement_no: str | None = None


class FarmOut(FarmBase):
    id: UUID
    active: bool
    model_config = {"from_attributes": True}


class TokenValidation(BaseModel):
    farm: FarmOut
    period_start: date
    period_end: date
    questions: list[QuestionOut]
    existing_responses: dict[str, str | float | None]
    completed: bool


class QuestionOut(BaseModel):
    key: str
    section: str
    label: str
    type: str  # number | text | option | boolean
    unit: str | None = None
    options: list[str] | None = None
    hint: str | None = None


class ResponseIn(BaseModel):
    question_key: str
    section: str
    value_num: float | None = None
    value_text: str | None = None
    value_option: str | None = None


class SubmitIn(BaseModel):
    responses: list[ResponseIn]


class FarmListItem(BaseModel):
    id: UUID
    name: str
    client_ref: str
    enterprise_types: list[str]
    email: str | None
    completion_pct: float
    last_response: datetime | None
    alert_count: int
    model_config = {"from_attributes": True}


class KpiCard(BaseModel):
    key: str
    label: str
    value: float | None
    unit: str
    rag: str  # red | amber | green | none
    vs_prior_year: float | None = None
    vs_prior_year_label: str | None = None
    higher_is_better: bool = True


class DiseaseRow(BaseModel):
    condition: str
    this_year: int
    prior_year: int
    enterprise: str


class TreatmentEvent(BaseModel):
    date: date | None
    product: str
    condition: str
    group: str
    enterprise: str


class ReportOut(BaseModel):
    farm: FarmOut
    period_label: str
    sheep_kpis: list[KpiCard]
    suckler_kpis: list[KpiCard]
    diseases: list[DiseaseRow]
    treatments: list[TreatmentEvent]
    farmer_notes: dict[str, str]
    vet_notes: str | None


class AiPoint(BaseModel):
    heading: str
    body: str
    severity: str  # info | warning | alert


class AiBriefingOut(BaseModel):
    points: list[AiPoint]
