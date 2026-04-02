// types/index.ts

export type RecordType     = 'wash' | 'polish'
export type PaymentMethod  = 'cash' | 'transfer'
export type PaymentStatus  = 'paid' | 'unpaid'
export type JobStatus      = 'pending' | 'done'

export interface Record {
  id:             string
  created_at:     string
  type:           RecordType
  plate:          string
  services:       string[]        // [ประเภทรถ, หมายเหตุ]
  price:          number
  seq_number:     number
  created_by?:    string
  payment_method?: PaymentMethod
  customer_name?: string          // ชื่อเต็นท์รถ / ลูกค้าประจำ (polish)
  payment_status: PaymentStatus
  job_status:     JobStatus
  note?:          string
}

export interface Expense {
  id:          string
  created_at:  string
  title:       string
  amount:      number
  note:        string | null
  created_by?: string
}

export const CAR_TYPES = [
  { id: 'sedan',      name: 'รถเก๋ง / Small',   icon: '🚗' },
  { id: 'suv',        name: 'SUV / MPV',         icon: '🚙' },
  { id: 'pickup',     name: 'รถกระบะ / Truck',   icon: '🛻' },
  { id: 'van',        name: 'รถตู้ / VIP',        icon: '🚐' },
  { id: 'motorcycle', name: 'มอเตอร์ไซค์',        icon: '🛵' },
  { id: 'bigbike',    name: 'บิ๊กไบค์ / Big Bike', icon: '🏍️' },
] as const

// Reserved — ใช้สำหรับ filter / report ในอนาคต
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