'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS } from '@/types'

export default function AddPage() {
  const router = useRouter()
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [note, setNote] = useState('') 
  const [price, setPrice] = useState('') 
  const [saving, setSaving] = useState(false)

  const isPolish = type === 'polish'

  async function handleSubmit() {
    if (!plate.trim()) { alert('⚠️ กรุณากรอกป้ายทะเบียน'); return }
    if (!selectedType) { alert('⚠️ กรุณาเลือกประเภทรถ'); return }
    if (!price || parseInt(price) <= 0) { alert('⚠️ กรุณากรอกราคา'); return }

    setSaving(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    
    const { count } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || 'ไม่ระบุยี่ห้อ'
    const serviceNames = [typeName, brandName, note].filter(Boolean)

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services: serviceNames,
      price: parseInt(price),
      seq_number: (count ?? 0) + 1,
    })

    if (error) {
      alert('❌ Error: ' + error.message)
      setSaving(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] page-transition pb-40">
      {/* Header */}
      <div className="px-6 pt-14 pb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 font-sarabun">New Entry</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none font-sarabun">
          {isPolish ? 'ขัดสี ✨' : 'ล้างรถ 🚿'}
        </h1>
      </div>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        {/* 1. Type Switcher */}
        <div className="flex p-1.5 bg-white border border-slate-100 rounded-[22px] shadow-sm">
          <button onClick={() => setType('wash')}
            className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${type === 'wash' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}>
            🚿 WASH
          </button>
          <button onClick={() => setType('polish')}
            className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${type === 'polish' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>
            ✨ POLISH
          </button>
        </div>

        {/* 2. License Plate */}
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">เลขทะเบียนรถ</label>
          <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="กข 1234"
            className="w-full bg-white border border-slate-200 rounded-[25px] px-8 py-6 text-4xl font-black text-slate-900 outline-none shadow-sm placeholder:text-slate-100" />
        </div>

        {/* 3. Car Type (ลิสต์แนวตั้ง) */}
        <div className="space-y-4">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400 font-sarabun">เลือกประเภทรถ</label>
          <div className="space-y-2">
            {CAR_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t.id)}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-[22px] border-2 transition-all active:scale-[0.98]
                ${selectedType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-600 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-black text-base">{t.name}</span>
                </div>
                {selectedType === t.id && <span className="text-blue-400 font-black">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Car Brand (ลิสต์แนวตั้ง) */}
        <div className="space-y-4">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400 font-sarabun">เลือกยี่ห้อรถ</label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar rounded-xl">
            {CAR_BRANDS.map(b => (
              <button key={b.id} onClick={() => setSelectedBrand(b.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-[20px] border-2 transition-all active:scale-[0.98]
                ${selectedBrand === b.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-50 text-slate-500 shadow-sm'}`}>
                <span className="font-black text-sm tracking-wide">{b.name}</span>
                {selectedBrand === b.id && <span className="text-white font-black">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Note & Price */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">คำอธิบาย (เช่น สีรถ, ขัดโคมไฟ)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="..."
              className="w-full bg-white border border-slate-200 rounded-[22px] px-6 py-4 text-sm font-bold text-slate-900 outline-none" />
          </div>

          <div className="space-y-3 bg-blue-50/50 p-6 rounded-[35px] border border-blue-100/50">
            <label className="px-1 text-blue-600 text-[10px] font-black uppercase tracking-widest">ราคาค่าบริการ (฿)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
              className="w-full bg-transparent text-5xl font-black text-blue-600 outline-none placeholder:text-blue-200" />
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving}
          className={`w-full py-6 rounded-[28px] text-lg font-black text-white transition-all shadow-2xl
          ${saving ? 'bg-slate-200' : 'bg-slate-900 shadow-slate-200 active:scale-95'}`}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ ✅'}
        </button>
      </div>
    </div>
  )
}