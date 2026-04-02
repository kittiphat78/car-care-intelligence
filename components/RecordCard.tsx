import { Record, CAR_TYPES } from '@/types'

export default function RecordCard({ record }: { record: Record }) {
  const isWash = record.type === 'wash'
  const isPaid = record.payment_status === 'paid'
  const time   = new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  const carTypeIcon = CAR_TYPES.find(t => t.name === record.services[0])?.icon ?? (isWash ? '🧼' : '✨')
  const note        = record.services[1] ?? ''

  return (
    <div className={`
      relative bg-white rounded-[20px] overflow-hidden
      border transition-all duration-200 active:scale-[0.975]
      shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]
      ${isWash
        ? 'border-slate-100 hover:border-blue-100 hover:shadow-[0_4px_16px_rgba(37,99,235,0.08)]'
        : 'border-amber-50 hover:border-amber-100 hover:shadow-[0_4px_16px_rgba(217,119,6,0.08)]'}
    `}>

      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px]
        ${isPaid
          ? isWash ? 'bg-blue-400' : 'bg-amber-400'
          : 'bg-rose-400'}`}
      />

      <div className="flex items-center gap-3 px-4 py-3.5 pl-5">

        {/* Icon */}
        <div className={`
          w-11 h-11 min-w-[44px] rounded-[14px] flex items-center justify-center text-xl shrink-0
          ${isWash
            ? 'bg-gradient-to-br from-blue-50 to-blue-100/50'
            : 'bg-gradient-to-br from-amber-50 to-amber-100/50'}
        `}>
          {carTypeIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`badge ${isWash ? 'badge-wash' : 'badge-polish'}`}>
              {isWash ? 'Wash' : 'Polish'}
            </span>
            {!isPaid && (
              <span className="badge badge-unpaid">ค้างจ่าย ⏳</span>
            )}
            <span className="text-[9px] font-bold text-slate-300 tracking-wider">
              #{record.seq_number}
            </span>
          </div>

          {/* Plate */}
          <h3 className="font-extrabold text-slate-900 text-[17px] tracking-tight uppercase leading-tight mb-0.5">
            {record.plate}
          </h3>

          {/* Customer name */}
          {record.customer_name && (
            <p className="text-[10px] font-bold text-blue-500 uppercase truncate leading-none mb-0.5">
              📍 {record.customer_name}
            </p>
          )}

          {/* Note */}
          {note && (
            <p className="text-[10px] text-slate-400 font-medium truncate italic leading-none">
              {note}
            </p>
          )}
        </div>

        {/* Price + Time */}
        <div className="text-right shrink-0 pl-1">
          <p className={`text-[19px] font-extrabold tracking-tight leading-none
            ${!isPaid ? 'text-rose-500' : isWash ? 'text-slate-900' : 'text-amber-500'}`}>
            ฿{record.price.toLocaleString()}
          </p>

          <div className={`
            inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg
            ${isWash ? 'bg-slate-50' : 'bg-amber-50/50'}
          `}>
            <svg className="w-2.5 h-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
            <span className="text-[9px] font-bold text-slate-400">{time} น.</span>
          </div>
        </div>

      </div>
    </div>
  )
}