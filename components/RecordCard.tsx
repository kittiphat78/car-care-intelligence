'use client'

import { memo } from 'react'
import { Record, CAR_TYPES } from '@/types'

// ✅ ใช้ React.memo เพื่อป้องกันการ Re-render ซ้ำซ้อนเมื่ออยู่ใน List ยาวๆ
const RecordCard = memo(function RecordCard({ record }: { record: Record }) {
  // 🛡️ Safe Destructuring & Default Values ป้องกันค่า undefined
  const { 
    type, 
    payment_status, 
    created_at, 
    services = [], 
    seq_number, 
    plate, 
    customer_name, 
    price 
  } = record

  const isWash = type === 'wash'
  const isPaid = payment_status === 'paid'

  // แยกค่าใน services อย่างปลอดภัย เผื่อกรณีข้อมูลเก่าใน DB มี Array ไม่ครบ
  const [serviceName = '', carBrand = '', note = ''] = services

  const time = new Date(created_at).toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  const carTypeIcon = CAR_TYPES.find(t => t.name === serviceName)?.icon ?? (isWash ? '🧼' : '✨')

  // 🎨 แยก Class Logic ออกมาให้ดูสะอาดตา
  const borderClass = !isPaid 
    ? 'border-l-red-400' 
    : isWash 
      ? 'border-l-blue-400' 
      : 'border-l-amber-400'

  const iconBgClass = isWash ? 'bg-blue-50' : 'bg-amber-50'

  return (
    <article 
      className={`
        card bg-white group cursor-pointer transition-all duration-150 
        hover:shadow-[var(--shadow-md)] hover:-translate-y-px 
        active:scale-[0.985] active:shadow-none border-l-[3px] 
        ${borderClass}
      `}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* ── Icon ── */}
        <div 
          aria-hidden="true"
          className={`w-10 h-10 min-w-[40px] rounded-[10px] flex items-center justify-center text-lg shrink-0 ${iconBgClass}`}
        >
          {carTypeIcon}
        </div>

        {/* ── Info ── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`badge ${isWash ? 'badge-wash' : 'badge-polish'}`}>
              {isWash ? 'ล้าง' : 'ขัดสี'}
            </span>
            
            {!isPaid && (
              <span className="badge badge-unpaid">ค้างจ่าย</span>
            )}
            
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              #{seq_number}
            </span>
          </div>

          <p className="font-bold text-[var(--text-primary)] text-base tracking-wide leading-tight truncate">
            {plate}
            {carBrand && (
              <span className="ml-2 text-[11px] font-medium text-[var(--text-secondary)] tracking-normal">
                {carBrand}
              </span>
            )}
          </p>

          {customer_name && (
            <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
              {customer_name}
            </p>
          )}
          
          {note && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate italic">
              {note}
            </p>
          )}
        </div>

        {/* ── Price + Time ── */}
        <div className="text-right shrink-0">
          <p className={`text-base font-bold leading-tight ${!isPaid ? 'text-[var(--red)]' : 'text-[var(--text-primary)]'}`}>
            ฿{price.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            {time} น.
          </p>
        </div>

      </div>
    </article>
  )
})

export default RecordCard