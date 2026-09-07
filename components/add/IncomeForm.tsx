import { useState, useMemo } from 'react'
import { CAR_TYPES, CAR_BRANDS, RecordType, PaymentStatus } from '@/types'
import { Card, SectionLabel } from './Shared'
import { ServiceTypeButton } from './ServiceTypeButton'
import { WashIcon, PolishIcon } from './Icons'

const QUICK_PICK_LIMIT = 3

export interface IncomeFormProps {
  states: {
    type: RecordType
    plate: string
    selectedType: string
    selectedBrand: string
    customerName: string
    paymentStatus: PaymentStatus
    note: string
    price: string
    visitCount: number
    savedCustomers: string[]
  }
  setters: {
    setType: (v: RecordType) => void
    setPlate: (v: string) => void
    setSelectedType: (v: string | ((prev: string) => string)) => void
    setSelectedBrand: (v: string | ((prev: string) => string)) => void
    setCustomerName: (v: string) => void
    setPaymentStatus: (v: PaymentStatus) => void
    setNote: (v: string) => void
    setPrice: (v: string) => void
  }
}

export function IncomeForm({ states, setters }: IncomeFormProps) {
  const { type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers } = states
  const { setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice } = setters
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [showExtraFields, setShowExtraFields] = useState(false)

  // Quick-pick: top 3 recent customers
  const quickPickNames = useMemo(() => savedCustomers.slice(0, QUICK_PICK_LIMIT), [savedCustomers])

  const filteredBrands = useMemo(
    () => CAR_BRANDS.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())),
    [brandSearch]
  )
  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8)

  return (
    <div className="space-y-4 fade-up" id="income-panel" role="tabpanel">

      {/* ── Service Type ── */}
      <div className="grid grid-cols-2 gap-3">
        <ServiceTypeButton
          active={type === 'wash'}
          onClick={() => setType('wash')}
          icon={<WashIcon />}
          label="ล้างรถ"
          sublabel="บริการทั่วไป"
          color="accent"
        />
        <ServiceTypeButton
          active={type === 'polish'}
          onClick={() => setType('polish')}
          icon={<PolishIcon />}
          label="ขัดสี"
          sublabel="เต็นท์รถ"
          color="amber"
        />
      </div>

      {/* ── Plate + Price ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionLabel required>ป้ายทะเบียน</SectionLabel>
          <div className="relative mt-2">
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="กข 1234"
              className="w-full text-center text-2xl font-extrabold tracking-widest py-4 bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl transition-all uppercase placeholder:font-medium placeholder:text-[var(--text-tertiary)] placeholder:tracking-normal focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.08)]"
              aria-required="true"
              aria-label="ป้ายทะเบียนรถ"
              autoComplete="off"
            />
          </div>
          {visitCount > 0 && (
            <div className="mt-3 bg-[var(--amber-light)] border-2 border-[rgba(245,158,11,0.2)] rounded-xl p-3 flex items-center justify-center gap-2.5 scale-in">
              <span className="text-lg leading-none" aria-hidden="true">🎉</span>
              <p className="text-[14px] font-bold text-[var(--amber)]">
                ลูกค้าประจำ! เข้ามาครั้งที่ <span className="text-base text-[var(--amber)] bg-[var(--surface)] px-2 py-0.5 rounded-lg shadow-sm ml-0.5 font-extrabold">{visitCount + 1}</span>
              </p>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel required>ราคา (บาท)</SectionLabel>
          <div className="relative flex items-center bg-[var(--surface-2)] rounded-xl border-2 border-transparent focus-within:border-[var(--accent)] focus-within:bg-[var(--surface)] transition-all mt-2 h-[64px]">
            <span className="absolute left-4 text-xl font-bold text-[var(--text-tertiary)] select-none" aria-hidden="true">฿</span>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full text-right text-2xl font-extrabold text-[var(--text-primary)] py-3.5 pr-5 bg-transparent placeholder:text-[var(--text-tertiary)] placeholder:opacity-30"
              style={{ paddingLeft: '2.5rem' }}
              aria-required="true"
              aria-label="ราคา"
            />
          </div>
        </Card>
      </div>

      {/* ── Car Type ── */}
      <Card>
        <SectionLabel required>ประเภทรถ</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {CAR_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType((prev: string) => prev === t.id ? '' : t.id)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-150 active:scale-95
                ${selectedType === t.id
                  ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
                }`}
              aria-pressed={selectedType === t.id}
              aria-label={`ประเภท ${t.name}`}
            >
              <span className={`text-[30px] leading-none ${selectedType === t.id ? '' : 'opacity-60'}`}>{t.icon}</span>
              <span className="text-[12px] font-bold tracking-wide truncate w-full text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Car Brand ── */}
      <Card>
        <SectionLabel>ยี่ห้อรถ</SectionLabel>
        <div className="relative mt-2 mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input
            type="text"
            value={brandSearch}
            onChange={e => setBrandSearch(e.target.value)}
            placeholder="ค้นหายี่ห้อ..."
            className="input text-sm !min-h-[44px]"
            style={{ paddingLeft: '2.5rem' }}
            aria-label="ค้นหายี่ห้อรถ"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {displayedBrands.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBrand((prev: string) => prev === b.id ? '' : b.id)}
              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                ${selectedBrand === b.id
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-blue-500/15'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                }`}
              aria-pressed={selectedBrand === b.id}
            >{b.name}</button>
          ))}
        </div>
        {!showAllBrands && filteredBrands.length > 8 && (
          <button type="button" onClick={() => setShowAllBrands(true)} className="mt-3 text-sm font-bold text-[var(--accent)] active:scale-95 transition-transform">
            ดูทั้งหมด ({filteredBrands.length}) →
          </button>
        )}
        {showAllBrands && (
          <button type="button" onClick={() => setShowAllBrands(false)} className="mt-3 text-sm font-bold text-[var(--text-tertiary)]">
            ← แสดงน้อยลง
          </button>
        )}
      </Card>

      {/* ── Payment Status ── */}
      <Card>
        <SectionLabel>สถานะการชำระ</SectionLabel>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => setPaymentStatus('paid')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all duration-150 active:scale-[0.98]
              ${paymentStatus === 'paid'
                ? 'border-[var(--green)] bg-[var(--green-light)] text-[var(--green)] shadow-sm'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
              }`}
            aria-pressed={paymentStatus === 'paid'}
          >✅ ชำระแล้ว</button>
          <button
            type="button"
            onClick={() => setPaymentStatus('unpaid')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all duration-150 active:scale-[0.98]
              ${paymentStatus === 'unpaid'
                ? 'border-[var(--red)] bg-[var(--red-light)] text-[var(--red)] shadow-sm'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
              }`}
            aria-pressed={paymentStatus === 'unpaid'}
          >⏳ ค้างชำระ</button>
        </div>
      </Card>

      {/* ── Quick-Pick Customer + Expandable Extra Fields ── */}
      <Card>
        <SectionLabel>ลูกค้า / เต็นท์</SectionLabel>

        {/* Quick-pick chips — always show top 3 recent names */}
        {quickPickNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1 mb-3">
            {quickPickNames.map((name: string) => (
              <button
                key={name}
                type="button"
                onClick={() => setCustomerName(customerName === name ? '' : name)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                  ${customerName === name
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-blue-500/15'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                aria-pressed={customerName === name}
              >
                <span className="text-base leading-none" aria-hidden="true">👤</span>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Expand button */}
        {!showExtraFields && (
          <button
            type="button"
            onClick={() => setShowExtraFields(true)}
            className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-bold text-[var(--text-tertiary)] transition-all duration-150 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>
            {quickPickNames.length > 0 ? 'พิมพ์ชื่อเอง / เพิ่มหมายเหตุ' : 'เพิ่มชื่อลูกค้า / หมายเหตุ'}
          </button>
        )}

        {/* Expanded fields */}
        {showExtraFields && (
          <div className="space-y-4 fade-up">
            <div>
              <label className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 block">ชื่อลูกค้า / เต็นท์รถ</label>
              <input
                type="text"
                list="saved-customers"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="พิมพ์ชื่อ..."
                className="input"
                autoComplete="off"
                aria-label="ชื่อลูกค้า"
              />
              <datalist id="saved-customers">
                {savedCustomers.map((name: string, i: number) => <option key={i} value={name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 block">หมายเหตุ</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="เช่น ล้างห้องเครื่อง, ขัดไฟหน้า..."
                className="input"
                aria-label="หมายเหตุ"
              />
            </div>
            <button type="button" onClick={() => setShowExtraFields(false)} className="text-sm font-bold text-[var(--text-tertiary)] active:scale-95 transition-transform">
              ▲ ซ่อน
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
