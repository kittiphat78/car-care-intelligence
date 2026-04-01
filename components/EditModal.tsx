'use client'
import { useState, useEffect } from 'react'
import { Record, CAR_TYPES, CAR_BRANDS } from '@/types'

interface Props {
  record: Record | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedData: any) => void
  onDelete: (id: string) => void
}

export default function EditModal({ record, isOpen, onClose, onSave, onDelete }: Props) {
  const [plate, setPlate] = useState('')
  const [type, setType] = useState('')
  const [brand, setBrand] = useState('')
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (record) {
      setPlate(record.plate)
      const typeId = CAR_TYPES.find(t => t.name === record.services[0])?.id || ''
      const brandId = CAR_BRANDS.find(b => b.name === record.services[1])?.id || ''
      
      setType(typeId)
      setBrand(brandId)
      setNote(record.services[2] || '')
      setPrice(record.price.toString())
    }
  }, [record])

  if (!isOpen || !record) return null

  const handleConfirmSave = () => {
    const typeName = CAR_TYPES.find(t => t.id === type)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === brand)?.name || 'ไม่ระบุยี่ห้อ'
    
    onSave({
      plate: plate.toUpperCase().trim(),
      price: parseInt(price) || 0,
      services: [typeName, brandName, note]
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-950/70 backdrop-blur-md transition-all overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl my-auto animate-in slide-in-from-bottom-10 duration-500 font-sarabun">
        
        {/* Header - ขยายหัวข้อ */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">แก้ไขข้อมูลรายการ</h2>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xl font-bold">✕</button>
        </div>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 no-scrollbar">
          
          {/* แก้ไขทะเบียน - ตัวหนาชัดเจน */}
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-slate-700 tracking-wider px-1">เลขทะเบียนรถ</label>
            <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-3xl font-black text-slate-900 outline-none focus:border-blue-500 transition-all" />
          </div>

          {/* แก้ไขประเภทรถ - ปรับ Dropdown ให้ตัวใหญ่ */}
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-slate-700 tracking-wider px-1">ประเภทงาน</label>
            <div className="relative">
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 outline-none appearance-none focus:border-blue-500 transition-all">
                <option value="">เลือกประเภท</option>
                {CAR_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">▼</div>
            </div>
          </div>

          {/* แก้ไขยี่ห้อรถ */}
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-slate-700 tracking-wider px-1">ยี่ห้อรถ</label>
            <div className="relative">
              <select value={brand} onChange={e => setBrand(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 outline-none appearance-none focus:border-blue-500 transition-all">
                <option value="">เลือกยี่ห้อ</option>
                {CAR_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">▼</div>
            </div>
          </div>

          {/* แก้ไขหมายเหตุ */}
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-slate-700 tracking-wider px-1">หมายเหตุ (เช่น สีรถ)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-500" />
          </div>

          {/* แก้ไขราคา - ตัวใหญ่สีเด่นตามสไตล์หน้าอื่น */}
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-blue-600 tracking-widest px-1">ราคาค่าบริการ (฿)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-5 text-4xl font-black text-blue-600 outline-none focus:border-blue-400 text-center" />
          </div>

          {/* ปุ่มกด - ปรับให้สูงขึ้น จิ้มง่ายไม่พลาด */}
          <div className="pt-6 grid grid-cols-2 gap-4">
            <button onClick={() => { if(confirm('⚠️ ยืนยันการลบรายการนี้?')) onDelete(record.id) }}
              className="py-5 rounded-[24px] bg-rose-50 text-rose-600 text-sm font-black uppercase tracking-widest active:scale-95 transition-all">
              ลบรายการ 🗑️
            </button>
            <button onClick={handleConfirmSave}
              className="py-5 rounded-[24px] bg-slate-900 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">
              บันทึกใหม่ ✅
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}