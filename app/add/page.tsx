'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, WASH_SERVICES, POLISH_SERVICES } from '@/types'

export default function AddPage() {
  const router = useRouter()
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [customPrice, setCustomPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const services = type === 'wash' ? WASH_SERVICES : POLISH_SERVICES
  const isPolish = type === 'polish'

  const autoPrice = WASH_SERVICES
    .filter(s => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0)

  const finalPrice = isPolish ? parseInt(customPrice || '0') : autoPrice

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (!plate.trim()) { alert('⚠️ กรุณากรอกป้ายทะเบียน'); return }
    if (selectedServices.length === 0) { alert('⚠️ กรุณาเลือกบริการ'); return }
    if (finalPrice <= 0 && isPolish) { alert('⚠️ กรุณากรอกราคา'); return }

    setSaving(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    const serviceNames = services
      .filter(s => selectedServices.includes(s.id))
      .map(s => s.name)

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services: serviceNames,
      price: finalPrice,
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
    <div className="min-h-screen bg-[#FDFDFD] page-transition pb-32">
      {/* Dynamic Header */}
      <div className="px-8 pt-16 pb-10">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">New Entry</p>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
          {isPolish ? 'Polishing' : 'Car Wash'}
        </h1>
      </div>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        
        {/* 1. Category Switcher - หรูหราแบบ Minimal */}
        <div className="flex p-1.5 bg-slate-100 rounded-[24px]">
          <button 
            onClick={() => { setType('wash'); setSelectedServices([]); }}
            className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all duration-300
            ${type === 'wash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            WASH 🚗
          </button>
          <button 
            onClick={() => { setType('polish'); setSelectedServices([]); }}
            className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all duration-300
            ${type === 'polish' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            POLISH ✨
          </button>
        </div>

        {/* 2. License Plate - ออกแบบช่องกรอกให้ดูพรีเมียม */}
        <div className="space-y-3">
          <label className="px-1 text-slate-400 text-[10px] font-black uppercase tracking-widest">License Plate</label>
          <input
            type="text"
            value={plate}
            onChange={e => setPlate(e.target.value.toUpperCase())}
            placeholder="กข 1234"
            className="w-full bg-slate-50 border-none rounded-[30px] px-8 py-6 text-3xl font-black text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none tracking-tight"
          />
        </div>

        {/* 3. Services Selection - Card List แบบสะอาดตา */}
        <div className="space-y-4">
          <label className="px-1 text-slate-400 text-[10px] font-black uppercase tracking-widest">Select Services</label>
          <div className="grid gap-3">
            {services.map(svc => {
              const active = selectedServices.includes(svc.id)
              return (
                <button 
                  key={svc.id} 
                  onClick={() => toggleService(svc.id)}
                  className={`w-full flex items-center justify-between px-8 py-6 rounded-[28px] transition-all duration-300 border
                  ${active 
                    ? 'bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-200 scale-[1.02]' 
                    : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  <span className="text-lg font-black tracking-tight">{svc.name}</span>
                  {svc.price > 0 && <span className={`font-bold ${active ? 'text-blue-400' : 'text-slate-300'}`}>฿{svc.price}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 4. Custom Price for Polish */}
        {isPolish && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <label className="px-1 text-slate-400 text-[10px] font-black uppercase tracking-widest text-amber-600">Service Fee (THB)</label>
            <input
              type="number"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-amber-50/50 border-2 border-amber-100 rounded-[30px] px-8 py-6 text-4xl font-black text-slate-900 focus:border-amber-400 transition-all outline-none"
            />
          </div>
        )}

        {/* 5. Final Checkout Button */}
        <div className="pt-6">
          {!isPolish && finalPrice > 0 && (
            <div className="flex justify-between items-end px-4 mb-6">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Amount</span>
              <span className="text-4xl font-black text-slate-900 tracking-tighter">฿{finalPrice.toLocaleString()}</span>
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`w-full py-7 rounded-[35px] text-lg font-black transition-all duration-300 active:scale-95 shadow-2xl
              ${saving 
                ? 'bg-slate-200 text-slate-400' 
                : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
          >
            {saving ? 'PROCESSING...' : 'CONFIRM TRANSACTION ✅'}
          </button>
        </div>

      </div>
    </div>
  )
}