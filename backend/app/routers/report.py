from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models.orm import Farm, CheckInResponse, Benchmark
from app.schemas.schemas import ReportOut, KpiCard, DiseaseRow, TreatmentEvent, AiBriefingOut, AiPoint
from app.services.ai_briefing import generate_briefing

router = APIRouter()


def _rag(value: float | None, benchmark: Benchmark | None) -> str:
    if value is None or benchmark is None:
        return "none"
    if benchmark.higher_is_better:
        if benchmark.green_above is not None and value >= float(benchmark.green_above):
            return "green"
        if benchmark.amber_below is not None and value >= float(benchmark.amber_below):
            return "amber"
        return "red"
    else:
        if benchmark.red_below is not None and value <= float(benchmark.red_below):
            return "red"
        if benchmark.amber_below is not None and value <= float(benchmark.amber_below):
            return "amber"
        return "green"


def _responses_dict(responses: list[CheckInResponse]) -> dict[str, float | str | None]:
    out: dict[str, float | str | None] = {}
    for r in responses:
        out[r.question_key] = r.value_num if r.value_num is not None else (r.value_option or r.value_text)
    return out


def _num(d: dict, key: str) -> float | None:
    v = d.get(key)
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _pct(numerator, denominator) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return round(numerator / denominator * 100, 1)


async def _get_year_responses(db: AsyncSession, farm_id: UUID, year: int) -> list[CheckInResponse]:
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)
    result = await db.execute(
        select(CheckInResponse).where(
            and_(
                CheckInResponse.farm_id == farm_id,
                CheckInResponse.period_start >= year_start,
                CheckInResponse.period_start <= year_end,
            )
        )
    )
    return result.scalars().all()


def _build_sheep_kpis(this: dict, prior: dict, benchmarks: dict) -> list[KpiCard]:
    lambs_born = _num(this, "sheep_lambs_born_alive")
    ewes_to_tup = _num(this, "sheep_ewes_to_tup")
    lambs_turned = _num(this, "sheep_lambs_turned_out")
    losses_24h = _num(this, "sheep_lamb_losses_24h")
    losses_7d = _num(this, "sheep_lamb_losses_7d")
    ewes_died = _num(this, "sheep_ewes_died")
    scanning_pct = _num(this, "sheep_scanning_pct")
    abortions = _num(this, "sheep_abortions")
    ab_events = _num(this, "treatment_antibiotic_count")

    prior_lambs_born = _num(prior, "sheep_lambs_born_alive")
    prior_ewes_to_tup = _num(prior, "sheep_ewes_to_tup")
    prior_losses = (_num(prior, "sheep_lamb_losses_24h") or 0) + (_num(prior, "sheep_lamb_losses_7d") or 0)
    prior_ab = _num(prior, "treatment_antibiotic_count")

    lambing_pct = _pct(lambs_born, ewes_to_tup)
    prior_lambing_pct = _pct(prior_lambs_born, prior_ewes_to_tup)
    mortality_pct = _pct(
        (losses_24h or 0) + (losses_7d or 0), lambs_born
    ) if lambs_born else None
    prior_mortality_pct = _pct(prior_losses, prior_lambs_born) if prior_lambs_born else None
    ewe_mortality_pct = _pct(ewes_died, ewes_to_tup)
    prior_ewe_died = _num(prior, "sheep_ewes_died")
    prior_ewe_mort = _pct(prior_ewe_died, prior_ewes_to_tup)
    abort_pct = _pct(abortions, ewes_to_tup)
    prior_abort = _num(prior, "sheep_abortions")
    prior_abort_pct = _pct(prior_abort, prior_ewes_to_tup)

    def delta(cur, prev):
        if cur is None or prev is None:
            return None, None
        d = round(cur - prev, 1)
        return d, f"vs {date.today().year - 1}: {'+' if d > 0 else ''}{d}%"

    def ab_delta(cur, prev):
        if cur is None or prev is None:
            return None, None
        d = round(cur - prev, 1)
        return d, f"vs {date.today().year - 1}: {'+' if d > 0 else ''}{d} events"

    lp_d, lp_l = delta(lambing_pct, prior_lambing_pct)
    mm_d, mm_l = delta(mortality_pct, prior_mortality_pct)
    em_d, em_l = delta(ewe_mortality_pct, prior_ewe_mort)
    ab_d, ab_l = ab_delta(ab_events, prior_ab)
    scan_d, scan_l = delta(scanning_pct, _num(prior, "sheep_scanning_pct"))
    ap_d, ap_l = delta(abort_pct, prior_abort_pct)

    bm = benchmarks
    return [
        KpiCard(key="lambing_pct", label="Lambing %", value=lambing_pct, unit="%",
                rag=_rag(lambing_pct, bm.get("sheep_lambing_pct")), higher_is_better=True,
                vs_prior_year=lp_d, vs_prior_year_label=lp_l),
        KpiCard(key="scanning_pct", label="Scanning %", value=scanning_pct, unit="%",
                rag=_rag(scanning_pct, bm.get("sheep_scanning_pct")), higher_is_better=True,
                vs_prior_year=scan_d, vs_prior_year_label=scan_l),
        KpiCard(key="lamb_mortality_pct", label="Lamb mortality", value=mortality_pct, unit="%",
                rag=_rag(mortality_pct, bm.get("sheep_lamb_mortality_pct")), higher_is_better=False,
                vs_prior_year=mm_d, vs_prior_year_label=mm_l),
        KpiCard(key="ewe_mortality_pct", label="Ewe mortality", value=ewe_mortality_pct, unit="%",
                rag=_rag(ewe_mortality_pct, bm.get("sheep_ewe_mortality_pct")), higher_is_better=False,
                vs_prior_year=em_d, vs_prior_year_label=em_l),
        KpiCard(key="abortion_pct", label="Abortion rate", value=abort_pct, unit="%",
                rag=_rag(abort_pct, bm.get("sheep_abortion_pct")), higher_is_better=False,
                vs_prior_year=ap_d, vs_prior_year_label=ap_l),
        KpiCard(key="antibiotic_events", label="Antibiotic events", value=ab_events, unit="events",
                rag=_rag(ab_events, bm.get("sheep_antibiotic_events")), higher_is_better=False,
                vs_prior_year=ab_d, vs_prior_year_label=ab_l),
    ]


def _build_suckler_kpis(this: dict, prior: dict, benchmarks: dict) -> list[KpiCard]:
    cows_calved = _num(this, "suckler_cows_calved")
    calves_born = _num(this, "suckler_calves_born_alive")
    dead_birth = _num(this, "suckler_calves_dead_at_birth")
    died_14d = _num(this, "suckler_calves_died_14d")
    assisted = _num(this, "suckler_assisted_calvings")
    calves_weaned = _num(this, "suckler_calves_weaned")
    spread = _num(this, "suckler_calving_spread_weeks")
    ab_events = _num(this, "treatment_antibiotic_count")

    prior_cows = _num(prior, "suckler_cows_calved")
    prior_calves = _num(prior, "suckler_calves_born_alive")
    prior_dead = (_num(prior, "suckler_calves_dead_at_birth") or 0) + (_num(prior, "suckler_calves_died_14d") or 0)
    prior_ab = _num(prior, "treatment_antibiotic_count")

    calving_pct = _pct(calves_born, cows_calved)
    prior_calving_pct = _pct(prior_calves, prior_cows)
    total_loss = (dead_birth or 0) + (died_14d or 0)
    calf_mortality = _pct(total_loss, calves_born) if calves_born else None
    prior_calf_mort = _pct(prior_dead, prior_calves) if prior_calves else None
    assisted_pct = _pct(assisted, cows_calved)
    prior_assisted = _num(prior, "suckler_assisted_calvings")
    prior_assisted_pct = _pct(prior_assisted, prior_cows)

    def delta(cur, prev):
        if cur is None or prev is None:
            return None, None
        d = round(cur - prev, 1)
        return d, f"vs {date.today().year - 1}: {'+' if d > 0 else ''}{d}{'%' if abs(d) < 50 else ''}"

    cp_d, cp_l = delta(calving_pct, prior_calving_pct)
    cm_d, cm_l = delta(calf_mortality, prior_calf_mort)
    ap_d, ap_l = delta(assisted_pct, prior_assisted_pct)
    sp_d, sp_l = delta(spread, _num(prior, "suckler_calving_spread_weeks"))
    ab_p = _num(prior, "treatment_antibiotic_count")
    ab_d = round(ab_events - ab_p, 1) if ab_events is not None and ab_p is not None else None
    ab_l = (f"vs {date.today().year - 1}: {'+' if ab_d and ab_d > 0 else ''}{ab_d} events") if ab_d is not None else None

    bm = benchmarks
    return [
        KpiCard(key="calving_pct", label="Calving %", value=calving_pct, unit="%",
                rag=_rag(calving_pct, bm.get("suckler_calving_pct")), higher_is_better=True,
                vs_prior_year=cp_d, vs_prior_year_label=cp_l),
        KpiCard(key="calf_mortality_pct", label="Calf mortality", value=calf_mortality, unit="%",
                rag=_rag(calf_mortality, bm.get("suckler_calf_mortality_pct")), higher_is_better=False,
                vs_prior_year=cm_d, vs_prior_year_label=cm_l),
        KpiCard(key="assisted_pct", label="Assisted calvings", value=assisted_pct, unit="%",
                rag=_rag(assisted_pct, bm.get("suckler_assisted_pct")), higher_is_better=False,
                vs_prior_year=ap_d, vs_prior_year_label=ap_l),
        KpiCard(key="calving_spread", label="Calving spread", value=spread, unit="weeks",
                rag=_rag(spread, bm.get("suckler_calving_spread")), higher_is_better=False,
                vs_prior_year=sp_d, vs_prior_year_label=sp_l),
        KpiCard(key="weaning_count", label="Calves weaned", value=calves_weaned, unit="head",
                rag="none", higher_is_better=True),
        KpiCard(key="suckler_antibiotic_events", label="Antibiotic events", value=ab_events, unit="events",
                rag=_rag(ab_events, bm.get("suckler_antibiotic_events")), higher_is_better=False,
                vs_prior_year=ab_d, vs_prior_year_label=ab_l),
    ]


@router.get("/{farm_id}", response_model=ReportOut)
async def get_report(farm_id: UUID, db: AsyncSession = Depends(get_db)):
    farm_result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = farm_result.scalar_one_or_none()
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")

    this_year = date.today().year
    this_responses = await _get_year_responses(db, farm_id, this_year)
    prior_responses = await _get_year_responses(db, farm_id, this_year - 1)

    this = _responses_dict(this_responses)
    prior = _responses_dict(prior_responses)

    bm_result = await db.execute(select(Benchmark))
    bm_rows = bm_result.scalars().all()
    benchmarks = {f"{b.enterprise_type}_{b.kpi_key}": b for b in bm_rows}

    sheep_kpis = _build_sheep_kpis(this, prior, benchmarks) if "sheep" in farm.enterprise_types else []
    suckler_kpis = _build_suckler_kpis(this, prior, benchmarks) if "suckler" in farm.enterprise_types else []

    # Disease rows
    disease_keys = {
        "Vaginal prolapse (ewes)": ("sheep_vaginal_prolapse", "Sheep"),
        "Mastitis (ewes)": ("sheep_mastitis", "Sheep"),
        "Fly strike": ("sheep_fly_strike", "Sheep"),
        "Watery mouth (lambs)": ("sheep_watery_mouth", "Sheep"),
        "Orf (lambs)": ("sheep_orf", "Sheep"),
        "Lamb scour": ("sheep_scour_lambs", "Sheep"),
        "Calf pneumonia": ("suckler_pneumonia_calves", "Suckler"),
        "Calf scour": ("suckler_scour_calves", "Suckler"),
        "Retained cleansings": ("suckler_retained_cleansings", "Suckler"),
        "Johne's (suspected)": ("suckler_johnes_suspected", "Suckler"),
        "BVD (suspected)": ("suckler_bvd_suspected", "Suckler"),
    }
    diseases = [
        DiseaseRow(
            condition=label,
            this_year=int(_num(this, key) or 0),
            prior_year=int(_num(prior, key) or 0),
            enterprise=enterprise,
        )
        for label, (key, enterprise) in disease_keys.items()
        if int(_num(this, key) or 0) > 0 or int(_num(prior, key) or 0) > 0
    ]

    # Treatment events
    treatments = []
    for r in this_responses:
        if r.section == "treatments" and r.question_key == "treatment_antibiotic_product" and r.value_text:
            treatments.append(TreatmentEvent(
                date=r.period_start,
                product=r.value_text,
                condition="",
                group="",
                enterprise="Mixed",
            ))

    farmer_notes = {
        "went_well": this.get("aims_went_well") or "",
        "challenges": this.get("aims_challenges") or "",
        "targets": this.get("aims_targets") or "",
    }

    return ReportOut(
        farm=farm,
        period_label=f"1 Jan {this_year} – present",
        sheep_kpis=sheep_kpis,
        suckler_kpis=suckler_kpis,
        diseases=diseases,
        treatments=treatments,
        farmer_notes=farmer_notes,
        vet_notes=None,
    )


@router.post("/{farm_id}/briefing", response_model=AiBriefingOut)
async def get_ai_briefing(farm_id: UUID, db: AsyncSession = Depends(get_db)):
    farm_result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = farm_result.scalar_one_or_none()
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")

    this_year = date.today().year
    this = _responses_dict(await _get_year_responses(db, farm_id, this_year))
    prior = _responses_dict(await _get_year_responses(db, farm_id, this_year - 1))
    two_prior = _responses_dict(await _get_year_responses(db, farm_id, this_year - 2))

    farm_data = {
        "farm_name": farm.name,
        "enterprise_types": farm.enterprise_types,
        "this_year": {str(this_year): this},
        "prior_years": {
            str(this_year - 1): prior,
            str(this_year - 2): two_prior,
        },
    }

    raw_points = await generate_briefing(farm_data)
    points = [AiPoint(**p) for p in raw_points]
    return AiBriefingOut(points=points)
