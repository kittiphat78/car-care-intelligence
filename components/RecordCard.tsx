'use client'
import { Record, CAR_TYPES } from '@/types'

export default function RecordCard({ record }: { record: Record }) {
  const isWash = record.type === 'wash'
  const time = new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  // 1. ดึง Icon ตามประเภทรถ (เช่น 🚗, 🚙) จาก CAR_TYPES โดยเทียบกับชื่อใน services[0]
  const carTypeIcon = CAR_TYPES.find(t => t.name === record.services[0])?.icon || (isWash ? '🚿' : '✨')
  
  // 2. แยกข้อมูลจาก Services [ประเภทรถ, ยี่ห้อรถ, หมายเหตุ]
  const brandName = record.services[1] || ''
  const note = record.services[2] || ''

  return (
    <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-[0.97] transition-all duration-200 group">

      {/* Icon: แสดงตามประเภทรถที่เลือกจริง */}
      <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center text-2xl shrink-0 transition-colors
        ${isWash ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
        {carTypeIcon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg
            ${isWash ? 'bg-blue-50 text-blue-400' : 'bg-amber-50 text-amber-400'}`}>
            {isWash ? 'Wash' : 'Polish'}
          </span>
          <span className="text-[10px] font-black text-slate-200 tracking-wider">
            #{record.seq_number}
          </span>
        </div>

        {/* แสดงป้ายทะเบียนตัวใหญ่ */}
        <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase leading-none mb-1">
          {record.plate}
        </h3>

        {/* แสดงยี่ห้อรถ + หมายเหตุ (ถ้ามี) */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {brandName && (
            <span className="text-[11px] font-black text-slate-500 uppercase shrink-0">
              {brandName}
            </span>
          )}
          {note && (
            <>
              <span className="text-slate-200 text-[10px]">•</span>
              <p className="text-[10px] text-slate-400 font-bold truncate">
                {note}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Price + Time */}
      <div className="text-right shrink-0">
        <p className={`text-xl font-black tracking-tighter leading-none ${isWash ? 'text-slate-900' : 'text-amber-500'}`}>
          ฿{record.price.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold text-slate-300 mt-1.5">{time}</p>
      </div>

    </div>
  )
}