export interface Question {
  key: string;
  section: string;
  label: string;
  type: "number" | "text" | "option" | "boolean";
  enterpriseTypes: string[];
  activeMonths: number[]; // 1–12; empty = year-round
  unit?: string;
  options?: string[];
  hint?: string;
}

const DISEASE_SHEEP: Question[] = [
  { key: "sheep_vaginal_prolapse", section: "sheep_disease", label: "Vaginal prolapse cases (ewes)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_mastitis", section: "sheep_disease", label: "Mastitis cases (ewes)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_fly_strike", section: "sheep_disease", label: "Fly strike cases", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_watery_mouth", section: "sheep_disease", label: "Watery mouth cases (lambs <2wk)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_orf", section: "sheep_disease", label: "Orf cases (lambs)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_scour_lambs", section: "sheep_disease", label: "Scour cases (lambs)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "cases" },
  { key: "sheep_lameness_count", section: "sheep_lameness", label: "Approx. lame sheep today", type: "number", enterpriseTypes: ["sheep"], activeMonths: [], unit: "head" },
  { key: "sheep_lameness_concern", section: "sheep_lameness", label: "Lameness concern level", type: "option", enterpriseTypes: ["sheep"], activeMonths: [], options: ["None", "Low", "Moderate", "High"] },
];

const DISEASE_SUCKLER: Question[] = [
  { key: "suckler_pneumonia_calves", section: "suckler_disease", label: "Calf pneumonia cases", type: "number", enterpriseTypes: ["suckler"], activeMonths: [], unit: "cases" },
  { key: "suckler_scour_calves", section: "suckler_disease", label: "Calf scour cases", type: "number", enterpriseTypes: ["suckler"], activeMonths: [], unit: "cases" },
  { key: "suckler_retained_cleansings", section: "suckler_disease", label: "Retained cleansings (cows)", type: "number", enterpriseTypes: ["suckler"], activeMonths: [], unit: "cases" },
  { key: "suckler_johnes_suspected", section: "suckler_disease", label: "Johne's — new suspected cases", type: "number", enterpriseTypes: ["suckler"], activeMonths: [], unit: "cases" },
  { key: "suckler_bvd_suspected", section: "suckler_disease", label: "BVD — new suspected cases", type: "number", enterpriseTypes: ["suckler"], activeMonths: [], unit: "cases" },
];

const TREATMENT_QUESTIONS: Question[] = [
  { key: "treatment_antibiotic_count", section: "treatments", label: "Antibiotic treatment events this fortnight", type: "number", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [], unit: "events", hint: "Count each course per animal group as one event" },
  { key: "treatment_antibiotic_product", section: "treatments", label: "Antibiotic product(s) used (if any)", type: "text", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [] },
  { key: "treatment_vaccine_given", section: "treatments", label: "Any vaccines given this fortnight?", type: "boolean", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [] },
];

const SHEEP_SEASONAL: Question[] = [
  { key: "sheep_scanning_pct", section: "sheep_lambing", label: "Scanning percentage (%)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [1, 2], unit: "%" },
  { key: "sheep_empty_at_scan", section: "sheep_lambing", label: "Number empty at scanning", type: "number", enterpriseTypes: ["sheep"], activeMonths: [1, 2], unit: "head" },
  { key: "sheep_abortions", section: "sheep_lambing", label: "Number of abortions", type: "number", enterpriseTypes: ["sheep"], activeMonths: [1, 2, 3], unit: "head" },
  { key: "sheep_difficult_lambings", section: "sheep_lambing", label: "Number of difficult lambings", type: "number", enterpriseTypes: ["sheep"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "sheep_lambs_born_alive", section: "sheep_lambing", label: "Total lambs born alive", type: "number", enterpriseTypes: ["sheep"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "sheep_lamb_losses_24h", section: "sheep_lambing", label: "Lamb losses <24hrs", type: "number", enterpriseTypes: ["sheep"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "sheep_lamb_losses_7d", section: "sheep_lambing", label: "Lamb losses <7 days", type: "number", enterpriseTypes: ["sheep"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "sheep_lambs_turned_out", section: "sheep_post_lambing", label: "Lambs turned out / tailed", type: "number", enterpriseTypes: ["sheep"], activeMonths: [4, 5], unit: "head" },
  { key: "sheep_replacements_added", section: "sheep_post_lambing", label: "Replacement ewes added to flock", type: "number", enterpriseTypes: ["sheep"], activeMonths: [4, 5], unit: "head" },
  { key: "sheep_ewes_died", section: "sheep_post_lambing", label: "Ewes died this period", type: "number", enterpriseTypes: ["sheep"], activeMonths: [4, 5], unit: "head" },
  { key: "sheep_avg_weaning_weight", section: "sheep_weaning", label: "Average weaning weight (kg)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [6, 7], unit: "kg" },
  { key: "sheep_avg_weaning_age", section: "sheep_weaning", label: "Average age at weaning (days)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [6, 7], unit: "days" },
  { key: "sheep_lambs_sold_fat", section: "sheep_sales", label: "Lambs sold fat / stores this period", type: "number", enterpriseTypes: ["sheep"], activeMonths: [7, 8, 9], unit: "head" },
  { key: "sheep_avg_sale_weight", section: "sheep_sales", label: "Average sale weight (kg live weight)", type: "number", enterpriseTypes: ["sheep"], activeMonths: [7, 8, 9], unit: "kg" },
  { key: "sheep_ewes_to_tup", section: "sheep_tupping", label: "Ewes & replacements put to tup", type: "number", enterpriseTypes: ["sheep"], activeMonths: [10, 11], unit: "head" },
];

const SUCKLER_SEASONAL: Question[] = [
  { key: "suckler_cows_calved", section: "suckler_calving", label: "Cows & heifers calved this period", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_assisted_calvings", section: "suckler_calving", label: "Assisted calvings", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_abortions", section: "suckler_calving", label: "Abortions", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_calves_born_alive", section: "suckler_calving", label: "Total calves born alive", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_calves_dead_at_birth", section: "suckler_calving", label: "Calves born dead", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_calves_died_14d", section: "suckler_calving", label: "Calf deaths <14 days", type: "number", enterpriseTypes: ["suckler"], activeMonths: [2, 3, 4], unit: "head" },
  { key: "suckler_calving_spread_weeks", section: "suckler_calving", label: "Calving spread (weeks)", type: "number", enterpriseTypes: ["suckler"], activeMonths: [4, 5], unit: "weeks" },
  { key: "suckler_calves_weaned", section: "suckler_calf_perf", label: "Calves weaned", type: "number", enterpriseTypes: ["suckler"], activeMonths: [7, 8, 9], unit: "head" },
  { key: "suckler_avg_weaning_weight", section: "suckler_calf_perf", label: "Average weaning weight (kg)", type: "number", enterpriseTypes: ["suckler"], activeMonths: [7, 8, 9], unit: "kg" },
  { key: "suckler_cows_to_bull", section: "suckler_breeding", label: "Cows & heifers put to bull", type: "number", enterpriseTypes: ["suckler"], activeMonths: [10], unit: "head" },
  { key: "suckler_bull_weeks", section: "suckler_breeding", label: "Number of weeks bull was in for", type: "number", enterpriseTypes: ["suckler"], activeMonths: [10, 11], unit: "weeks" },
  { key: "suckler_in_calf_at_pd", section: "suckler_breeding", label: "Number in-calf at PD", type: "number", enterpriseTypes: ["suckler"], activeMonths: [11, 12, 1], unit: "head" },
];

const HEALTH_PLAN: Question[] = [
  { key: "aims_went_well", section: "health_plan", label: "What went well this year?", type: "text", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [10] },
  { key: "aims_challenges", section: "health_plan", label: "What were the main challenges?", type: "text", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [10] },
  { key: "aims_targets", section: "health_plan", label: "Targets / priorities for next year", type: "text", enterpriseTypes: ["sheep", "suckler", "calf_rearer"], activeMonths: [10] },
];

export const ALL_QUESTIONS: Question[] = [
  ...DISEASE_SHEEP, ...DISEASE_SUCKLER, ...TREATMENT_QUESTIONS,
  ...SHEEP_SEASONAL, ...SUCKLER_SEASONAL, ...HEALTH_PLAN,
];

export function getQuestionsForFarm(enterpriseTypes: string[], month: number): Question[] {
  return ALL_QUESTIONS.filter((q) => {
    const hasEnterprise = q.enterpriseTypes.some((et) => enterpriseTypes.includes(et));
    const isActive = q.activeMonths.length === 0 || q.activeMonths.includes(month);
    return hasEnterprise && isActive;
  });
}
