export type RecordType     = 'wash' | 'polish'
export type PaymentMethod  = 'cash' | 'transfer'
export type PaymentStatus  = 'paid' | 'unpaid'
export type JobStatus      = 'pending' | 'done'

export interface Record {
  id:               string
  created_at:       string
  type:             RecordType
  plate:            string
  services:         string[]
  price:            number
  seq_number:       number
  created_by?:      string
  created_by_email?: string  // ✅ เก็บอีเมลคนสร้าง
  updated_by_email?: string  // ✅ เก็บอีเมลคนแก้ไข
  updated_at?:      string   // ✅ เก็บเวลาแก้ไขล่าสุด
  payment_method?:  PaymentMethod
  customer_name?:   string          
  payment_status:   PaymentStatus
  job_status:       JobStatus
  note?:            string
}

export interface Expense {
  id:               string
  created_at:       string
  title:            string
  amount:           number
  note:             string | null
  created_by?:      string
  created_by_email?: string  // ✅ เก็บอีเมลคนสร้าง
  updated_by_email?: string  // ✅ เก็บอีเมลคนแก้ไข
  updated_at?:      string   // ✅ เก็บเวลาแก้ไขล่าสุด
}

export const CAR_TYPES = [
  { id: 'sedan',      name: 'รถเก๋ง',   icon: '🚗' },
  { id: 'suv',        name: 'SUV / MPV',         icon: '🚙' },
  { id: 'pickup',     name: 'รถกระบะ',   icon: '🛻' },
  { id: 'van',        name: 'รถตู้ / VIP',        icon: '🚐' },
  { id: 'motorcycle', name: 'มอเตอร์ไซค์',        icon: '🛵' },
  { id: 'bigbike',    name: 'บิ๊กไบค์', icon: '🏍️' },
] as const

export const CAR_BRANDS = [
  { id: 'toyota',     name: 'TOYOTA' },
  { id: 'honda',      name: 'HONDA' },
  { id: 'isuzu',      name: 'ISUZU' },
  { id: 'mitsubishi', name: 'MITSUBISHI' },
  { id: 'mazda',      name: 'MAZDA' },
  { id: 'nissan',     name: 'NISSAN' },
  { id: 'suzuki',     name: 'SUZUKI' },
  { id: 'ford',       name: 'FORD' },
  { id: 'mg',         name: 'MG' },
  { id: 'byd',        name: 'BYD' },
  { id: 'ora',        name: 'ORA / GWM' },
  { id: 'neta',       name: 'NETA' },
  { id: 'tesla',      name: 'TESLA' },
  { id: 'aion',       name: 'AION' },
  { id: 'mercedes',   name: 'BENZ' },
  { id: 'bmw',        name: 'BMW' },
  { id: 'volvo',      name: 'VOLVO' },
  { id: 'hyundai',    name: 'HYUNDAI' },
  { id: 'kia',        name: 'KIA' },
  { id: 'subaru',     name: 'SUBARU' },
  { id: 'volkswagen', name: 'VOLKSWAGEN' },
] as const