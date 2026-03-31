export type RecordType = 'wash' | 'polish'

export interface Record {
  id: string
  created_at: string
  type: RecordType
  plate: string
  services: string[]
  price: number
  note: string
  seq_number: number
}

export const WASH_SERVICES = [
  { id: 'basic',    name: 'ล้างรถทั่วไป', price: 100 },
  { id: 'interior', name: 'ล้างอัดฉีด',   price: 150 },
  { id: 'wax',      name: 'แว็กซ์',        price: 200 },
  { id: 'engine',   name: 'ล้างเครื่อง',   price: 250 },
]

export const POLISH_SERVICES = [
  { id: 'polish_full',    name: 'ขัดสีทั้งคัน',   price: 0 },
  { id: 'polish_partial', name: 'ขัดสีบางส่วน',   price: 0 },
  { id: 'coat',           name: 'เคลือบสี',        price: 0 },
]