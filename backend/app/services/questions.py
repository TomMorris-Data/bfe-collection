"""
Question catalogue and seasonal routing.

Each question definition drives:
  - What the farmer sees in the check-in form
  - Which months it is active (per enterprise type)
  - How to key the stored response

Add new questions here; they appear automatically in the form and report.
"""
from dataclasses import dataclass, field


@dataclass
class Question:
    key: str
    section: str
    label: str
    type: str  # number | text | option | boolean
    enterprise_types: list[str]
    active_months: list[int]  # 1=Jan ... 12=Dec; [] = year-round
    unit: str | None = None
    options: list[str] = field(default_factory=list)
    hint: str | None = None


# ─── Disease log questions — year-round ───────────────────────────────────────
DISEASE_SHEEP: list[Question] = [
    Question("sheep_vaginal_prolapse", "sheep_disease", "Vaginal prolapse cases (ewes)", "number", ["sheep"], [], unit="cases"),
    Question("sheep_mastitis", "sheep_disease", "Mastitis cases (ewes)", "number", ["sheep"], [], unit="cases"),
    Question("sheep_fly_strike", "sheep_disease", "Fly strike cases", "number", ["sheep"], [], unit="cases"),
    Question("sheep_watery_mouth", "sheep_disease", "Watery mouth cases (lambs <2wk)", "number", ["sheep"], [], unit="cases"),
    Question("sheep_orf", "sheep_disease", "Orf cases (lambs)", "number", ["sheep"], [], unit="cases"),
    Question("sheep_scour_lambs", "sheep_disease", "Scour cases (lambs)", "number", ["sheep"], [], unit="cases"),
    Question("sheep_lameness_count", "sheep_lameness", "Approx. lame sheep today", "number", ["sheep"], [], unit="head"),
    Question("sheep_lameness_concern", "sheep_lameness", "Lameness concern level", "option", ["sheep"], [],
             options=["None", "Low", "Moderate", "High"]),
]

DISEASE_SUCKLER: list[Question] = [
    Question("suckler_pneumonia_calves", "suckler_disease", "Calf pneumonia cases", "number", ["suckler"], [], unit="cases"),
    Question("suckler_scour_calves", "suckler_disease", "Calf scour cases", "number", ["suckler"], [], unit="cases"),
    Question("suckler_retained_cleansings", "suckler_disease", "Retained cleansings (cows)", "number", ["suckler"], [], unit="cases"),
    Question("suckler_johnes_suspected", "suckler_disease", "Johne's — new suspected cases", "number", ["suckler"], [], unit="cases"),
    Question("suckler_bvd_suspected", "suckler_disease", "BVD — new suspected cases", "number", ["suckler"], [], unit="cases"),
]

# ─── Antibiotic / treatment log — year-round ──────────────────────────────────
TREATMENT_QUESTIONS: list[Question] = [
    Question("treatment_antibiotic_count", "treatments", "Antibiotic treatment events this fortnight", "number",
             ["sheep", "suckler", "calf_rearer"], [], unit="events",
             hint="Count each course per animal group as one event"),
    Question("treatment_antibiotic_product", "treatments", "Antibiotic product(s) used (if any)", "text",
             ["sheep", "suckler", "calf_rearer"], []),
    Question("treatment_vaccine_given", "treatments", "Any vaccines given this fortnight?", "boolean",
             ["sheep", "suckler", "calf_rearer"], []),
]

# ─── Sheep seasonal questions ──────────────────────────────────────────────────
SHEEP_SEASONAL: list[Question] = [
    # Scanning — Jan/Feb
    Question("sheep_scanning_pct", "sheep_lambing", "Scanning percentage (%)", "number", ["sheep"], [1, 2], unit="%"),
    Question("sheep_empty_at_scan", "sheep_lambing", "Number empty at scanning", "number", ["sheep"], [1, 2], unit="head"),
    # Lambing — Jan/Feb/Mar
    Question("sheep_abortions", "sheep_lambing", "Number of abortions", "number", ["sheep"], [1, 2, 3], unit="head"),
    Question("sheep_difficult_lambings", "sheep_lambing", "Number of difficult lambings", "number", ["sheep"], [2, 3, 4], unit="head"),
    Question("sheep_lambs_born_alive", "sheep_lambing", "Total lambs born alive", "number", ["sheep"], [2, 3, 4], unit="head"),
    Question("sheep_lamb_losses_24h", "sheep_lambing", "Lamb losses <24hrs", "number", ["sheep"], [2, 3, 4], unit="head"),
    Question("sheep_lamb_losses_7d", "sheep_lambing", "Lamb losses <7 days", "number", ["sheep"], [2, 3, 4], unit="head"),
    # Post-lambing — Apr/May
    Question("sheep_lambs_turned_out", "sheep_post_lambing", "Lambs turned out / tailed", "number", ["sheep"], [4, 5], unit="head"),
    Question("sheep_replacements_added", "sheep_post_lambing", "Replacement ewes added to flock", "number", ["sheep"], [4, 5], unit="head"),
    Question("sheep_ewes_died", "sheep_post_lambing", "Ewes died this period", "number", ["sheep"], [4, 5], unit="head"),
    # Weaning — Jun/Jul
    Question("sheep_avg_weaning_weight", "sheep_weaning", "Average weaning weight (kg)", "number", ["sheep"], [6, 7], unit="kg"),
    Question("sheep_avg_weaning_age", "sheep_weaning", "Average age at weaning (days)", "number", ["sheep"], [6, 7], unit="days"),
    # Sales — Jul/Aug
    Question("sheep_lambs_sold_fat", "sheep_sales", "Lambs sold fat / stores this period", "number", ["sheep"], [7, 8, 9], unit="head"),
    Question("sheep_avg_sale_weight", "sheep_sales", "Average sale weight (kg live weight)", "number", ["sheep"], [7, 8, 9], unit="kg"),
    # Tupping — Oct/Nov
    Question("sheep_ewes_to_tup", "sheep_tupping", "Ewes & replacements put to tup", "number", ["sheep"], [10, 11], unit="head"),
]

# ─── Suckler seasonal questions ────────────────────────────────────────────────
SUCKLER_SEASONAL: list[Question] = [
    # Calving — Feb/Mar/Apr
    Question("suckler_cows_calved", "suckler_calving", "Cows & heifers calved this period", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_assisted_calvings", "suckler_calving", "Assisted calvings", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_abortions", "suckler_calving", "Abortions", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_calves_born_alive", "suckler_calving", "Total calves born alive", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_calves_dead_at_birth", "suckler_calving", "Calves born dead", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_calves_died_14d", "suckler_calving", "Calf deaths <14 days", "number", ["suckler"], [2, 3, 4], unit="head"),
    Question("suckler_calving_spread_weeks", "suckler_calving", "Calving spread (weeks)", "number", ["suckler"], [4, 5], unit="weeks"),
    # Calf performance — May/Jun/Jul
    Question("suckler_calves_weaned", "suckler_calf_perf", "Calves weaned", "number", ["suckler"], [7, 8, 9], unit="head"),
    Question("suckler_avg_weaning_weight", "suckler_calf_perf", "Average weaning weight (kg)", "number", ["suckler"], [7, 8, 9], unit="kg"),
    # Bull / PD — Oct/Nov/Dec
    Question("suckler_cows_to_bull", "suckler_breeding", "Cows & heifers put to bull", "number", ["suckler"], [10], unit="head"),
    Question("suckler_bull_weeks", "suckler_breeding", "Number of weeks bull was in for", "number", ["suckler"], [10, 11], unit="weeks"),
    Question("suckler_in_calf_at_pd", "suckler_breeding", "Number in-calf at PD", "number", ["suckler"], [11, 12, 1], unit="head"),
]

# ─── Health plan aims — Oct only ──────────────────────────────────────────────
HEALTH_PLAN: list[Question] = [
    Question("aims_went_well", "health_plan", "What went well this year?", "text", ["sheep", "suckler", "calf_rearer"], [10]),
    Question("aims_challenges", "health_plan", "What were the main challenges?", "text", ["sheep", "suckler", "calf_rearer"], [10]),
    Question("aims_targets", "health_plan", "Targets / priorities for next year", "text", ["sheep", "suckler", "calf_rearer"], [10]),
]

ALL_QUESTIONS: list[Question] = (
    DISEASE_SHEEP + DISEASE_SUCKLER + TREATMENT_QUESTIONS
    + SHEEP_SEASONAL + SUCKLER_SEASONAL + HEALTH_PLAN
)

_by_key: dict[str, Question] = {q.key: q for q in ALL_QUESTIONS}


def get_questions_for_farm(enterprise_types: list[str], month: int) -> list[Question]:
    """Return the active question set for a farm given its enterprise types and current month."""
    results = []
    for q in ALL_QUESTIONS:
        if not any(et in q.enterprise_types for et in enterprise_types):
            continue
        if q.active_months and month not in q.active_months:
            continue
        results.append(q)
    return results


def get_question(key: str) -> Question | None:
    return _by_key.get(key)
