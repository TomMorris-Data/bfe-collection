-- Run in Supabase dashboard → SQL Editor
-- Or via psql: psql $DATABASE_URL -f seed.sql

-- ── Test farms ────────────────────────────────────────────────────────────
INSERT INTO farms (id, client_ref, name, contact_name, email, enterprise_types, sbi_no, active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'BFE001', 'Hilltop Farm',     'John Shepherd',   'john@hilltopfarm.example',  ARRAY['sheep'],           '123456789', true),
  ('00000000-0000-0000-0000-000000000002', 'BFE002', 'Valley View Farm', 'Sarah Catterton', 'sarah@valleyview.example',  ARRAY['suckler'],         '987654321', true),
  ('00000000-0000-0000-0000-000000000003', 'BFE003', 'Meadow End Farm',  'Mike Thompson',   'mike@meadowend.example',    ARRAY['sheep','suckler'], '111222333', true)
ON CONFLICT (client_ref) DO NOTHING;

-- ── Live tokens (valid 7 days) ─────────────────────────────────────────────
INSERT INTO check_in_tokens (id, farm_id, token, period_start, period_end, expires_at)
VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001',
   'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
   CURRENT_DATE - 3, CURRENT_DATE + 11, NOW() + INTERVAL '7 days'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002',
   'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
   CURRENT_DATE - 3, CURRENT_DATE + 11, NOW() + INTERVAL '7 days'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000003',
   'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
   CURRENT_DATE - 3, CURRENT_DATE + 11, NOW() + INTERVAL '7 days')
ON CONFLICT (token) DO NOTHING;

-- ── Sheep responses — this year (Hilltop Farm) ────────────────────────────
INSERT INTO check_in_responses (farm_id, token_id, period_start, section, question_key, value_num)
SELECT '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001',
       DATE_TRUNC('year', CURRENT_DATE)::date + 60, section, question_key, value_num
FROM (VALUES
  ('sheep_lambing',      'sheep_ewes_to_tup',         320),
  ('sheep_lambing',      'sheep_scanning_pct',        178),
  ('sheep_lambing',      'sheep_lambs_born_alive',    542),
  ('sheep_lambing',      'sheep_lamb_losses_24h',       9),
  ('sheep_lambing',      'sheep_lamb_losses_7d',        8),
  ('sheep_lambing',      'sheep_abortions',             8),
  ('sheep_post_lambing', 'sheep_ewes_died',            11),
  ('treatments',         'treatment_antibiotic_count', 11),
  ('sheep_disease',      'sheep_vaginal_prolapse',      3),
  ('sheep_disease',      'sheep_mastitis',              5),
  ('sheep_disease',      'sheep_fly_strike',            7),
  ('sheep_disease',      'sheep_watery_mouth',          4),
  ('sheep_disease',      'sheep_orf',                   6),
  ('sheep_disease',      'sheep_scour_lambs',           9)
) AS t(section, question_key, value_num);

-- ── Sheep responses — prior year ──────────────────────────────────────────
INSERT INTO check_in_responses (farm_id, token_id, period_start, section, question_key, value_num)
SELECT '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001',
       (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year')::date + 60, section, question_key, value_num
FROM (VALUES
  ('sheep_lambing',      'sheep_ewes_to_tup',         310),
  ('sheep_lambing',      'sheep_scanning_pct',        165),
  ('sheep_lambing',      'sheep_lambs_born_alive',    498),
  ('sheep_lambing',      'sheep_lamb_losses_24h',       7),
  ('sheep_lambing',      'sheep_lamb_losses_7d',        6),
  ('sheep_lambing',      'sheep_abortions',             7),
  ('sheep_post_lambing', 'sheep_ewes_died',             9),
  ('treatments',         'treatment_antibiotic_count',  6)
) AS t(section, question_key, value_num);

-- ── Suckler responses — this year (Valley View Farm) ─────────────────────
INSERT INTO check_in_responses (farm_id, token_id, period_start, section, question_key, value_num)
SELECT '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000002',
       DATE_TRUNC('year', CURRENT_DATE)::date + 91, section, question_key, value_num
FROM (VALUES
  ('suckler_calving',    'suckler_cows_calved',          112),
  ('suckler_calving',    'suckler_calves_born_alive',    108),
  ('suckler_calving',    'suckler_calves_dead_at_birth',   3),
  ('suckler_calving',    'suckler_calves_died_14d',        2),
  ('suckler_calving',    'suckler_assisted_calvings',      9),
  ('suckler_calving',    'suckler_calving_spread_weeks',   7),
  ('suckler_calf_perf',  'suckler_calves_weaned',        103),
  ('treatments',         'treatment_antibiotic_count',    11),
  ('suckler_disease',    'suckler_pneumonia_calves',       8),
  ('suckler_disease',    'suckler_scour_calves',          11),
  ('suckler_disease',    'suckler_retained_cleansings',    4)
) AS t(section, question_key, value_num);

-- ── Suckler responses — prior year ───────────────────────────────────────
INSERT INTO check_in_responses (farm_id, token_id, period_start, section, question_key, value_num)
SELECT '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000002',
       (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year')::date + 91, section, question_key, value_num
FROM (VALUES
  ('suckler_calving',  'suckler_cows_calved',          108),
  ('suckler_calving',  'suckler_calves_born_alive',    105),
  ('suckler_calving',  'suckler_calves_dead_at_birth',   2),
  ('suckler_calving',  'suckler_calves_died_14d',        1),
  ('suckler_disease',  'suckler_pneumonia_calves',       3),
  ('treatments',       'treatment_antibiotic_count',     6)
) AS t(section, question_key, value_num);

-- ── Benchmarks ────────────────────────────────────────────────────────────
INSERT INTO benchmarks (enterprise_type, kpi_key, display_name, unit, red_below, amber_below, green_above, higher_is_better)
VALUES
  ('sheep',   'lambing_pct',        'Lambing %',        '%',     140,  160,  160,  true),
  ('sheep',   'scanning_pct',       'Scanning %',       '%',     150,  170,  170,  true),
  ('sheep',   'lamb_mortality_pct', 'Lamb mortality',   '%',     5.0,  3.0,  3.0,  false),
  ('sheep',   'ewe_mortality_pct',  'Ewe mortality',    '%',     4.0,  2.5,  2.5,  false),
  ('sheep',   'abortion_pct',       'Abortion rate',    '%',     3.0,  2.0,  2.0,  false),
  ('sheep',   'antibiotic_events',  'Antibiotic events','events',10,   6,    6,    false),
  ('suckler', 'calving_pct',        'Calving %',        '%',     90,   95,   95,   true),
  ('suckler', 'calf_mortality_pct', 'Calf mortality',   '%',     5.0,  3.0,  3.0,  false),
  ('suckler', 'assisted_pct',       'Assisted calvings','%',     10,   6,    6,    false),
  ('suckler', 'calving_spread',     'Calving spread',   'weeks', 12,   9,    9,    false),
  ('suckler', 'antibiotic_events',  'Antibiotic events','events',10,   6,    6,    false)
ON CONFLICT DO NOTHING;
