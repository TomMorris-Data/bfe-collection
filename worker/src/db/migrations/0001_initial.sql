-- Run this in the Supabase dashboard → SQL Editor
-- Or via: psql $DATABASE_URL -f src/db/migrations/0001_initial.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS farms (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_ref          TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  contact_name        TEXT,
  email               TEXT,
  phone               TEXT,
  enterprise_types    TEXT[] NOT NULL DEFAULT '{}',
  sbi_no              TEXT,
  ahwp_agreement_no   TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_client_ref ON farms(client_ref);

CREATE TABLE IF NOT EXISTS check_in_tokens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id             UUID NOT NULL REFERENCES farms(id),
  token               TEXT NOT NULL UNIQUE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  first_accessed_at   TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_token   ON check_in_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_farm_id ON check_in_tokens(farm_id);

CREATE TABLE IF NOT EXISTS check_in_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id       UUID NOT NULL REFERENCES farms(id),
  token_id      UUID NOT NULL REFERENCES check_in_tokens(id),
  period_start  DATE NOT NULL,
  section       TEXT NOT NULL,
  question_key  TEXT NOT NULL,
  value_num     NUMERIC,
  value_text    TEXT,
  value_option  TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_farm_period ON check_in_responses(farm_id, period_start);

CREATE TABLE IF NOT EXISTS benchmarks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_type   TEXT NOT NULL,
  kpi_key           TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT '%',
  red_below         NUMERIC,
  amber_below       NUMERIC,
  green_above       NUMERIC,
  higher_is_better  BOOLEAN NOT NULL DEFAULT TRUE
);

-- Auto-update updated_at on farms
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farms_updated_at
  BEFORE UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
