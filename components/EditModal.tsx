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

  // ดึงข้อมูลเดิมมาใส่ใน State เมื่อเปิด Modal
  useEffect(() => {
    if (record) {
      setPlate(record.plate)
      // หา ID จากชื่อที่เก็บไว้ใน Array services [type, brand, note]
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl my-auto animate-in slide-in-from-bottom-10 duration-500">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">แก้ไขข้อมูลทั้งหมด</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400">✕</button>
        </div>

        <div className="space-y-5 font-sarabun max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
          
          {/* แก้ไขทะเบียน */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">เลขทะเบียน</label>
            <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 rounded-2xl px-5 py-3 text-2xl font-black text-slate-900 outline-none border-2 border-transparent focus:border-blue-100" />
          </div>

          {/* แก้ไขประเภทรถ (Dropdown) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">ประเภทรถ</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-100 appearance-none">
              <option value="">เลือกประเภท</option>
              {CAR_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
          </div>

          {/* แก้ไขยี่ห้อรถ (Dropdown) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">ยี่ห้อรถ</label>
            <select value={brand} onChange={e => setBrand(e.target.value)}
              className="w-full bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-100 appearance-none">
              <option value="">เลือกยี่ห้อ</option>
              {CAR_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* แก้ไขหมายเหตุ */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">หมายเหตุ</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:border-blue-100" />
          </div>

          {/* แก้ไขราคา */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest px-1">ราคา (฿)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-blue-50/50 rounded-2xl px-5 py-3 text-2xl font-black text-blue-600 outline-none border-2 border-blue-100 focus:border-blue-300" />
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4">
            <button onClick={() => { if(confirm('⚠️ ลบรายการนี้?')) onDelete(record.id) }}
              className="py-4 rounded-[20px] bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-widest transition-all">
              ลบ 🗑️
            </button>
            <button onClick={handleConfirmSave}
              className="py-4 rounded-[20px] bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">
              บันทึก ✅
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}