/**
 * Hand-written DB types matching the Supabase schema.
 * Can be replaced with generated types via: npx supabase gen types typescript
 */
export interface Database {
  public: {
    Tables: {
      farms: {
        Row: Farm;
        Insert: Omit<Farm, "created_at" | "updated_at"> & Partial<Pick<Farm, "created_at" | "updated_at">>;
        Update: Partial<Farm>;
      };
      check_in_tokens: {
        Row: CheckInToken;
        Insert: Omit<CheckInToken, "created_at"> & Partial<Pick<CheckInToken, "created_at">>;
        Update: Partial<CheckInToken>;
      };
      check_in_responses: {
        Row: CheckInResponse;
        Insert: Omit<CheckInResponse, "submitted_at"> & Partial<Pick<CheckInResponse, "submitted_at">>;
        Update: Partial<CheckInResponse>;
      };
      benchmarks: {
        Row: Benchmark;
        Insert: Omit<Benchmark, "id"> & { id?: string };
        Update: Partial<Benchmark>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Farm {
  id: string;
  client_ref: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  enterprise_types: string[];   // Postgres TEXT[] — arrives as JS array
  sbi_no: string | null;
  ahwp_agreement_no: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckInToken {
  id: string;
  farm_id: string;
  token: string;
  period_start: string;   // ISO date YYYY-MM-DD
  period_end: string;
  expires_at: string;     // ISO datetime
  first_accessed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CheckInResponse {
  id: string;
  farm_id: string;
  token_id: string;
  period_start: string;
  section: string;
  question_key: string;
  value_num: number | null;
  value_text: string | null;
  value_option: string | null;
  submitted_at: string;
}

export interface Benchmark {
  id: string;
  enterprise_type: string;
  kpi_key: string;
  display_name: string;
  unit: string;
  red_below: number | null;
  amber_below: number | null;
  green_above: number | null;
  higher_is_better: boolean;
}
