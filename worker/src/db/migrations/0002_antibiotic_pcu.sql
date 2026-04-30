-- Run in Supabase dashboard → SQL Editor

-- ── PCU reference weights (EMA ESVAC standard live weights) ───────────────
-- Populate pbi_column once you run `EVALUATE 'PCU weights'` in DAX Studio.
-- Update weight_kg values if they differ from EMA defaults in your Power BI table.
CREATE TABLE IF NOT EXISTS pcu_category_weights (
  code        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  species     TEXT NOT NULL,   -- 'cattle', 'sheep', 'pig', 'poultry', 'equine', 'other'
  weight_kg   NUMERIC NOT NULL,
  pbi_column  TEXT,            -- Power BI column letter (A–W) — fill after DAX export
  sort_order  INT NOT NULL DEFAULT 0
);

-- Weights sourced from CHAWG reference.xlsx "Data Collection All" sheet.
-- Cattle categories A–S use practice-specific buy/sell age averages (not EMA defaults).
-- B = bought age, S = sold age (e.g. B<12mo = bought under 12 months old).
INSERT INTO pcu_category_weights (code, label, species, weight_kg, pbi_column, sort_order) VALUES
  ('A', 'Cows & heifers put to the bull',                        'cattle', 726,  'A',  1),
  ('B', 'Heifers kept as replacement',                           'cattle', 367,  'B',  2),
  ('C', 'Stores/breeding stock sold < 12 months',                'cattle',   0,  'C',  3),
  ('D', 'Stores/breeding stock sold 12–18 months',               'cattle', 266,  'D',  4),
  ('E', 'Stores/breeding stock sold > 18 months',                'cattle', 453,  'E',  5),
  ('F', 'Fat sold < 12 months',                                  'cattle', 174,  'F',  6),
  ('G', 'Fat sold 12–18 months',                                 'cattle', 343,  'G',  7),
  ('H', 'Fat sold > 18 months',                                  'cattle', 655,  'H',  8),
  ('I', 'Stores: bought < 12mo, sold < 12mo',                   'cattle', 104,  'I',  9),
  ('J', 'Stores: bought < 12mo, sold 12–18mo',                  'cattle', 250,  'J', 10),
  ('K', 'Stores: bought < 12mo, sold > 18mo',                   'cattle', 428,  'K', 11),
  ('L', 'Stores: bought 12–18mo, sold 12–18mo',                 'cattle', 144,  'L', 12),
  ('M', 'Stores: bought 12–18mo, sold > 18mo',                  'cattle', 204,  'M', 13),
  ('N', 'Stores: bought > 18mo, sold > 18mo',                   'cattle', 146,  'N', 14),
  ('O', 'Stores (fat): bought < 12mo, sold 12–18mo',            'cattle', 325,  'O', 15),
  ('P', 'Stores (fat): bought < 12mo, sold > 18mo',             'cattle', 627,  'P', 16),
  ('Q', 'Stores (fat): bought 12–18mo, sold 12–18mo',           'cattle', 177,  'Q', 17),
  ('R', 'Stores (fat): bought 12–18mo, sold > 18mo',            'cattle', 403,  'R', 18),
  ('S', 'Stores (fat): bought > 18mo, sold > 18mo',             'cattle', 199,  'S', 19),
  ('T', 'Ewes to tup',                                          'sheep',   75,  'T', 20),
  ('U', 'Lambs sold for breeding',                              'sheep',   20,  'U', 21),
  ('V', 'Lambs sold as fat',                                    'sheep',   20,  'V', 22),
  ('W', 'Lambs still on holding',                               'sheep',   20,  'W', 23)
ON CONFLICT (code) DO NOTHING;

-- ── PMS antibiotic prescription imports ───────────────────────────────────
CREATE TABLE IF NOT EXISTS antibiotic_prescriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id           UUID NOT NULL REFERENCES farms(id),
  prescription_date DATE NOT NULL,
  product_name      TEXT,
  active_substance  TEXT,
  total_mg          NUMERIC NOT NULL,    -- Sales[Total Mg]
  volume_ml         NUMERIC,            -- Sales[Item Component Number]
  sale_value_gbp    NUMERIC,            -- Sales[Total Sale £]
  import_batch_id   TEXT,              -- groups rows from the same CSV upload
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rx_farm_date        ON antibiotic_prescriptions(farm_id, prescription_date);
CREATE INDEX IF NOT EXISTS idx_rx_import_batch     ON antibiotic_prescriptions(import_batch_id);

-- ── Annual stock counts per farm (PCU denominator) ────────────────────────
CREATE TABLE IF NOT EXISTS farm_stock_counts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id       UUID NOT NULL REFERENCES farms(id),
  category_code TEXT NOT NULL REFERENCES pcu_category_weights(code),
  count         INT NOT NULL DEFAULT 0,
  year          INT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farm_id, category_code, year)
);

CREATE INDEX IF NOT EXISTS idx_stock_farm_year ON farm_stock_counts(farm_id, year);
