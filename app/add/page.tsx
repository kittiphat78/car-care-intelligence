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
    <div className="min-h-screen bg-[#F4F6F9] page-transition pb-64 font-sarabun text-slate-900">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">เพิ่มรายการใหม่</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {isPolish ? 'บันทึกงานขัดสี ✨' : 'บันทึกงานล้างรถ 🧼'}
        </h1>
      </div>

      <div className="px-5 space-y-10 max-w-2xl mx-auto">
        {/* 1. Type Switcher */}
        <div className="flex p-1.5 bg-white border-2 border-slate-200 rounded-[22px] shadow-sm">
          <button onClick={() => setType('wash')}
            className={`flex-1 py-4 rounded-[18px] text-base font-black transition-all ${type === 'wash' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>
            🧼 ล้างรถ
          </button>
          <button onClick={() => setType('polish')}
            className={`flex-1 py-4 rounded-[18px] text-base font-black transition-all ${type === 'polish' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400'}`}>
            ✨ ขัดสี
          </button>
        </div>

        {/* 2. License Plate */}
        <div className="space-y-4">
          <label className="px-2 text-sm font-bold uppercase tracking-wider text-slate-700">
            เลขทะเบียนรถ
          </label>
          <input 
            type="text" 
            value={plate} 
            onChange={e => setPlate(e.target.value.toUpperCase())} 
            placeholder="กข 1234"
            className="w-full bg-white border-2 border-slate-300 rounded-[24px] px-6 py-6 text-4xl font-black text-slate-900 outline-none shadow-sm placeholder:text-slate-300 text-center focus:border-blue-500 transition-all" 
          />
        </div>

        {/* 3. เลือกประเภทรถ (ลิสต์แนวตั้ง) */}
        <div className="space-y-4">
          <label className="px-2 text-sm font-bold uppercase tracking-wider text-slate-700">เลือกประเภทรถ</label>
          <div className="grid gap-3">
            {CAR_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t.id)}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-[22px] border-2 transition-all active:scale-[0.98]
                ${selectedType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{t.icon}</span>
                  <span className="font-bold text-xl">{t.name}</span>
                </div>
                {selectedType === t.id && <span className="text-blue-400 font-black text-2xl">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 4. เลือกยี่ห้อรถ (ลิสต์แนวตั้งยาวลงมา) */}
        <div className="space-y-4">
          <label className="px-2 text-sm font-bold uppercase tracking-wider text-slate-700">เลือกยี่ห้อรถ</label>
          <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar rounded-[25px]">
            {CAR_BRANDS.map(b => (
              <button key={b.id} onClick={() => setSelectedBrand(b.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-[20px] border-2 transition-all active:scale-[0.98]
                ${selectedBrand === b.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>
                <span className="font-black text-base uppercase tracking-wide">{b.name}</span>
                {selectedBrand === b.id && <span className="text-white font-black text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 5. หมายเหตุและราคา */}
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="px-2 text-sm font-bold uppercase tracking-wider text-slate-700">หมายเหตุ (เช่น สีรถ, ขัดโคมไฟ)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="..."
              className="w-full bg-white border-2 border-slate-200 rounded-[22px] px-6 py-5 text-lg font-bold text-slate-900 outline-none focus:border-slate-400 placeholder:text-slate-300" />
          </div>

          <div className="bg-blue-50 p-8 rounded-[40px] border-2 border-blue-200 shadow-inner text-center">
            <label className="text-blue-700 text-sm font-black uppercase tracking-widest mb-2 block">ราคาค่าบริการ (฿)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
              className="w-full bg-transparent text-6xl font-black text-blue-700 outline-none placeholder:text-blue-200 text-center" />
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button onClick={handleSubmit} disabled={saving}
          className={`w-full py-7 rounded-[30px] text-2xl font-black text-white transition-all shadow-2xl
          ${saving ? 'bg-slate-300' : 'bg-slate-900 shadow-slate-300 active:scale-95'}`}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ ✅'}
        </button>
      </div>
    </div>
  )
}