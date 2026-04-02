'use client'
import { Record, CAR_TYPES } from '@/types'

export default function RecordCard({ record }: { record: Record }) {
  const isWash = record.type === 'wash'
  const isPaid = record.payment_status === 'paid'
  const time = new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  // 1. ดึง Icon ตามประเภทรถ (เทียบจาก services[0] ที่บันทึกไว้)
  const carTypeIcon = CAR_TYPES.find(t => t.name === record.services[0])?.icon || (isWash ? '🧼' : '✨')

  // 2. แยกข้อมูลจาก Services [ประเภทรถ, ยี่ห้อรถ, หมายเหตุ]
  const brandName = record.services[1] || ''
  const note = record.services[2] || ''

  return (
    <div className={`
      relative bg-white rounded-[22px] p-4 flex items-center gap-4
      border shadow-sm
      active:scale-[0.97] transition-all duration-200
      overflow-hidden
      ${isWash
        ? 'border-blue-50 hover:border-blue-100'
        : 'border-amber-50 hover:border-amber-100'}
    `}>

      {/* ✅ แถบสถานะการจ่ายเงิน (เขียว = จ่ายแล้ว, แดง = ค้างชำระ) */}
      <div className={`
        absolute left-0 top-0 bottom-0 w-[5px] 
        ${isPaid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}
      `} />

      {/* Icon ประเภทรถ */}
      <div className={`
        w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl flex items-center justify-center text-2xl shrink-0
        ${isWash
          ? 'bg-gradient-to-br from-blue-50 to-blue-100/60'
          : 'bg-gradient-to-br from-amber-50 to-amber-100/60'}
      `}>
        {carTypeIcon}
      </div>

      {/* ข้อมูลรถและลูกค้า */}
      <div className="flex-1 min-w-0 pl-0.5">
        <div className="flex items-center gap-2 mb-1">
          {/* Badge ประเภทงาน */}
          <span className={`
            text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg
            ${isWash
              ? 'bg-blue-50 text-blue-500 border border-blue-100'
              : 'bg-amber-50 text-amber-500 border border-amber-100'}
          `}>
            {isWash ? 'Wash' : 'Polish'}
          </span>

          {/* ✅ Badge สถานะการเงิน (ถ้าค้างชำระจะโชว์เด่นขึ้นมา) */}
          {!isPaid && (
            <span className="text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-lg uppercase">
              ค้างจ่าย ⏳
            </span>
          )}
          
          <span className="text-[10px] font-black text-slate-300 tracking-wider">
            #{record.seq_number}
          </span>
        </div>

        {/* ทะเบียนรถ */}
        <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase leading-none mb-1">
          {record.plate}
        </h3>

        {/* ✅ ชื่อเต็นท์รถ / ลูกค้า (ถ้ามี) */}
        {record.customer_name && (
          <p className="text-[11px] font-black text-blue-600 uppercase mb-1 truncate">
            📍 {record.customer_name}
          </p>
        )}

        {/* ยี่ห้อ + หมายเหตุ */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {brandName && (
            <span className="text-[11px] font-black text-slate-400 uppercase shrink-0">
              {brandName}
            </span>
          )}
          {note && (
            <>
              <span className="text-slate-200 text-[10px]">•</span>
              <p className="text-[10px] text-slate-400 font-semibold truncate italic">
                {note}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ราคา + เวลา */}
      <div className="text-right shrink-0 pl-2">
        <p className={`
          text-xl font-black tracking-tighter leading-none 
          ${!isPaid ? 'text-rose-600' : isWash ? 'text-slate-900' : 'text-amber-500'}
        `}>
          ฿{record.price.toLocaleString()}
        </p>
        
        <div className={`
          inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg
          ${isWash ? 'bg-slate-50' : 'bg-amber-50/60'}
        `}>
          <svg className="w-2.5 h-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="text-[10px] font-bold text-slate-400">{time}</p>
        </div>
      </div>

    </div>
  )
}