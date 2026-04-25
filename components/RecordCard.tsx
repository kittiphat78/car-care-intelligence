'use client'

import { memo } from 'react'
import { Record, CAR_TYPES } from '@/types'

const RecordCard = memo(function RecordCard({ record }: { record: Record }) {
  const {
    type, payment_status, created_at, services = [],
    seq_number, plate, customer_name, price,
  } = record

  const isWash = type === 'wash'
  const isPaid = payment_status === 'paid'
  const [serviceName = '', carBrand = '', note = ''] = services

  const time = new Date(created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const carTypeIcon = CAR_TYPES.find(t => t.name === serviceName)?.icon ?? (isWash ? '🧼' : '✨')
  const accentColor = !isPaid ? 'var(--red)' : isWash ? 'var(--accent)' : 'var(--amber)'

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${isWash ? 'ล้างรถ' : 'ขัดสี'} ${plate} ราคา ${price} บาท ${!isPaid ? 'ค้างชำระ' : ''}`}
      className="card bg-white cursor-pointer transition-all duration-150 active:scale-[0.985] overflow-hidden"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.target as HTMLElement).click() } }}
    >
      {/* Accent bar */}
      <div className="h-[3px] w-full" style={{ background: accentColor }} aria-hidden="true" />

      <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
        {/* Icon */}
        <div
          aria-hidden="true"
          className={`w-12 h-12 min-w-[48px] rounded-2xl flex items-center justify-center text-xl shrink-0 ${
            isWash ? 'bg-blue-50' : 'bg-amber-50'
          }`}
        >
          {carTypeIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`badge ${isWash ? 'badge-wash' : 'badge-polish'}`}>{isWash ? 'ล้าง' : 'ขัดสี'}</span>
            {!isPaid && <span className="badge badge-unpaid">ค้างจ่าย</span>}
            <span className="text-[11px] text-[var(--text-tertiary)] font-semibold">#{seq_number}</span>
          </div>
          <p className="font-extrabold text-[var(--text-primary)] text-[17px] tracking-wide leading-tight truncate">
            {plate}
            {carBrand && <span className="ml-2 text-[12px] font-semibold text-[var(--text-secondary)] tracking-normal">{carBrand}</span>}
          </p>
          {customer_name && <p className="text-[12px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">{customer_name}</p>}
          {note && <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate italic">{note}</p>}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className={`text-lg font-extrabold leading-tight ${!isPaid ? 'text-[var(--red)]' : 'text-[var(--text-primary)]'}`}>
            ฿{price.toLocaleString()}
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1 font-medium">{time} น.</p>
        </div>
      </div>
    </article>
  )
})

export default RecordCard