import { Record } from '@/types'

export default function RecordCard({ record }: { record: Record }) {
  const isWash = record.type === 'wash'
  const time = new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white rounded-[28px] p-5 flex items-center gap-4 border border-slate-50 shadow-sm hover:shadow-md transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
        ${isWash ? 'bg-slate-50 text-slate-900' : 'bg-amber-50 text-amber-600'}`}>
        {isWash ? '🚗' : '✨'}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">INV-{record.seq_number}</span>
        </div>
        <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase leading-none mt-1">
          {record.plate}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1 truncate">
          {record.services.join(' • ')}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xl font-black text-slate-950 tracking-tighter">
          {record.price.toLocaleString()}
          <span className="text-[10px] ml-1 font-bold text-slate-300 italic">THB</span>
        </p>
        <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase">{time}</p>
      </div>
    </div>
  )
}