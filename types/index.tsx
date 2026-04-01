export type RecordType = 'wash' | 'polish'

export interface Record {
  id: string
  created_at: string
  type: RecordType
  plate: string
  services: string[] // เก็บ [ประเภทรถ, ยี่ห้อรถ, หมายเหตุ]
  price: number
  seq_number: number
}

// 1. เพิ่ม CAR_TYPES (ที่ Error แจ้งว่าหายไป)
export const CAR_TYPES = [
  { id: 'sedan', name: 'รถเก๋ง / Small', icon: '🚗' },
  { id: 'suv', name: 'SUV / MPV', icon: '🚙' },
  { id: 'pickup', name: 'รถกระบะ / Truck', icon: '🛻' },
  { id: 'van', name: 'รถตู้ / VIP', icon: '🚐' },
  { id: 'motorcycle', name: 'มอเตอร์ไซค์', icon: '🛵' },
  { id: 'bigbike', name: 'บิ๊กไบค์ / Big Bike', icon: '🏍️' },
]

// 2. รายชื่อยี่ห้อรถแบบครบๆ (ตามที่คุณต้องการ)
export const CAR_BRANDS = [
  { id: 'toyota',    name: 'TOYOTA' },
  { id: 'honda',     name: 'HONDA' },
  { id: 'isuzu',     name: 'ISUZU' },
  { id: 'mitsubishi', name: 'MITSUBISHI' },
  { id: 'mazda',     name: 'MAZDA' },
  { id: 'nissan',    name: 'NISSAN' },
  { id: 'suzuki',    name: 'SUZUKI' },
  { id: 'ford',      name: 'FORD' },
  { id: 'mg',        name: 'MG' },
  { id: 'byd',       name: 'BYD' },
  { id: 'ora',       name: 'ORA / GWM' },
  { id: 'neta',      name: 'NETA' },
  { id: 'tesla',     name: 'TESLA' },
  { id: 'aion',      name: 'AION' },
  { id: 'mercedes',  name: 'BENZ' },
  { id: 'bmw',       name: 'BMW' },
  { id: 'volvo',     name: 'VOLVO' },
  { id: 'hyundai',   name: 'HYUNDAI' },
  { id: 'kia',       name: 'KIA' },
  { id: 'subaru',    name: 'SUBARU' },
  { id: 'volkswagen', name: 'VOLKSWAGEN' },
]