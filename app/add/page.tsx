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
    <div className="min-h-screen bg-[#F0F2F8] page-transition pb-64 font-sarabun text-slate-900">

      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400 mb-2">เพิ่มรายการใหม่</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {isPolish ? 'บันทึกงานขัดสี ✨' : 'บันทึกงานล้างรถ 🧼'}
        </h1>
      </div>

      <div className="px-5 space-y-8 max-w-2xl mx-auto">

        {/* 1. Type Switcher */}
        <div className="flex p-1.5 bg-white border border-slate-200 rounded-[22px] shadow-sm gap-1.5">
          <button
            onClick={() => setType('wash')}
            className={`flex-1 py-4 rounded-[18px] text-base font-black transition-all duration-200
              ${type === 'wash'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600'}`}
          >
            🧼 ล้างรถ
          </button>
          <button
            onClick={() => setType('polish')}
            className={`flex-1 py-4 rounded-[18px] text-base font-black transition-all duration-200
              ${type === 'polish'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'text-slate-400 hover:text-slate-600'}`}
          >
            ✨ ขัดสี
          </button>
        </div>

        {/* 2. License Plate */}
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block">
            เลขทะเบียนรถ
          </label>
          <div className="relative">
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="กข 1234"
              className={`
                w-full bg-white rounded-[22px] px-6 py-6
                text-4xl font-black text-slate-900 outline-none text-center
                border-2 placeholder:text-slate-200
                shadow-sm transition-all duration-200
                focus:shadow-md
                ${plate
                  ? 'border-slate-900 shadow-slate-100'
                  : 'border-slate-200 focus:border-slate-400'}
              `}
            />
          </div>
        </div>

        {/* 3. เลือกประเภทรถ */}
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block">
            เลือกประเภทรถ
          </label>
          <div className="grid gap-2.5">
            {CAR_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`
                  w-full flex items-center justify-between px-5 py-4 rounded-[20px] border-2
                  transition-all duration-200 active:scale-[0.98]
                  ${selectedType === t.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-white border-slate-150 text-slate-600 shadow-sm hover:border-slate-300'}
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-bold text-lg">{t.name}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${selectedType === t.id
                    ? 'border-white bg-white'
                    : 'border-slate-200'}`}
                >
                  {selectedType === t.id && (
                    <svg className="w-3.5 h-3.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. เลือกยี่ห้อรถ */}
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block">
            เลือกยี่ห้อรถ
          </label>
          <div className="grid gap-2 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
            {CAR_BRANDS.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBrand(b.id)}
                className={`
                  w-full flex items-center justify-between px-5 py-4 rounded-[18px] border-2
                  transition-all duration-200 active:scale-[0.98]
                  ${selectedBrand === b.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white border-slate-150 text-slate-500 shadow-sm hover:border-slate-300'}
                `}
              >
                <span className="font-black text-sm uppercase tracking-wide">{b.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${selectedBrand === b.id ? 'border-white bg-white' : 'border-slate-200'}`}
                >
                  {selectedBrand === b.id && (
                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 5. หมายเหตุและราคา */}
        <div className="space-y-4">
          {/* หมายเหตุ */}
          <div className="space-y-3">
            <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block">
              หมายเหตุ (เช่น สีรถ, ขัดโคมไฟ)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="..."
              className="w-full bg-white border-2 border-slate-200 rounded-[18px] px-5 py-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-400 placeholder:text-slate-300 transition-all shadow-sm"
            />
          </div>

          {/* ราคา */}
          <div className={`
            relative rounded-[28px] p-7 text-center border-2 shadow-inner transition-all
            ${isPolish
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'}
          `}>
            <label className={`text-[10px] font-extrabold uppercase tracking-[0.2em] block mb-3
              ${isPolish ? 'text-amber-600' : 'text-blue-600'}`}
            >
              ราคาค่าบริการ (฿)
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className={`
                w-full bg-transparent text-6xl font-black outline-none text-center
                placeholder:opacity-20 transition-all
                ${isPolish ? 'text-amber-600' : 'text-blue-700'}
              `}
            />
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`
            w-full py-6 rounded-[26px] text-xl font-black text-white
            transition-all duration-200 shadow-xl
            ${saving
              ? 'bg-slate-300 shadow-none'
              : isPolish
                ? 'bg-amber-500 shadow-amber-200 active:scale-95 hover:bg-amber-600'
                : 'bg-slate-900 shadow-slate-200 active:scale-95 hover:bg-slate-800'}
          `}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              กำลังบันทึก...
            </span>
          ) : 'บันทึกรายการ ✅'}
        </button>

      </div>
    </div>
  )
}