import { Hono } from "hono";
import { getDb } from "../db/supabase";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const router = new Hono<{ Bindings: Bindings }>();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Rolling 12-month window ending at the last day of the previous month */
function rollingWindow(): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  const fromDate = new Date(toDate.getFullYear() - 1, toDate.getMonth() + 1, 1); // 12m back
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

// ── PCU reference weights ──────────────────────────────────────────────────

// GET /api/antibiotics/categories
router.get("/categories", async (c) => {
  const db = getDb(c.env);
  const { data, error } = await db
    .from("pcu_category_weights")
    .select("*")
    .order("sort_order");
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ── Prescription upload ────────────────────────────────────────────────────

/**
 * POST /api/antibiotics/prescriptions/upload
 *
 * Expects JSON array matching the PMS CSV export format:
 * [{ client_ref, date, product_name, active_substance, total_mg, volume_ml, sale_value_gbp }]
 *
 * client_ref must match farms.client_ref (the PMS client number).
 * total_mg is the pre-calculated active substance mg from Sales[Total Mg].
 */
router.post("/prescriptions/upload", async (c) => {
  const db = getDb(c.env);

  type Row = {
    client_ref: string;
    date: string;           // YYYY-MM-DD
    product_name?: string;
    active_substance?: string;
    total_mg: number;
    volume_ml?: number;
    sale_value_gbp?: number;
  };

  const rows: Row[] = await c.req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "Expected a non-empty JSON array" }, 400);
  }

  // Resolve client_refs → farm UUIDs in one query
  const clientRefs = [...new Set(rows.map((r) => r.client_ref))];
  const { data: farms, error: farmErr } = await db
    .from("farms")
    .select("id, client_ref")
    .in("client_ref", clientRefs);

  if (farmErr) return c.json({ error: farmErr.message }, 500);

  const farmMap = Object.fromEntries((farms ?? []).map((f) => [f.client_ref, f.id]));

  // Wipe existing records for the date range covered by this upload, so re-running
  // the script never creates duplicates. Each upload is a full replace for its window.
  const dates = rows.map((r) => r.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const farmIds = Object.values(farmMap);
  if (farmIds.length > 0) {
    const { error: delErr } = await db
      .from("antibiotic_prescriptions")
      .delete()
      .in("farm_id", farmIds)
      .gte("prescription_date", minDate)
      .lte("prescription_date", maxDate);
    if (delErr) return c.json({ error: `Cleanup failed: ${delErr.message}` }, 500);
  }

  const batchId = crypto.randomUUID();
  const inserts = rows.flatMap((r) => {
    const farmId = farmMap[r.client_ref];
    if (!farmId) return []; // unknown client — skip
    return [{
      farm_id: farmId,
      prescription_date: r.date,
      product_name: r.product_name ?? null,
      active_substance: r.active_substance ?? null,
      total_mg: r.total_mg,
      volume_ml: r.volume_ml ?? null,
      sale_value_gbp: r.sale_value_gbp ?? null,
      import_batch_id: batchId,
    }];
  });

  if (inserts.length === 0) {
    return c.json({ error: "No rows matched known farm client refs", skipped: rows.length }, 422);
  }

  const { error: insertErr } = await db.from("antibiotic_prescriptions").insert(inserts);
  if (insertErr) return c.json({ error: insertErr.message }, 500);

  return c.json({
    imported: inserts.length,
    skipped: rows.length - inserts.length,
    batch_id: batchId,
  });
});

// DELETE /api/antibiotics/prescriptions/batch/:batchId — rollback a bad upload
router.delete("/prescriptions/batch/:batchId", async (c) => {
  const db = getDb(c.env);
  const { error } = await db
    .from("antibiotic_prescriptions")
    .delete()
    .eq("import_batch_id", c.req.param("batchId"));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ deleted: true });
});

// ── mg/PCU calculation ─────────────────────────────────────────────────────

// Maps check-in question keys → PCU category codes (from CHAWG reference)
// Extend this as new stock inventory questions are added to the check-in.
const QUESTION_TO_PCU: Record<string, string> = {
  suckler_cows_to_bull:          "A",  // Cows & heifers put to the bull  (726 kg)
  pcu_replacement_heifers:       "B",  // Heifers kept as replacement      (367 kg)
  pcu_stores_sold_under12:       "C",  // Stores/breeding sold <12mo       (  0 kg)
  pcu_stores_sold_12_18:         "D",  // Stores/breeding sold 12–18mo     (266 kg)
  pcu_stores_sold_over18:        "E",  // Stores/breeding sold >18mo       (453 kg)
  pcu_fat_sold_under12:          "F",  // Fat sold <12mo                   (174 kg)
  pcu_fat_sold_12_18:            "G",  // Fat sold 12–18mo                 (343 kg)
  pcu_fat_sold_over18:           "H",  // Fat sold >18mo                   (655 kg)
  pcu_stores_b12_s12:            "I",  // Stores bought <12, sold <12      (104 kg)
  pcu_stores_b12_s1218:          "J",  // Stores bought <12, sold 12–18    (250 kg)
  pcu_stores_b12_s18:            "K",  // Stores bought <12, sold >18      (428 kg)
  pcu_stores_b1218_s1218:        "L",  // Stores bought 12–18, sold 12–18  (144 kg)
  pcu_stores_b1218_s18:          "M",  // Stores bought 12–18, sold >18    (204 kg)
  pcu_stores_b18_s18:            "N",  // Stores bought >18, sold >18      (146 kg)
  pcu_fat_b12_s1218:             "O",  // Fat bought <12, sold 12–18       (325 kg)
  pcu_fat_b12_s18:               "P",  // Fat bought <12, sold >18         (627 kg)
  pcu_fat_b1218_s1218:           "Q",  // Fat bought 12–18, sold 12–18     (177 kg)
  pcu_fat_b1218_s18:             "R",  // Fat bought 12–18, sold >18       (403 kg)
  pcu_fat_b18_s18:               "S",  // Fat bought >18, sold >18         (199 kg)
  sheep_ewes_to_tup:             "T",  // Ewes to tup                      ( 75 kg)
  pcu_lambs_sold_breeding:       "U",  // Lambs sold for breeding           ( 20 kg)
  sheep_lambs_sold_fat:          "V",  // Lambs sold fat                   ( 20 kg)
  pcu_lambs_on_farm:             "W",  // Lambs still on holding           ( 20 kg)
};

// GET /api/antibiotics/farms/:farmId/mgpcu?year=2025
router.get("/farms/:farmId/mgpcu", async (c) => {
  const db = getDb(c.env);
  const farmId = c.req.param("farmId");
  const year = Number(c.req.query("year") ?? new Date().getFullYear());
  const { from, to } = rollingWindow();

  const [responsesRes, weightsRes, rxRes] = await Promise.all([
    // Pull most recent value for each PCU-mapped question key within the year
    db.from("check_in_responses")
      .select("question_key, value_num")
      .eq("farm_id", farmId)
      .gte("period_start", `${year}-01-01`)
      .lte("period_start", `${year}-12-31`)
      .in("question_key", Object.keys(QUESTION_TO_PCU))
      .order("submitted_at", { ascending: false }),
    db.from("pcu_category_weights").select("code, weight_kg"),
    db.from("antibiotic_prescriptions")
      .select("total_mg")
      .eq("farm_id", farmId)
      .gte("prescription_date", from)
      .lte("prescription_date", to),
  ]);

  if (responsesRes.error) return c.json({ error: responsesRes.error.message }, 500);
  if (rxRes.error) return c.json({ error: rxRes.error.message }, 500);

  const weightMap = Object.fromEntries(
    (weightsRes.data ?? []).map((w) => [w.code, Number(w.weight_kg)])
  );

  // Most recent value per question key → map to PCU category
  const seenKeys = new Set<string>();
  const stockCounts: { code: string; count: number }[] = [];
  for (const r of responsesRes.data ?? []) {
    if (seenKeys.has(r.question_key)) continue; // keep only most recent
    seenKeys.add(r.question_key);
    const code = QUESTION_TO_PCU[r.question_key];
    if (code && r.value_num !== null) {
      stockCounts.push({ code, count: r.value_num });
    }
  }

  const totalPcu = stockCounts.reduce((sum, sc) => {
    return sum + sc.count * (weightMap[sc.code] ?? 0);
  }, 0);

  const totalMg = (rxRes.data ?? []).reduce((sum, r) => sum + (r.total_mg ?? 0), 0);
  const mgPerPcu = totalPcu > 0 ? Math.round((totalMg / totalPcu) * 100) / 100 : null;

  return c.json({
    farm_id: farmId,
    year,
    window: { from, to },
    total_mg: Math.round(totalMg),
    total_pcu_kg: Math.round(totalPcu),
    mg_per_pcu: mgPerPcu,
    stock_counts: stockCounts,
    has_stock_data: stockCounts.length > 0,
    has_prescription_data: (rxRes.data?.length ?? 0) > 0,
  });
});

export default router;
