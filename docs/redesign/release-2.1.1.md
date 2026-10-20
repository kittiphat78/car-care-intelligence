# v2.1.1 — ข้อความที่พิมพ์ก่อนหน้าพร้อมไม่หายแล้ว

> สถานะ: **Released** · production 2026-10-20 12:58 · PR #54 merge commit `02f7038` · tag `v2.1.1` · ฐาน: `v2.1.0` (`8465548`)
> SemVer: PATCH (แก้บั๊กอย่างเดียว ไม่มีฟีเจอร์ใหม่ ไม่เปลี่ยนฐานข้อมูล)
> ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## สำหรับคนในร้าน

- เปิดหน้าบันทึกแล้วพิมพ์ทะเบียนหรือราคาทันที (เช่น เปิดจากทางลัดที่ไอคอนแอป หรือเน็ตช้า) **ข้อความไม่ถูกล้างแล้ว** · เดิมช่องแรกที่พิมพ์เร็วจะว่างเมื่อแตะช่องอื่น แล้วกดบันทึกขึ้น "กรุณากรอก…"
- ยังเหมือนเดิม: ปุ่มที่แตะก่อนหน้าโหลดเสร็จ (ปุ่มยังเป็นสีจาง) จะไม่ทำงาน ให้แตะอีกครั้ง

## การเปลี่ยนแปลง

| PR | เรื่อง | กระทบแอป |
|---|---|---|
| #51 `a25d24a` | **Fixed D-08:** หลังหน้าพร้อม ค่าที่พิมพ์ไว้ในฟอร์มรายรับ/รายจ่ายถูกเก็บเข้า state (`lib/use-early-typing.ts`) · draft เก่าที่กู้คืนไม่ทับค่าที่เพิ่งพิมพ์ | ✅ หน้า `/add` |
| #52 `0ff51e8` | เอกสาร Step 11 (release v2.1.0) | ❌ docs |
| #53 `6895359` | เอกสารส่งมอบ Step 12 | ❌ docs |

## Database

ไม่มี migration · schema เดิม (M000–M009)

## การทดสอบ (RC `v2.1.1-rc.1` = `5fb1bc8`, 2026-10-20)

| ตรวจ | ผล |
|---|---|
| CI (lint, typecheck, test, build, audit, secrets, db, e2e) | 9/9 ผ่าน [V] |
| Unit | 407/407 (รวม test D-08 3 ข้อที่ล้มกับโค้ดเดิม) [V] |
| E2E Chromium ในเครื่อง มือถือ + PC | 57 ผ่าน · ข้าม 9 (รวม test D-08 ที่ล้มกับ `e63d175`) [V] |
| E2E WebKit ในเครื่อง | 53 ผ่าน / 4 ล้ม: skip link ×2 (WebKit ไม่ Tab ไปลิงก์) + axe contrast ของปุ่มที่ยังกดไม่ได้ระหว่างรอหน้าพร้อม ×2 (หน้า login, หน้าบันทึก · WCAG ยกเว้นปุ่มที่ใช้ไม่ได้ · เกิดหรือไม่ขึ้นกับจังหวะ) · ไม่มีหมวดใหม่ · ไม่มีล้มจาก D-08 [V] |
| Preview + staging (`e2e-preview`) | มือถือ 3/3 · PC 6/6 · iPhone 3/3 · ทุก request ไป staging ไม่มีไป production · เก็บกวาดแล้วไม่เหลือข้อมูลทดสอบ [V] |
| แก้ test ระหว่าง RC | test สภาพแวดล้อมบน Preview ฝังเลข `2.1.0` ไว้ → อ่านจาก `package.json` แทน (ไม่ใช่โค้ดแอป) |

## Deploy และตรวจหลังขึ้น production [V]

| เวลา (2026-10-20) | เหตุการณ์ |
|---|---|
| 12:58:14 | เจ้าของ merge PR #54 แบบ merge commit → `02f7038` (tree เท่ากับ `release/2.1.1` @ `dcbb2a7`) |
| 12:58:50 | Vercel production deployment `7192728398` success |
| 13:01–13:04 | Smoke test อ่านอย่างเดียว: ขึ้น `v2.1.1` บนมือถือ, PC, iPhone (WebKit), 320 px · ไม่มี error ใหม่ใน console (มีแค่ `interactive-widget` บน iPhone) · ไม่มี request ล้ม · redirect `?next=` ถูก · security header 6 ตัวครบ ไม่มี `unsafe-eval` · ฟอร์ม login `method="post"` · `/api/client-errors` ไม่ login = 401 · JavaScript ชี้ production ไม่มีของ staging ไม่มี `service_role`/`sb_secret_` |
| 13:04 | tag `v2.1.1` (annotated) บน `02f7038` |
| 13:02– | ตรวจจากภายนอกทุก 5 นาที (login, `/`, API, Supabase Auth) ปกติทุกรอบ |

หมายเหตุ: merge เวลา 12:58 อยู่ในเวลาร้านเปิด (Q-19 ให้ deploy นอกเวลาทำการ) · ตรวจทันทีหลัง deploy ไม่พบปัญหา · ไม่มีการเปลี่ยนฐานข้อมูล
หลัง release: back-merge `main` → `develop` ด้วย merge commit (`develop` มี PR #55 ที่ `main` ไม่มี จึง fast-forward ไม่ได้)

## Rollback

Vercel → Deployments → deployment ของ `8465548` (`v2.1.0`, deployment `7178871333`) → **Instant Rollback** · ไม่ต้องทำอะไรกับฐานข้อมูล · ย้อนแค่โค้ด: ข้อมูลที่บันทึกระหว่างนั้นยังอยู่ (`rollback-plan.md`)

## Known issues

ตาม `known-issues.md` ยกเว้น K-01 ส่วนข้อความหาย (แก้ใน release นี้)
