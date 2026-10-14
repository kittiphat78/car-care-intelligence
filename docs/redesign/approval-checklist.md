# Approval Checklist — ก่อนเริ่มพัฒนา

> วันที่: 2026-10-14 · สถานะ: **รออนุมัติ**
> ผู้ช่วย (Claude) ไม่มีสิทธิ์เข้าถึง Vercel, Supabase หรือ GitHub settings จากเครื่องนี้ (ไม่มี `vercel`, `supabase` หรือ `gh` CLI) รายการในส่วน A จึงต้องให้เจ้าของระบบตรวจและส่งผลกลับมา

## A. ข้อมูลที่ต้องให้เจ้าของระบบยืนยัน (ไม่ต้องส่ง secret)

### Vercel
- [ ] A1. Commit SHA ของ **Current Production Deployment** (Vercel → Project → Deployments → Production)
- [ ] A2. Production Branch ที่ตั้งไว้ (คาดว่าเป็น `main`)
- [ ] A3. เปิด Git integration และ auto Preview deployments อยู่หรือไม่
- [ ] A4. Env vars แต่ละตัวถูกตั้งใน scope ไหนบ้าง (Production / Preview / Development) และ Preview ใช้ Supabase project ref เดียวกับ Production หรือไม่ (ดูแค่ subdomain ของ URL)
- [ ] A5. `GEMINI_API_KEY` ตั้งอยู่ใน Production หรือไม่
- [ ] A6. Vercel plan (Hobby / Pro) และ Node.js version ใน Project Settings
- [ ] A7. Production domain และเปิด Deployment Protection สำหรับ Preview หรือไม่

### Supabase
- [ ] A8. มีกี่ project และ project ไหนคือ production
- [ ] A9. Plan (Free / Pro) และมี Daily Backups หรือ PITR หรือไม่ (Database → Backups)
- [ ] A10. ผลของ read-only SQL ข้อ 1–12 ใน `production-baseline.md` §8
- [ ] A11. Auth → "Allow new users to sign up" เปิดหรือปิด และมี provider อื่นนอกจาก email หรือไม่
- [ ] A12. มี Database Webhooks, Edge Functions หรือ Storage buckets ที่ใช้งานอยู่หรือไม่

### ผู้ใช้
- [ ] A13. จำนวนผู้ใช้จริง, อุปกรณ์ที่ใช้ (มือถือ, tablet แบบ kiosk หรือ desktop) และช่วงเวลาที่ใช้งานหนัก (เพื่อเลือกช่วง deploy)

## B. การตัดสินใจที่ต้องอนุมัติ

| # | รายการ | ความเสี่ยงต่อ Production | ข้อเสนอ |
|---|---|---|---|
| B1 | ยอมรับ `v1.0.0` (`7f58eec`) เป็น Stable Baseline **หลังยืนยัน A1** | ไม่มี | อนุมัติเมื่อ A1 ตรงกัน |
| B2 | สร้าง Supabase project `car-care-staging` | ไม่มี (project ใหม่) | อนุมัติ |
| B3 | Schema-only dump ของ Production เพื่อทำ baseline migration | ต่ำ (อ่านอย่างเดียว แต่ใช้ DB credentials) | อนุมัติ โดยเจ้าของรันเองหรือให้ credential ชั่วคราว |
| B4 | เปลี่ยน Vercel env vars ของ scope **Preview และ Development** ไปชี้ staging | ไม่มีต่อ Production ถ้าไม่แตะ scope Production | อนุมัติหลัง B2 |
| B5 | ทำ manual full backup (`pg_dump`) ของ Production ก่อนงานที่แตะ DB | ต่ำ (อ่านอย่างเดียว) | อนุมัติก่อน Step 07 |
| B6 | Local branches ที่ยังไม่ push 3 ตัว (`feature/redesign-cash-bill-pdf`, `fix/input-sanitization-and-api-auth`, `fix/prevent-duplicate-submit`) | ไม่มี | เสนอ push เป็น `archive/*` เพื่อกันหาย และตรวจใน Step 01 ว่า 2 ตัว `fix/*` ถูกแทนที่แล้วหรือไม่ |
| B7 | Commit เอกสาร Step 00 นี้บน `docs/redesign-step-00-baseline` แล้ว push และเปิด PR เข้า `main` | Merge เข้า main จะทำให้ Vercel deploy ใหม่ (เปลี่ยนแค่ docs, โค้ดไม่เปลี่ยน) [I] | อนุมัติ commit และ push แต่ **ยังไม่ merge** จนกว่าจะมี CI หรือเลือกเวลาที่เหมาะ |
| B8 | Interim rule: ห้ามทดสอบ write flow บน local หรือ Preview จนกว่า B2–B4 เสร็จ | — | อนุมัติ |

## C. สิ่งที่ **ไม่ได้ทำ** ใน Step 00 (ยืนยันตาม Absolute Rules)

- ไม่ได้สร้าง Git tag
- ไม่ได้แก้ Git history, ไม่ได้ force push และไม่ได้ push อะไรเลย
- ไม่ได้เชื่อมต่อหรือ query Supabase โดยตรง
- ไม่ได้แตะ Vercel settings หรือ deployments
- ไม่ได้แสดงค่า secret (ตรวจ `.env.local` เฉพาะชื่อตัวแปร ความยาว และ JWT `role` claim)
- ไม่ได้แก้ไฟล์โค้ด มีแค่การสร้าง branch `docs/redesign-step-00-baseline` และไฟล์ใน `docs/redesign/`

## D. Gate สู่ Step 01

Step 01 (Reverse Engineering & Audit) เป็นงานอ่านโค้ดและเขียนเอกสาร **เริ่มได้ทันทีหลังอนุมัติ** โดยไม่ต้องรอ A และ B ทั้งหมด แต่ผลของ A4, A9, A10 และ A11 ควรส่งมาก่อนจบ Step 01 เพื่อประเมิน security และ data ให้ครบ

**Step 07 (Implementation) ห้ามเริ่ม** จนกว่าจะผ่าน checklist ใน `rollback-readiness.md` §4
