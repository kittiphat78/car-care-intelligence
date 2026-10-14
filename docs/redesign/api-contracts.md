# API Contracts — Step 05

> วันที่: 2026-10-14 · ระบบไม่มี backend API ของตัวเองสำหรับข้อมูลธุรกิจ (ADR-02) "API" คือ (1) ฟังก์ชัน data access ใน `features/*/api.ts` (2) PostgREST + RPC ของ Supabase และ (3) Route Handler 1 ตัว
> **Server Actions: ไม่ใช้ใน MVP** (ADR-02) · Route Handlers เดิม 2 ตัว: ลบเมื่อ Q-12 อนุมัติ

## 0. Conventions

| เรื่อง | กติกา |
|---|---|
| ผลลัพธ์ | ทุกฟังก์ชันคืน `Promise<Result<T>>` (`architecture.md` §7.1) และไม่ throw |
| วันที่ | input เป็น `YYYY-MM-DD` (เวลาไทย) หรือ ISO มี offset และ output เป็น ISO UTC จาก DB |
| เงิน | จำนวนเต็มบาท |
| Pagination | `fetchAllPages(build, { pageSize: 1000, expectedCount? })` คืนครบหรือ `ROW_LIMIT` |
| Timeout | 15 วินาที (AbortController) |
| Idempotency | การสร้างทุกครั้งมี `clientRequestId` (uuid ต่อ "ความตั้งใจบันทึก 1 ครั้ง" และใช้ซ้ำเมื่อกดลองใหม่) |

## 1. Records (`features/records/api.ts`)

| ฟังก์ชัน | Input | Supabase call | Output | Errors ที่คาด |
|---|---|---|---|---|
| `createIncome(input: IncomeInput)` | ตาม `incomeInput` | `insert` `records` ด้วย `{ type, plate, services: [carType, brand ?? '', note ?? ''], price, customer_name, payment_status, payment_method:'cash', job_status:'done', created_at: toBangkokTimestamp(occurredOn, now), client_request_id }` → `.select().single()` | `IncomeRecord` | `VALIDATION`, `DUPLICATE`→สำเร็จ (ดึงแถวเดิมด้วย `client_request_id`), `AUTH_EXPIRED`, `FORBIDDEN`, `NETWORK`, `TIMEOUT` |
| `createExpense(input)` | `expenseInput` | `insert` `expenses` | `ExpenseRecord` | เหมือนกัน |
| `updateRecord(id, patch, expectedUpdatedAt)` | `incomePatch` (เฉพาะ field ที่เปลี่ยน) | `update(...).eq('id', id).<updated_at match>` (`.is('updated_at', null)` ถ้าเดิมเป็น null) → `.select()` | `IncomeRecord` | `CONFLICT` (0 แถว แต่ id ยังอยู่), `NOT_FOUND`, `VALIDATION` |
| `updateExpense(id, patch, expectedUpdatedAt)` | `expensePatch` | เหมือนกัน | `ExpenseRecord` | เหมือนกัน |
| `deleteRecord(kind, id)` | — | `delete().eq('id', id).select('id')` | `{ deleted: boolean }` | `NOT_FOUND` (0 แถว) |
| `getRecord(kind, id)` | — | `select('*').eq('id', id).maybeSingle()` | `IncomeRecord \| ExpenseRecord \| null` | — |
| `listIncomeBetween(fromDay, toDay)` | วันไทย | `select('*').gte(created_at, startOfBangkokDay(from)).lt(..., startOfBangkokDay(to+1)).order('created_at', {ascending:false})` ผ่าน `fetchAllPages` | `IncomeRecord[]` | `ROW_LIMIT` |
| `listExpensesBetween(fromDay, toDay)` | เหมือนกัน | เหมือนกัน | `ExpenseRecord[]` | |
| `countVisitsByPlate(plate)` | ≥ 3 ตัวอักษร | `select('id', {count:'exact', head:true}).eq('plate', plate.toUpperCase())` | `number` | ล้มเหลวแบบเงียบ (คืน 0 และไม่แสดง error ตาม FR-REC-06) |

**ER-01 fix (กติกาของ `occurredAt` ในหน้าแก้ไข):** ฟอร์มแยก `date`/`time` ด้วย `lib/time/bangkok.ts#splitBangkok(iso)` (ใช้ `Intl.DateTimeFormat` timeZone `Asia/Bangkok` ทั้งวันและเวลา) และรวมด้วย `joinBangkok(date, time)` → `YYYY-MM-DDTHH:mm:00+07:00` และส่ง `created_at` **เฉพาะเมื่อผู้ใช้เปลี่ยน date/time**

## 2. Debts (`features/debts/api.ts`)

| ฟังก์ชัน | Supabase call | Output |
|---|---|---|
| `listUnpaid()` | `records` `.eq('payment_status','unpaid').order('created_at')` ผ่าน `fetchAllPages` | `IncomeRecord[]` → `groupDebts()` (pure, `customerKey` = trim/null→'') |
| `getDebtSummary()` | `rpc('debt_summary')` | `{ customerKey, displayName, items, total, oldestAt }[]` (badge, การ์ด dashboard) |
| `settle(ids: string[])` | `rpc('settle_records', { p_ids: ids })` | `{ updatedCount, total }` และ UI เทียบกับจำนวนที่ยืนยัน (UF-DEBT-02) |
| `issueBill(customerKey, ids)` | (Q-05 = b) `rpc('issue_bill', …)` / ค่าเริ่มต้น: localStorage เดิม | `{ billNo }` |

## 3. Dashboard (`features/dashboard/api.ts`)

| ฟังก์ชัน | RPC | Output |
|---|---|---|
| `getToday(day?)` | `dashboard_today(p_day)` | `{ totalIncome, paidIncome, unpaidIncome, expense, washCount, polishCount, yesterdayIncome }` → `netCash = paidIncome − expense`, `pct` (สูตรเดิม D-02, D-13) |
| `getDailySeries(days: 7 \| 30)` | `daily_series(today-days+1, today)` | `{ day, income, expense }[]` (มีทุกวัน รวมวันที่เป็น 0) |
| `getCustomerBreakdown()` | `customer_breakdown(today)` | ตามรูปเดิม `CustomerBreakdownItem[]` และ Top 4 + ลูกค้าทั่วไป ทำใน `logic.ts` (D-04) |

### 3.1 RPC signatures (SQL)

| RPC | Params | Returns | Security |
|---|---|---|---|
| `dashboard_today` | `p_day date default bangkok_today()` | 1 แถว | invoker, `stable` |
| `daily_series` | `p_from date, p_to date` (≤ 366 วัน) | `setof (day date, income int, expense int)` | invoker, `stable` |
| `debt_summary` | — | `setof (customer_key text, items int, total int, oldest_at timestamptz)` | invoker, `stable` |
| `customer_breakdown` | `p_ref date` | `setof (customer_key text, period text /* week|month|year */, wash_count int, wash_amount int, polish_count int, polish_amount int, total int)` | invoker, `stable` |
| `period_summary` | `p_from date, p_to date` | 1 แถว (income, expense, wash_count, wash_amount, polish_count, polish_amount, record_count, expense_count) | invoker, `stable` |
| `settle_records` | `p_ids uuid[]` (≤ 500) | `(updated_count int, total int)` | invoker, `volatile` |

ทุก RPC: `revoke execute from public, anon` + `grant execute to authenticated` และ `set search_path = ''`
นิยามขอบเขตเวลา: วัน = `(created_at at time zone 'Asia/Bangkok')::date` · สัปดาห์เริ่มวันจันทร์ (คงเดิม `getStartOfWeek`) · เดือน/ปี ตามปฏิทินไทย (ค.ศ. ใน DB)

## 4. History & Export (`features/history/api.ts`)

| ฟังก์ชัน | Calls | หมายเหตุ |
|---|---|---|
| `getMonth(year, month)` (month 0 = ทั้งปี) | `listIncomeBetween` + `listExpensesBetween` + `period_summary` | summary มาจาก RPC (ไม่รวมเองบน client) และรายการสำหรับแสดงหรือกรอง |
| `exportRange(fromMonth, toMonth)` | `period_summary` (ได้ `record_count`, `expense_count`) → `fetchAllPages` ทั้งสองตารางด้วย `expectedCount` | ถ้า count ไม่ตรงหรือ error หน้าใดหน้าหนึ่ง: ไม่สร้างไฟล์ (FR-EXP-02/03) |

## 5. Auth (`features/auth/api.ts`)

| ฟังก์ชัน | Call | Output |
|---|---|---|
| `signIn(email, password)` | `auth.signInWithPassword` | `Result<{ userId }>` และ map error: `invalid_credentials` → `VALIDATION`, `over_request_rate_limit` → `SERVER` (ข้อความ rate limit) |
| `signOut()` | `auth.signOut({ scope: 'local' })` | ล้าง draft ก่อนเสมอ |
| `getMembership()` | `select role from app_members where user_id = auth.uid()` | `null` = ไม่ใช่สมาชิก แล้วแสดงข้อความ "ยังไม่ได้รับสิทธิ์" |

## 6. Route Handler

### `POST /api/client-errors`
| | |
|---|---|
| Auth | ต้องมี session (ตรวจด้วย `getUser()`) มิฉะนั้น 401 |
| Request | `Content-Type: application/json`, ≤ 4KB, ตรวจ `Origin` = host |
| Body (Zod) | `{ code: AppErrorCode, ref: string(8), route: string(≤100), message: string(≤300), appVersion: string, userAgent?: string(≤200), at: ISO }` |
| Response | `204` (สำเร็จ), `400` (body ผิด), `401`, `413` (ใหญ่เกิน) |
| Side effect | `console.log(JSON.stringify({ level:'error', source:'client', userIdHash, ...body }))` ไม่เก็บ DB |
| ห้าม | ส่งหรือ log อีเมล, ทะเบียน, ชื่อลูกค้า หรือยอดเงิน |

### Route Handlers ที่จะลบ (Q-12)
| Route | เหตุผล |
|---|---|
| `POST /api/insights` | ไม่มี caller ตั้งแต่ `089b2c6`, ใช้ secret ภายนอก และ rate limit ไม่มีผลบน serverless |
| `GET /api/export-excel` | stub คืนข้อมูลจำลอง |

## 7. Realtime Contract

| Channel | Event | Handler |
|---|---|---|
| `app-data` (1 ต่อ AppShell) | `postgres_changes` `*` บน `public.records` | debounce 500ms → `refreshToday()`, `refreshDebtSummary()` และถ้าอยู่ `/history` เดือนปัจจุบัน → refresh list |
| เหมือนกัน | `postgres_changes` `*` บน `public.expenses` | `refreshToday()` |
| สถานะ channel | `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` | StatusBar `realtime-lost` + reconnect อัตโนมัติ (ของ supabase-js) |

## 8. External

| บริการ | Contract | Failure |
|---|---|---|
| Open-Meteo forecast + air quality | คง URL/params เดิม (`useWeather.ts:256-266`) และพิกัดหรือชื่อพื้นที่จาก env | ซ่อนแถบอากาศ (AC-19-2) |
