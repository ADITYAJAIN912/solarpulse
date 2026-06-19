/**
 * TypeScript interfaces mirroring the SolarPulse backend Pydantic schemas.
 *
 * Keep these in sync with:
 *   backend/app/schemas/plant.py
 *   backend/app/schemas/performance.py
 *   backend/app/schemas/anomaly.py
 *   backend/app/schemas/sustainability.py
 *   backend/app/models/alert.py
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ---------------------------------------------------------------------------
// Plants
// ---------------------------------------------------------------------------

export interface Plant {
  id: number
  name: string
  location: string
  latitude: number
  longitude: number
  capacity_mw: number
  owner_id: number
  created_at: string
}

export interface PlantCreate {
  name: string
  location: string
  latitude: number
  longitude: number
  capacity_mw: number
}

// ---------------------------------------------------------------------------
// Performance / Alerts
// ---------------------------------------------------------------------------

export type Severity = 'healthy' | 'warning' | 'critical'
export interface HourlyReading {
  hour: number
  actual_output_kwh: number
  expected_output_kwh: number
}
export interface FlaggedHour {
  hour: number
  actual_output_kwh: number
  expected_output_kwh: number
  performance_ratio_pct: number
  severity: Severity
}

export interface PerformanceSummary {
  plant_id: number
  date: string
  overall_pr_pct: number | null
  risk_score: number | null
  severity: Severity | null
  hourly_readings: HourlyReading[]

  
  flagged_hours: FlaggedHour[]
  alert_id: number | null
}

export type RootCause =
  | 'panel_soiling'
  | 'shading'
  | 'hotspot'
  | 'inverter_overheating'
  | 'string_fault'
  | 'sensor_failure'
  | 'weather_impact'
  | 'unknown'

export interface Alert {
  id: number
  plant_id: number
  for_date: string
  severity: Severity
  performance_ratio: number | null
  risk_score: number | null
  root_cause: RootCause | null
  confidence_level: 'low' | 'medium' | 'high' | null
  ai_explanation: string | null
  suggested_action: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

export interface AnomalousHour {
  hour: number
  actual_output_kwh: number
  expected_output_kwh: number
  performance_ratio_pct: number
  anomaly_score: number
  is_anomaly: boolean
}

export interface AnomalyResult {
  plant_id: number
  date: string
  lookback_days: number
  training_samples: number
  model_fitted: boolean
  anomalous_hours: AnomalousHour[]
}

// ---------------------------------------------------------------------------
// Sustainability
// ---------------------------------------------------------------------------

export interface SustainabilitySummary {
  plant_id: number
  total_kwh_generated: number
  co2_saved_kg: number
  co2_saved_tonnes: number
  equivalence_statement: string
}
