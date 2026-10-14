# Hotfix v1.0.1 — Release Record

> วันที่: 2026-10-14 · ตัดสินใจโดยเจ้าของ: D-17 (Q-18 = ทำ hotfix ก่อน redesign)
> Branch: `hotfix/1.0.1` แตกจาก tag `v1.0.0` (= `7f58eec` = production [V screenshot Vercel])
> สถานะ: **commit ในเครื่องแล้ว ยังไม่ได้ push, merge, deploy หรือ tag** (รออนุมัติ §6)

## 1. ขอบเขต

| # | เรื่อง | Commit | อ้างอิง |
|---|---|---|---|
| 1 | แก้วันที่เลื่อน −1 วันเมื่อแก้ไขรายการที่สร้างช่วง 00:00–06:59 (เวลาไทย) | `1cab952` `fix(records): keep created_at unchanged when editing early-morning records` | ER-01, FR-HIST-05, AC-26-1 |
| 2 | Upgrade `next` + `eslint-config-next` 16.2.1 → **16.3.8** (exact) | `e2b67ed` `build(deps): upgrade next and eslint-config-next to 16.3.8` | ER-09, S01-04 |
| 3 | Version 1.0.0 → 1.0.1 | `93f60ff` `chore(release): bump version to 1.0.1` | — |

ไฟล์ที่เปลี่ยน (เทียบ `v1.0.0`): `lib/dateUtils.ts`, `components/EditModal.tsx`, `vitest.config.mts`, `lib/__tests__/dateUtils.bangkok.test.ts` (ใหม่), `package.json`, `package-lock.json` · ไม่มีการเปลี่ยน DB, env หรือ UI

### 1.1 รายละเอียดการแก้ ER-01
- `splitDateTime` และ `mergeDateTime` ใช้ **Asia/Bangkok** ทั้งวันและเวลา (ผ่าน `Intl.DateTimeFormat`) ไม่ขึ้นกับ timezone ของเครื่อง (ประเทศไทยไม่มี DST จึงใช้ offset `+07:00` คงที่)
- ฟังก์ชันใหม่ `resolveCreatedAt(stored, date, time)`: ถ้าผู้ใช้ไม่ได้แก้วันที่หรือเวลา จะส่งค่าเดิม **ทุกหลักรวมวินาที** กลับไปตามเดิม (ก่อนหน้านี้วินาทีถูกตัดทุกครั้งที่บันทึก)
- `EditModal` ใช้ `resolveCreatedAt`

### 1.2 ทำไมเลือก 16.3.8 ไม่ใช่ 16.4.0 ตามที่แผนเขียนไว้
ตรวจ advisory ทั้ง 31 รายการของ `next` กับแต่ละเวอร์ชัน: `16.2.12` ยังโดน 8 รายการ (รวม critical 3) ขณะที่ `16.3.8` และ `16.4.0` **ไม่โดนเลย** จึงเลือก 16.3.8 เพราะเป็น patch release ที่ออกมาก่อน (2026-09-30 เทียบกับ 16.4.0 ที่ออก 2026-10-06 ซึ่งเป็น minor ใหม่) จึงเสี่ยงน้อยกว่าสำหรับ hotfix ส่วน `implementation-roadmap.md` H1 ปรับตามแล้ว

## 2. หลักฐานการทดสอบ (รันจริงในเครื่อง, Node 24.13.0)

| Check | ผล | รายละเอียด |
|---|---|---|
| Regression test **ก่อนแก้** | ❌ FAIL (ตั้งใจ) | test ใหม่ reproduce ER-01 ได้ เช่น `2026-10-14T03:30+07:00` → ได้ date `2026-10-13` (ผิด) และ round-trip เลื่อน −24 ชม. |
| Unit tests หลังแก้ (TZ=Asia/Bangkok) | ✅ 191/191 | เดิม 146 + ใหม่ 45 |
| Unit tests (TZ=UTC) | ✅ 191/191 | |
| Unit tests (TZ=America/New_York) | ✅ 191/191 | |
| `npm run lint` | ✅ 0 errors | ⚠ 1 warning ใหม่จาก rule ของ eslint-config-next 16.3.8: `app/error.tsx:45` ใช้ `window.location.href` (เป็นการ reload หน้าโดยตั้งใจหลัง error จึงไม่แก้ใน hotfix → HF-03) |
| `npm run type-check` | ✅ | |
| `npm run build` (Next 16.3.8) | ✅ | route ครบ 7 + Proxy และยังมีคำเตือน `middleware` deprecated (TD-27 ตามแผน) |
| Manual test บนเบราว์เซอร์ | **NOT RUN** | ไม่มี staging (Preview อาจชี้ production DB, A4 ยังไม่รู้) จึงไม่บันทึกหรือแก้ข้อมูลเพื่อทดสอบ → ใช้แผนตรวจแบบอ่านอย่างเดียว §5 |

### 2.1 Test suite ถูกตรึง TZ
`vitest.config.mts` ตั้ง `process.env.TZ = 'Asia/Bangkok'` เพราะ test เดิม 12 ตัวสร้างวันที่ด้วย "เวลาเครื่อง" และสมมติว่าเครื่องอยู่ไทย ซึ่ง fail เมื่อรันบน UTC (เช่น CI) ส่วน test ใหม่สลับ TZ เองเพื่อพิสูจน์ว่าผลไม่ขึ้นกับเครื่อง และไม่ได้ลบหรือปิด test เดิมตัวใดเลย

## 3. Dependency Audit

| | ก่อน | หลัง |
|---|---|---|
| Production deps | critical 1, high 8, moderate 5 (รวม 14) | **critical 0**, high 5, moderate 5 (รวม 10) |
| ทั้งหมด (รวม dev) | critical 3, high 16, moderate 9, low 1 (29) | critical 2, high 13, moderate 9, low 1 (25) |
| แก้ได้ | — | `next` (critical), `postcss`, `sharp`, `nanoid` |
| ใหม่ที่เกิดจาก upgrade | — | **ไม่มี** |

**Lockfile:** เปลี่ยน 44 package ทั้งหมดอยู่ใน dependency tree ของ `next` (swc binaries, sharp/libvips, postcss, `@next/env`, `@swc/helpers`, nanoid, fastq) + field version ของ root จาก `0.1.0` (เดิมไม่ตรงกับ package.json) เป็นค่าปัจจุบัน · เพิ่ม 2 (`@img/sharp-*-wasm32`) · ลบ 1 (`next/node_modules/postcss@8.4.31`)

**High ที่เหลือใน production deps (นอกขอบเขต hotfix → HF-01):**
| Package | ที่มา | ทำงานที่ไหน [I] | แผน |
|---|---|---|---|
| `brace-expansion`, `tmp` | `exceljs` → archiver/glob, tmp | browser (export) | ประเมินใน B7 |
| `undici`, `source-map-js` | `isomorphic-dompurify` → jsdom | server render ของหน้าที่ import | ลบ dependency ตาม ADR-10 (B5) |
| `ws` | `@supabase/realtime-js` | Node (browser ใช้ WebSocket ของเบราว์เซอร์) | upgrade supabase-js (patch) ใน R0 |

## 4. ความเสี่ยงและ Rollback

| ความเสี่ยง | ระดับ | การลด |
|---|---|---|
| Next 16.3 เปลี่ยนพฤติกรรม (minor ใหม่) | ต่ำถึงกลาง | build และ test ผ่าน แต่ **ยังไม่ได้ลองใช้ใน browser** → smoke test หลัง deploy (§5) + rollback พร้อม |
| แก้ ER-01 แล้วข้อมูลที่เคยเลื่อนไปก่อนหน้า**ไม่ถูกแก้ย้อนหลัง** | — | เป็นไปตาม Q-14 (ค่าเริ่มต้น: ไม่แก้อัตโนมัติ) และวัดขอบเขตด้วย SQL ข้อ 16 |
| ไม่มี DB change | — | **Rollback = Vercel Instant Rollback ไป deployment `7f58eec`** (< 5 นาที) โดยไม่ต้องย้อนอะไรใน DB |

## 5. แผนตรวจหลัง Deploy (อ่านอย่างเดียว ไม่สร้างหรือแก้ข้อมูล)
1. เปิดแอป production → login → หน้าภาพรวมแสดงยอดวันนี้ (ตรวจว่าไม่มี error)
2. หน้า "ประวัติ" → หารายการที่บันทึกช่วง 00:00–06:59 (ถ้ามี) → **เปิดหน้าแก้ไขแล้วดูว่าวันที่ที่แสดงตรงกับวันในรายการ** จากนั้นกด **ปิด** (ไม่กดบันทึก)
3. หน้า "บันทึก" เปิดได้ และหน้า export เปิด dialog ได้ (ไม่ต้องดาวน์โหลดจริง)
4. Vercel → Deployments: production SHA = merge commit ของ hotfix → ถ้าตรง ค่อยสร้าง tag `v1.0.1`
5. ถ้าข้อ 1–3 ผิดปกติ → Instant Rollback ทันที

## 6. สิ่งที่ต้องได้รับอนุมัติก่อนทำต่อ

| # | ขั้นตอน | ผลที่เกิดขึ้น |
|---|---|---|
| H-a | Push `hotfix/1.0.1` | Vercel สร้าง **Preview** ของโค้ดใหม่ (ใช้ env scope Preview ซึ่งยังไม่รู้ว่าชี้ DB ไหน A4) โดยผมจะไม่บันทึกหรือแก้ข้อมูลบน Preview |
| H-b | เปิด PR `hotfix/1.0.1` → `main` | ไม่มีผลต่อ production |
| H-c | **Merge เข้า `main`** | **Vercel deploy production ทันที** ควรทำนอกเวลาร้านเปิด (Q-19) |
| H-d | สร้าง tag `v1.0.1` บน merge commit หลังยืนยัน SHA | ประวัติ release |

## 7. Release Notes (ร่าง)

```markdown
# v1.0.1 — Hotfix (2026-10-xx)

## สำหรับผู้ใช้ในร้าน
- แก้ปัญหา: แก้ไขรายการที่บันทึกช่วงเช้ามืด (00:00–06:59) แล้ววันที่ถอยหลัง 1 วัน
- ปรับปรุงความปลอดภัยของระบบ (อัปเดตระบบพื้นฐาน)
- หน้าตาและการใช้งานเหมือนเดิมทุกอย่าง

## Changes
- Fixed: edit dialog keeps created_at unless date/time changed; Bangkok time zone for date/time fields (ER-01)
- Security: next 16.2.1 → 16.3.8 (ER-09)

## Database
- None

## Rollback
- Vercel Instant Rollback → 7f58eec (v1.0.0)
```

## 8. Issue Log ของ Hotfix

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| HF-01 | High advisories ที่เหลือใน production deps (exceljs, isomorphic-dompurify/jsdom, supabase realtime ws) จะทำให้ CI gate `audit --audit-level=high` บน `main` ยัง fail | Medium | UNRESOLVED → ทำใน R0/R1 (B5 ลบ dompurify, upgrade supabase-js, ประเมิน exceljs) และระหว่างนี้ CI ใช้ `continue-on-error` เฉพาะ feature ตาม `ci-quality-gates.md` แต่ **ต้องตัดสินใจ** ว่า release ถัดไปจะยอมรับ high ที่เหลือชั่วคราวหรือไม่ |
| HF-02 | ยังไม่ได้ทดสอบใน browser จริง (ไม่มี staging และ A4 ไม่รู้) | Medium | BLOCKED → ใช้แผนตรวจแบบอ่านอย่างเดียว §5 หลัง deploy |
| HF-03 | Lint warning ใหม่ `@next/next/no-location-assign-relative-destination` ที่ `app/error.tsx:45` | Low | UNRESOLVED (ตั้งใจ) → แก้ใน C7 (หน้า error ใหม่) |
| HF-04 | แผนเดิมใช้ 16.4.x แต่เลือก 16.3.8 (§1.2) | Low | RESOLVED (ปรับ roadmap แล้ว) |
| HF-05 | แผนเดิมแยก H1/H2 เป็น 2 branch แต่ทำเป็น `hotfix/1.0.1` branch เดียว 3 commit (แยกเรื่องชัดและ revert ทีละ commit ได้) เพราะปล่อยพร้อมกันเป็น v1.0.1 | Low | RESOLVED |
| HF-06 | Build เตือนว่า Next "ignored package-lock.json in C:\Users\User" (ไฟล์นอก repo S01-07) ซึ่ง Next 16.3.8 **ไม่ใช้ไฟล์นั้นแล้ว** (ต่างจาก 16.2.1 ที่เลือกเป็น workspace root) | Low | RESOLVED (โดย upgrade) เหลือแค่คำเตือน |
| HF-07 | `git switch` กลับ branch เอกสารทำให้ `node_modules` (Next 16.3.8) ไม่ตรงกับ `package.json` ของ branch เอกสาร (16.2.1) | Low | UNRESOLVED (ไม่กระทบเอกสาร) → รัน `npm ci` เมื่อสลับไปทำโค้ดบน branch อื่น |
