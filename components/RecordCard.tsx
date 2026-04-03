import { Record, CAR_TYPES } from '@/types'

export default function RecordCard({ record }: { record: Record }) {
  const isWash = record.type === 'wash'
  const isPaid = record.payment_status === 'paid'
  const time   = new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  const carTypeIcon = CAR_TYPES.find(t => t.name === record.services[0])?.icon ?? (isWash ? '🧼' : '✨')
  const carBrand    = record.services[1] ?? ''
  const note        = record.services[2] ?? ''

  return (
    <div className={`
      card bg-white group cursor-pointer
      transition-all duration-150
      hover:shadow-[var(--shadow-md)] hover:-translate-y-px
      active:scale-[0.985] active:shadow-none
      border-l-[3px]
      ${isPaid
        ? isWash ? 'border-l-blue-400' : 'border-l-amber-400'
        : 'border-l-red-400'}
    `}>
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Icon */}
        <div className={`
          w-10 h-10 min-w-[40px] rounded-[10px] flex items-center justify-center text-lg shrink-0
          ${isWash ? 'bg-blue-50' : 'bg-amber-50'}
        `}>
          {carTypeIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`badge ${isWash ? 'badge-wash' : 'badge-polish'}`}>
              {isWash ? 'ล้าง' : 'ขัดสี'}
            </span>
            {!isPaid && (
              <span className="badge badge-unpaid">ค้างจ่าย</span>
            )}
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              #{record.seq_number}
            </span>
          </div>

          <p className="font-bold text-[var(--text-primary)] text-base tracking-wide leading-tight">
            {record.plate}
            {carBrand && (
              <span className="ml-2 text-[11px] font-medium text-[var(--text-secondary)] tracking-normal">
                {carBrand}
              </span>
            )}
          </p>

          {record.customer_name && (
            <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
              {record.customer_name}
            </p>
          )}
          {note && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate italic">
              {note}
            </p>
          )}
        </div>

        {/* Price + Time */}
        <div className="text-right shrink-0">
          <p className={`text-base font-bold leading-tight ${
            !isPaid ? 'text-[var(--red)]' : 'text-[var(--text-primary)]'
          }`}>
            ฿{record.price.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            {time} น.
          </p>
        </div>

      </div>
    </div>
  )
}