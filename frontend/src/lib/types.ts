export interface Farm {
  id: string;
  client_ref: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  enterprise_types: string[];
  sbi_no: string | null;
  ahwp_agreement_no: string | null;
  active: boolean;
}

export interface Question {
  key: string;
  section: string;
  label: string;
  type: "number" | "text" | "option" | "boolean";
  unit: string | null;
  options: string[] | null;
  hint: string | null;
}

export interface CheckInData {
  farm: Farm;
  period_start: string;
  period_end: string;
  questions: Question[];
  existing_responses: Record<string, string | number | null>;
  completed: boolean;
}

export interface FarmListItem {
  id: string;
  name: string;
  client_ref: string;
  enterprise_types: string[];
  email: string | null;
  completion_pct: number;
  last_response: string | null;
  alert_count: number;
}

export interface KpiCard {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  rag: "red" | "amber" | "green" | "none";
  vs_prior_year: number | null;
  vs_prior_year_label: string | null;
  higher_is_better: boolean;
}

export interface DiseaseRow {
  condition: string;
  this_year: number;
  prior_year: number;
  enterprise: string;
}

export interface TreatmentEvent {
  date: string | null;
  product: string;
  condition: string;
  group: string;
  enterprise: string;
}

export interface ReportData {
  farm: Farm;
  period_label: string;
  sheep_kpis: KpiCard[];
  suckler_kpis: KpiCard[];
  diseases: DiseaseRow[];
  treatments: TreatmentEvent[];
  farmer_notes: Record<string, string>;
  vet_notes: string | null;
}

export interface AiPoint {
  heading: string;
  body: string;
  severity: "info" | "warning" | "alert";
}

export interface AiBriefing {
  points: AiPoint[];
}
