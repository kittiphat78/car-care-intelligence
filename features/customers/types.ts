import type { Record as AppRecord } from '@/types'

// Customer directory rows as PostgREST returns them (M010, M012-M014) and the form's draft.
// docs/features/customer-directory.md §4

export interface CustomerPhone {
  id: string
  /** Digits only, Thai format (0 + 8 or 9 digits) */
  number: string
  label: string | null
  is_primary: boolean
  position: number
}

export interface CustomerVehicle {
  id: string
  /** As typed, trimmed, upper case */
  plate: string
  /** No spaces, dots or dashes (search) */
  plate_key: string
  /** plate_key without a trailing province (matching, "one full plate, one customer") */
  plate_core: string
  /** Id from CAR_TYPES */
  car_type: string | null
  /** Id from CAR_BRANDS */
  brand: string | null
  /** Free text, e.g. "Vios" (M013) */
  model: string | null
  color: string | null
  note: string | null
  position: number
}

export interface Customer {
  id: string
  name: string
  note: string | null
  created_at: string
  created_by_email: string | null
  updated_at: string | null
  updated_by_email: string | null
  customer_phones: CustomerPhone[]
  customer_vehicles: CustomerVehicle[]
}

/** What customer_history (M014) returns, in the app's words */
export interface CustomerHistory {
  visits: number
  lastVisit: string | null
  total: number
  unpaidTotal: number
  unpaidCount: number
  /** Records counted because only the plate's numbers agree (may be another car) */
  digitsOnly: number
  /** Newest first; `sure` is false when only the plate's numbers agree */
  recent: Array<{ record: AppRecord; sure: boolean }>
}

/** One phone row in the form; `key` is only for React */
export interface PhoneDraft {
  key: string
  number: string
  label: string
  isPrimary: boolean
}

export interface VehicleDraft {
  key: string
  plate: string
  carType: string | null
  brand: string | null
  model: string
  color: string
  note: string
}

export interface CustomerDraft {
  name: string
  note: string
  phones: PhoneDraft[]
  vehicles: VehicleDraft[]
}
