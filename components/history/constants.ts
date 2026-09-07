export type TabType = 'income' | 'expense'
export type FilterType = 'all' | 'wash' | 'polish'

export const START_YEAR = new Date().getFullYear() - 5
export const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => START_YEAR + i)

export const MONTH_OPTIONS = [
  { value: 0, label: 'ตลอดทั้งปี' },
  { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' }, { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' }, { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
]

export const getExpenseIcon = (title: string) => {
  const t = title || ''
  if (t.includes('น้ำยา')) return '💧'
  if (t.includes('แรง')) return '👷'
  if (t.includes('ข้าว') || t.includes('อาหาร')) return '🍚'
  if (t.includes('เช่า')) return '🏠'
  if (t.includes('ไฟ')) return '⚡'
  if (t.includes('น้ำ')) return '🚰'
  if (t.includes('ขยะ')) return '🗑️'
  if (t.includes('อุปกรณ์')) return '🛒'
  return '💸'
}
