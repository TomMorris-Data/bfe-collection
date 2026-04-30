import { Hono } from "hono";
import { getDb } from "../db/supabase";
import { generateBriefing } from "../services/ai_briefing";
import type { Benchmark } from "../db/types";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
};

const router = new Hono<{ Bindings: Bindings }>();

// ── Helpers ────────────────────────────────────────────────────────────────

type ResponseMap = Record<string, number | string | null>;

function num(d: ResponseMap, key: string): number | null {
  const v = d[key];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function rag(value: number | null, bm: Benchmark | undefined): string {
  if (value === null || !bm) return "none";
  if (bm.higher_is_better) {
    if (bm.green_above !== null && value >= bm.green_above) return "green";
    if (bm.amber_below !== null && value >= bm.amber_below) return "amber";
    return "red";
  } else {
    if (bm.red_below !== null && value >= bm.red_below) return "red";
    if (bm.amber_below !== null && value >= bm.amber_below) return "amber";
    return "green";
  }
}

function delta(cur: number | null, prev: number | null, suffix = "%") {
  if (cur === null || prev === null) return { vs_prior_year: null, vs_prior_year_label: null };
  const d = Math.round((cur - prev) * 10) / 10;
  const priorYear = new Date().getFullYear() - 1;
  return {
    vs_prior_year: d,
    vs_prior_year_label: `vs ${priorYear}: ${d > 0 ? "+" : ""}${d}${suffix}`,
  };
}

async function getYearResponses(
  db: ReturnType<typeof getDb>,
  farmId: string,
  year: number,
): Promise<ResponseMap> {
  const { data } = await db
    .from("check_in_responses")
    .select("question_key, value_num, value_text, value_option")
    .eq("farm_id", farmId)
    .gte("period_start", `${year}-01-01`)
    .lte("period_start", `${year}-12-31`);

  const map: ResponseMap = {};
  for (const r of data ?? []) {
    map[r.question_key] = r.value_num ?? r.value_option ?? r.value_text;
  }
  return map;
}

function buildSheepKpis(thisY: ResponseMap, prior: ResponseMap, bms: Record<string, Benchmark>) {
  const lambsBorn = num(thisY, "sheep_lambs_born_alive");
  const ewesToTup = num(thisY, "sheep_ewes_to_tup");
  const losses = (num(thisY, "sheep_lamb_losses_24h") ?? 0) + (num(thisY, "sheep_lamb_losses_7d") ?? 0);
  const ewesDied = num(thisY, "sheep_ewes_died");
  const scanPct = num(thisY, "sheep_scanning_pct");
  const abortions = num(thisY, "sheep_abortions");
  const abEvents = num(thisY, "treatment_antibiotic_count");

  const priorLambsBorn = num(prior, "sheep_lambs_born_alive");
  const priorEwesToTup = num(prior, "sheep_ewes_to_tup");
  const priorLosses = (num(prior, "sheep_lamb_losses_24h") ?? 0) + (num(prior, "sheep_lamb_losses_7d") ?? 0);

  const lambingPct = pct(lambsBorn, ewesToTup);
  const mortPct = pct(losses, lambsBorn);
  const eweMortPct = pct(ewesDied, ewesToTup);
  const abortPct = pct(abortions, ewesToTup);

  return [
    { key: "lambing_pct", label: "Lambing %", value: lambingPct, unit: "%", higher_is_better: true, rag: rag(lambingPct, bms["sheep_lambing_pct"]), ...delta(lambingPct, pct(priorLambsBorn, priorEwesToTup)) },
    { key: "scanning_pct", label: "Scanning %", value: scanPct, unit: "%", higher_is_better: true, rag: rag(scanPct, bms["sheep_scanning_pct"]), ...delta(scanPct, num(prior, "sheep_scanning_pct")) },
    { key: "lamb_mortality_pct", label: "Lamb mortality", value: mortPct, unit: "%", higher_is_better: false, rag: rag(mortPct, bms["sheep_lamb_mortality_pct"]), ...delta(mortPct, pct(priorLosses, priorLambsBorn)) },
    { key: "ewe_mortality_pct", label: "Ewe mortality", value: eweMortPct, unit: "%", higher_is_better: false, rag: rag(eweMortPct, bms["sheep_ewe_mortality_pct"]), ...delta(eweMortPct, pct(num(prior, "sheep_ewes_died"), priorEwesToTup)) },
    { key: "abortion_pct", label: "Abortion rate", value: abortPct, unit: "%", higher_is_better: false, rag: rag(abortPct, bms["sheep_abortion_pct"]), ...delta(abortPct, pct(num(prior, "sheep_abortions"), priorEwesToTup)) },
    { key: "antibiotic_events", label: "Antibiotic events", value: abEvents, unit: "events", higher_is_better: false, rag: rag(abEvents, bms["sheep_antibiotic_events"]), ...delta(abEvents, num(prior, "treatment_antibiotic_count"), " events") },
  ];
}

function buildSucklerKpis(thisY: ResponseMap, prior: ResponseMap, bms: Record<string, Benchmark>) {
  const cowsCalved = num(thisY, "suckler_cows_calved");
  const calvesBorn = num(thisY, "suckler_calves_born_alive");
  const dead = (num(thisY, "suckler_calves_dead_at_birth") ?? 0) + (num(thisY, "suckler_calves_died_14d") ?? 0);
  const assisted = num(thisY, "suckler_assisted_calvings");
  const spread = num(thisY, "suckler_calving_spread_weeks");
  const weaned = num(thisY, "suckler_calves_weaned");
  const abEvents = num(thisY, "treatment_antibiotic_count");

  const priorCows = num(prior, "suckler_cows_calved");
  const priorCalves = num(prior, "suckler_calves_born_alive");
  const priorDead = (num(prior, "suckler_calves_dead_at_birth") ?? 0) + (num(prior, "suckler_calves_died_14d") ?? 0);

  return [
    { key: "calving_pct", label: "Calving %", value: pct(calvesBorn, cowsCalved), unit: "%", higher_is_better: true, rag: rag(pct(calvesBorn, cowsCalved), bms["suckler_calving_pct"]), ...delta(pct(calvesBorn, cowsCalved), pct(priorCalves, priorCows)) },
    { key: "calf_mortality_pct", label: "Calf mortality", value: pct(dead, calvesBorn), unit: "%", higher_is_better: false, rag: rag(pct(dead, calvesBorn), bms["suckler_calf_mortality_pct"]), ...delta(pct(dead, calvesBorn), pct(priorDead, priorCalves)) },
    { key: "assisted_pct", label: "Assisted calvings", value: pct(assisted, cowsCalved), unit: "%", higher_is_better: false, rag: rag(pct(assisted, cowsCalved), bms["suckler_assisted_pct"]), ...delta(pct(assisted, cowsCalved), pct(num(prior, "suckler_assisted_calvings"), priorCows)) },
    { key: "calving_spread", label: "Calving spread", value: spread, unit: "weeks", higher_is_better: false, rag: rag(spread, bms["suckler_calving_spread"]), ...delta(spread, num(prior, "suckler_calving_spread_weeks"), " wks") },
    { key: "weaning_count", label: "Calves weaned", value: weaned, unit: "head", higher_is_better: true, rag: "none", vs_prior_year: null, vs_prior_year_label: null },
    { key: "suckler_antibiotic_events", label: "Antibiotic events", value: abEvents, unit: "events", higher_is_better: false, rag: rag(abEvents, bms["suckler_antibiotic_events"]), ...delta(abEvents, num(prior, "treatment_antibiotic_count"), " events") },
  ];
}

/** Rolling 12-month window ending at the last day of the previous month */
function rollingWindow() {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  const from = new Date(to.getFullYear() - 1, to.getMonth() + 1, 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const QUESTION_TO_PCU: Record<string, string> = {
  suckler_cows_to_bull: "A", pcu_replacement_heifers: "B",
  pcu_stores_sold_under12: "C", pcu_stores_sold_12_18: "D", pcu_stores_sold_over18: "E",
  pcu_fat_sold_under12: "F", pcu_fat_sold_12_18: "G", pcu_fat_sold_over18: "H",
  pcu_stores_b12_s12: "I", pcu_stores_b12_s1218: "J", pcu_stores_b12_s18: "K",
  pcu_stores_b1218_s1218: "L", pcu_stores_b1218_s18: "M", pcu_stores_b18_s18: "N",
  pcu_fat_b12_s1218: "O", pcu_fat_b12_s18: "P", pcu_fat_b1218_s1218: "Q",
  pcu_fat_b1218_s18: "R", pcu_fat_b18_s18: "S",
  sheep_ewes_to_tup: "T", pcu_lambs_sold_breeding: "U",
  sheep_lambs_sold_fat: "V", pcu_lambs_on_farm: "W",
};

async function getMgPcu(db: ReturnType<typeof getDb>, farmId: string, year: number) {
  const { from, to } = rollingWindow();
  const [responsesRes, weightsRes, rxRes] = await Promise.all([
    db.from("check_in_responses")
      .select("question_key, value_num")
      .eq("farm_id", farmId)
      .gte("period_start", `${year}-01-01`)
      .lte("period_start", `${year}-12-31`)
      .in("question_key", Object.keys(QUESTION_TO_PCU))
      .order("submitted_at", { ascending: false }),
    db.from("pcu_category_weights").select("code, weight_kg"),
    db.from("antibiotic_prescriptions").select("total_mg").eq("farm_id", farmId).gte("prescription_date", from).lte("prescription_date", to),
  ]);

  const weightMap = Object.fromEntries((weightsRes.data ?? []).map((w) => [w.code, Number(w.weight_kg)]));

  const seenKeys = new Set<string>();
  let totalPcu = 0;
  for (const r of responsesRes.data ?? []) {
    if (seenKeys.has(r.question_key)) continue;
    seenKeys.add(r.question_key);
    const code = QUESTION_TO_PCU[r.question_key];
    if (code && r.value_num !== null) totalPcu += r.value_num * (weightMap[code] ?? 0);
  }

  const totalMg = (rxRes.data ?? []).reduce((s, r) => s + (r.total_mg ?? 0), 0);

  return {
    mg_per_pcu: totalPcu > 0 ? Math.round((totalMg / totalPcu) * 100) / 100 : null,
    total_mg: Math.round(totalMg),
    total_pcu_kg: Math.round(totalPcu),
    window: { from, to },
    has_stock_data: (responsesRes.data?.length ?? 0) > 0,
    has_prescription_data: (rxRes.data?.length ?? 0) > 0,
  };
}

// GET /api/report/:farmId
router.get("/:farmId", async (c) => {
  const db = getDb(c.env);
  const farmId = c.req.param("farmId");

  const { data: farm, error } = await db.from("farms").select("*").eq("id", farmId).single();
  if (error || !farm) return c.json({ error: "Farm not found" }, 404);

  const thisYear = new Date().getFullYear();
  const [thisY, priorY, { data: bmRows }, mgpcu] = await Promise.all([
    getYearResponses(db, farmId, thisYear),
    getYearResponses(db, farmId, thisYear - 1),
    db.from("benchmarks").select("*"),
    getMgPcu(db, farmId, thisYear),
  ]);

  const bms: Record<string, Benchmark> = {};
  for (const b of bmRows ?? []) bms[`${b.enterprise_type}_${b.kpi_key}`] = b;

  const sheepKpis = farm.enterprise_types.includes("sheep") ? buildSheepKpis(thisY, priorY, bms) : [];
  const sucklerKpis = farm.enterprise_types.includes("suckler") ? buildSucklerKpis(thisY, priorY, bms) : [];

  const diseaseMap = [
    { condition: "Vaginal prolapse (ewes)", key: "sheep_vaginal_prolapse", enterprise: "Sheep" },
    { condition: "Mastitis (ewes)", key: "sheep_mastitis", enterprise: "Sheep" },
    { condition: "Fly strike", key: "sheep_fly_strike", enterprise: "Sheep" },
    { condition: "Watery mouth (lambs)", key: "sheep_watery_mouth", enterprise: "Sheep" },
    { condition: "Orf (lambs)", key: "sheep_orf", enterprise: "Sheep" },
    { condition: "Lamb scour", key: "sheep_scour_lambs", enterprise: "Sheep" },
    { condition: "Calf pneumonia", key: "suckler_pneumonia_calves", enterprise: "Suckler" },
    { condition: "Calf scour", key: "suckler_scour_calves", enterprise: "Suckler" },
    { condition: "Retained cleansings", key: "suckler_retained_cleansings", enterprise: "Suckler" },
    { condition: "Johne's (suspected)", key: "suckler_johnes_suspected", enterprise: "Suckler" },
    { condition: "BVD (suspected)", key: "suckler_bvd_suspected", enterprise: "Suckler" },
  ];

  const diseases = diseaseMap
    .map((d) => ({ condition: d.condition, enterprise: d.enterprise, this_year: num(thisY, d.key) ?? 0, prior_year: num(priorY, d.key) ?? 0 }))
    .filter((d) => d.this_year > 0 || d.prior_year > 0);

  return c.json({
    farm,
    period_label: `1 Jan ${thisYear} – present`,
    sheep_kpis: sheepKpis,
    suckler_kpis: sucklerKpis,
    diseases,
    treatments: [],
    farmer_notes: {
      went_well: (thisY["aims_went_well"] as string | null) ?? "",
      challenges: (thisY["aims_challenges"] as string | null) ?? "",
      targets: (thisY["aims_targets"] as string | null) ?? "",
    },
    antibiotic_usage: mgpcu,
    vet_notes: null,
  });
});

// POST /api/report/:farmId/briefing
router.post("/:farmId/briefing", async (c) => {
  const db = getDb(c.env);
  const farmId = c.req.param("farmId");

  const { data: farm, error } = await db.from("farms").select("*").eq("id", farmId).single();
  if (error || !farm) return c.json({ error: "Farm not found" }, 404);

  const thisYear = new Date().getFullYear();
  const [thisY, priorY, twoPriorY] = await Promise.all([
    getYearResponses(db, farmId, thisYear),
    getYearResponses(db, farmId, thisYear - 1),
    getYearResponses(db, farmId, thisYear - 2),
  ]);

  const points = await generateBriefing({
    farm_name: farm.name,
    enterprise_types: farm.enterprise_types,
    this_year: { [thisYear]: thisY },
    prior_years: { [thisYear - 1]: priorY, [thisYear - 2]: twoPriorY },
  }, c.env.ANTHROPIC_API_KEY);

  return c.json({ points });
});

export default router;
