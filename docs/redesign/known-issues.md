# Known Issues & Technical Debt (v2.1.0)

> Step 12 · 2026-10-20 · ตรวจกับโค้ดที่ `v2.1.0` (`8465548`) และ `develop` · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> รายการนี้แทนที่ `technical-debt.md` (Step 01) และหมวด known issues ใน release notes สำหรับการทำงานต่อ · ไฟล์เดิมเก็บเป็นประวัติ
> ระดับ: **High** กระทบความปลอดภัย/ข้อมูล · **Medium** กระทบการใช้งาน · **Low** สะดวกน้อยลงหรือดูแลยากขึ้น

## 1. ปัญหาที่ผู้ใช้อาจเจอ

| ID | เรื่อง | ระดับ | ผลต่อผู้ใช้ | สถานะ / แผน |
|---|---|---|---|---|
| K-01 | **D-08** พิมพ์หรือแตะก่อนหน้าพร้อม: ช่องแรกที่พิมพ์ทันทีหลังเปิด `/add` ใหม่ทั้งหน้า (เช่นจากทางลัดไอคอนแอป) ถูกล้าง · ปุ่มที่แตะเร็วเกินไม่ทำงาน | Medium | ต้องพิมพ์หรือแตะใหม่ · ไม่มีข้อมูลผิดเข้าฐานข้อมูล | **ข้อความหาย: แก้แล้วใน `develop`** (PR #51, `a25d24a`) · **ยังอยู่บน production** จนกว่าจะ release ครั้งถัดไป [V] · ปุ่มที่แตะก่อนพร้อมยังไม่ทำงาน (ไม่แก้: React รับการแตะก่อนโหลด JavaScript ไม่ได้) |
| K-02 | iPhone: Safari ไม่รองรับ `interactive-widget` คีย์บอร์ดอาจบังปุ่มบันทึก (S03-05) | Medium | อาจต้องเลื่อนหาปุ่ม | [U] ยังไม่ได้ดูบนเครื่องจริง |
| K-03 | หน้าประวัติ LCP 5.2 s และค้างชำระ 3.0 s บนมือถือช้า + slow 4G (lab) เกินเป้า 2.5 s · ประวัติโหลดข้อมูลทั้งปี (~401 KB) แม้ดูเดือนเดียว | Medium | รอนานบนเน็ตช้า | R-P1, R-P10 ใน `performance-audit.md` (แนะนำ: โหลดเฉพาะเดือนที่ดู) |
| K-04 | วันฝนตก แถบ "มีโอกาสฝน" แทรกเหนือการ์ด ทำให้การ์ดเลื่อน (CLS +0.087 วัดก่อน O-08) | Low | การ์ดขยับตอนโหลด | R-P8 |
| K-05 | เปิด dialog แก้ไขในประวัติช้าขึ้น 24 ms หลัง Step 09 | Low | แทบไม่รู้สึก | R-P9 · ยังไม่หาสาเหตุ |
| K-06 | ยังไม่ได้ทดสอบบน iPhone จริง: บิล PDF, กล่องเซสชันหมดอายุตอนหมดจริง, สีช่องตอน autofill (S07-41) | Medium | ไม่ทราบ | ทดสอบด้วย WebKit ของ Playwright แทนเท่านั้น |
| K-07 | Realtime ปิดบน production: หน้าภาพรวมไม่อัปเดตเองเมื่ออีกเครื่องบันทึก | Low | กด "อัปเดต" หรือเปิดหน้าใหม่ | เปิด publication ใน Supabase + ทดสอบ RLS ของ event ถ้าต้องการ |
| K-08 | ลบรายการแล้วกู้ไม่ได้ในแอป (hard delete, ไม่มีถังขยะ/ประวัติการลบ) | Medium | ลบผิดต้องกู้จาก backup | ต้องตัดสินใจ (Q-02 soft delete) |
| K-09 | ช่องวันที่/เวลาแสดงตามภาษาของเครื่อง (ค.ศ./12 ชม. บางเครื่อง) · ข้อความใต้ช่องแสดง พ.ศ. เสมอ | Low | อาจสับสน | ตามสเปก (native input) |
| K-10 | `fetchAllPages` แบบ offset อาจได้แถวซ้ำ 1 แถวถ้ามีการบันทึกระหว่างโหลดหลายหน้า (S07-15) | Low | ประวัติ/Excel อาจมีแถวซ้ำชั่วคราว | เปลี่ยนเป็น keyset pagination หรือ RPC |

## 2. ความปลอดภัยและการดูแลระบบ

| ID | เรื่อง | ระดับ | สถานะ |
|---|---|---|---|
| K-11 | **D-07 ติดตามผล:** รหัสผ่านอาจอยู่ใน URL ของ production ช่วง 2026-10-19 05:05–20:12 · ตรวจ log ย้อนหลังไม่ได้ (Hobby) | High | แก้โค้ดแล้ว · **แนะนำเจ้าของเปลี่ยนรหัสผ่าน**บัญชีที่ login ช่วงนั้น (`incident-report.md`) |
| K-12 | Vercel Hobby: log ย้อนได้ 30 นาที ไม่มี alert · ไม่มี Sentry | Medium | เห็นปัญหาได้เฉพาะตอนเปิดดู · ทบทวน plan หรือส่ง log ออก (ADR-11) |
| K-13 | `npm audit --omit=dev`: Moderate 2 (`uuid` < 11.1.1 ผ่าน `exceljs`) | Low | แก้ได้แค่ major ของ `exceljs` · ใช้ตอนสร้าง Excel ในเบราว์เซอร์เท่านั้น · High/Critical = 0 [V] |
| K-14 | สถานะ "Allow new users to sign up" ของ production | Low | [U] · RLS กันข้อมูลอยู่แล้ว · ควรปิด |
| K-15 | Backup อัตโนมัติของ Supabase production | Medium | [U] · มี CSV 2026-10-15 + restore drill ผ่าน |
| K-16 | ประวัติ migration ใน CLI ของ production (`schema_migrations`) | Low | [U] · ดู `database-migrations.md` §2 ก่อนใช้ `db push` |
| K-17 | `develop` ไม่มี ruleset (merge ได้แม้ CI ไม่ผ่าน) | Medium | แนะนำตั้งเหมือน `main` |
| K-18 | ไม่เคยซ้อม Vercel Instant Rollback | Medium | `rollback-plan.md` §7 |
| K-19 | Node version บน Vercel และ function region | Low | [U] · ตั้ง `engines.node` = `22.x` หลังยืนยัน |

## 3. Technical Debt

| ID | Debt | ผลกระทบ | ข้อเสนอ |
|---|---|---|---|
| TD-06 | `records.services` เก็บ `[ประเภทรถ, ยี่ห้อ, หมายเหตุ]` ตามตำแหน่ง และเก็บชื่อแสดงผลไม่ใช่ id | query ตามยี่ห้อ/ประเภทใน DB ไม่ได้ · ต้องระวังทุกที่ที่อ่าน | ADR-09: expand คอลัมน์ใหม่ → backfill → แอปใช้ → contract |
| TD-19 | `job_status` = `done` และ `payment_method` = `cash` เสมอ ไม่มี UI | คอลัมน์ไม่มีความหมาย | ตัดสินว่าจะใช้ (เช่น โอน/เงินสด) หรือเลิก |
| TD-21 | `PROJECT_AUDIT.md` (2026-09-13) ล้าสมัย | ทำให้เข้าใจผิด | ลบ หรือใส่หมายเหตุว่าเป็นประวัติ (README ใหม่แล้ว) |
| TD-26 | `.npmrc` `legacy-peer-deps=true` ซ่อน peer conflict | อัปเกรดแล้วพังโดยไม่รู้ | ลองเอาออกแล้ว `npm ci` |
| TD-29 | ไม่มี `engines.node` | เครื่อง dev/Vercel อาจใช้ Node ต่างกัน | K-19 |
| TD-30 | ไม่มี coverage report | ไม่รู้ว่าส่วนไหนไม่มี test | `vitest --coverage` (ต้องเพิ่ม dev dependency) |
| TD-36 | กฎ import ระหว่างชั้น (`development-guide.md` §4.1) ยังไม่มี ESLint บังคับ | component อาจเรียก Supabase ตรง | `no-restricted-imports` |
| TD-37 | โค้ดของ feature บางส่วนยังอยู่ใน `lib/` (`export.ts`, `generateBill.ts`) และ `hooks/useWeather.ts` | หาโค้ดยากขึ้นเล็กน้อย | ย้ายเมื่อแตะส่วนนั้น |
| TD-38 | type ของตารางเขียนเองใน `types/index.ts` ไม่ได้ generate จาก schema | schema เปลี่ยนแล้ว type ไม่เตือน | `supabase gen types` |
| TD-39 | ไฟล์ตัวอย่าง env 2 ไฟล์ (`.env.example`, `docs/redesign/environment-variables.example`) และ `lib/__tests__/env.test.ts` ยังอ้าง `GEMINI_API_KEY` ที่เลิกใช้ | สับสน | รวมเหลือไฟล์เดียว · ลบการอ้างถึง |
| TD-40 | ไม่มี workflow รัน migration ไป staging/production (ทำมือ) | ลืมลำดับได้ (เคยเกิด S07-28) | GitHub workflow + Environment ที่ต้องอนุมัติ (`ci-quality-gates.md` §5) |
| TD-41 | WebKit ไม่อยู่ใน CI | ปัญหาที่เกิดเฉพาะเครื่องช้า/Safari เจอช้า (D-07 เจอตอน RC) | เพิ่ม project WebKit ใน CI (ใช้เวลา CI มากขึ้น) |
| TD-42 | remote branch ที่ merge แล้วราว 80 ตัว | รก | ลบหลังอนุมัติ (S06-03) |
| TD-43 | channel realtime อยู่ในหน้าภาพรวม ไม่ใช่ระดับแอป และ production ปิดอยู่ | โค้ดที่ไม่มีผล | ตัดสินพร้อม K-07 |

## 4. ข้อจำกัดของการทดสอบ

| เรื่อง | ผล |
|---|---|
| WebKit ใน Playwright บน Windows แทน iPhone จริงไม่ได้ทั้งหมด | K-02, K-06 ยัง [U] |
| E2E ใช้ข้อมูลสมมติ ~1,260 แถว | พฤติกรรมกับข้อมูลจริงหลายปีวัดเฉพาะผ่าน Lighthouse/การใช้จริง |
| การวัดประสิทธิภาพเป็น lab (CPU ช้า 4 เท่า + slow 4G) | ตัวเลขจริงของผู้ใช้ไม่มี (ไม่มี RUM) |
| ไม่มีบัญชีทดสอบบน production | smoke หลัง deploy ที่ต้อง login ต้องให้เจ้าของทำ |
