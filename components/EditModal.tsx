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
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl my-auto animate-in slide-in-from-bottom-10 duration-500 font-sarabun overflow-hidden">
        
        {/* Colored top strip based on record type */}
        <div className={`h-1.5 w-full ${record.type === 'wash' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`} />

        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${record.type === 'wash' ? 'text-blue-400' : 'text-amber-400'}`}>
                {record.type === 'wash' ? '🧼 Wash' : '✨ Polish'} · #{record.seq_number}
              </p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">แก้ไขข้อมูล</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-90 rounded-full text-slate-400 text-sm font-bold transition-all"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 no-scrollbar">

            {/* Plate */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">เลขทะเบียนรถ</label>
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-3xl font-black text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition-all tracking-widest"
              />
            </div>

            {/* Car Type */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">ประเภทงาน</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-base font-bold text-slate-800 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">เลือกประเภท</option>
                  {CAR_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-[10px]">▼</div>
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">ยี่ห้อรถ</label>
              <div className="relative">
                <select
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-base font-bold text-slate-800 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">เลือกยี่ห้อ</option>
                  {CAR_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-[10px]">▼</div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">หมายเหตุ (เช่น สีรถ)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ระบุสีรถหรือหมายเหตุ..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-base font-bold text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] px-1 block ${record.type === 'wash' ? 'text-blue-400' : 'text-amber-400'}`}>
                ราคาค่าบริการ (฿)
              </label>
              <div className={`relative rounded-2xl border-2 transition-all ${record.type === 'wash' ? 'bg-blue-50 border-blue-100 focus-within:border-blue-400' : 'bg-amber-50 border-amber-100 focus-within:border-amber-400'}`}>
                <span className={`absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none ${record.type === 'wash' ? 'text-blue-300' : 'text-amber-300'}`}>฿</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className={`w-full bg-transparent pl-12 pr-6 py-5 text-4xl font-black outline-none text-center ${record.type === 'wash' ? 'text-blue-600' : 'text-amber-600'}`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => { if(confirm('⚠️ ยืนยันการลบรายการนี้?')) onDelete(record.id) }}
                className="py-4 rounded-[20px] bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black uppercase tracking-widest active:scale-95 hover:bg-rose-100 transition-all"
              >
                ลบรายการ 🗑️
              </button>
              <button
                onClick={handleConfirmSave}
                className={`py-4 rounded-[20px] text-white text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${
                  record.type === 'wash'
                    ? 'bg-slate-900 shadow-slate-200'
                    : 'bg-amber-500 shadow-amber-100'
                }`}
              >
                บันทึกใหม่ ✅
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}