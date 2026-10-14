# Step 06 — Issue Log

> Step: 06 — Versioned Git Workflow & Safe Migration Plan · วันที่: 2026-10-14
> Branch: `docs/redesign-step-06-workflow` (แตกจาก `docs/redesign-step-05-architecture` @ `14c405e`)
> สถานะ: `RESOLVED` · `UNRESOLVED` · `BLOCKED` · `NEEDS_APPROVAL`

## สรุป

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S06-01 | ตรวจหรือตั้ง branch protection / rulesets / environments ไม่ได้ | High | BLOCKED |
| S06-02 | เสนอเปลี่ยน D-11: ปล่อย UI ใหม่ครั้งเดียวที่ v2.0.0 (Phase B) | Medium | RESOLVED (เจ้าของอนุมัติ 2026-10-14) |
| S06-03 | ลบ remote branches ค้าง 28 ตัว (merge แล้ว 27) | Low | NEEDS_APPROVAL |
| S06-04 | Pin GitHub Actions ด้วย commit SHA | Low | UNRESOLVED |
| S06-05 | คำสั่ง Supabase CLI สำหรับรัน SQL tests ใน CI ยังไม่ได้ทดสอบ | Low | UNRESOLVED |
| S06-06 | Build ด้วย env placeholder ผ่าน แต่มี `.env.local` อยู่ในเครื่องด้วย | Low | UNRESOLVED |
| S06-07 | การ merge docs เข้า `main` จะทำให้ Vercel deploy production ใหม่ | Medium | NEEDS_APPROVAL |
| S06-08 | ได้รับ Prompt Step 06 ขณะ Step 05 ยังไม่จบ | Low | RESOLVED |
| S06-09 | Audit gate จะ fail ทุก PR จนกว่าจะ upgrade Next | Medium | RESOLVED (ในแผน) |

Carry-over: S01-01/S05-01 (schema), S01-02/S05-05 (Vercel), S01-08/S01-09 (push), S05-02 (ADR), S05-03 (สมาชิก)

---

## S06-01 — Branch protection · High · `BLOCKED`
- **หลักฐาน:** `command -v gh` → not installed และไม่มี token ที่มีสิทธิ์ admin
- **สิ่งที่ทำแล้ว:** กำหนดค่าครบใน `branch-protection.md` (rulesets main/develop/release/tags, repo settings, environments, Vercel) พร้อมคำสั่งยืนยัน
- **ความเสี่ยงถ้าปล่อย:** push ตรงเข้า `main` ได้ (ซึ่งเป็นวิธีที่ใช้อยู่ตอนนี้ [V]) และ tag ถูกย้ายหรือลบได้
- **ต้องการ:** เจ้าของตั้งค่าตาม `branch-protection.md` §1–§4 แล้วส่งผล `gh api …/rulesets` หรือ screenshot
- **Prompt:** > "S06-01: ตั้ง rulesets ตาม branch-protection.md แล้ว นี่คือผล `gh api repos/kittiphat78/car-care-intelligence/rulesets` ให้ตรวจว่าตรงตามเอกสารและปิด S06-01"

## S06-02 — ปล่อย UI ใหม่ครั้งเดียว · Medium · `RESOLVED` (อนุมัติ 2026-10-14)
- **ข้อเสนอเดิม (D-11):** ปล่อย UI ทีละหน้า (R2..R5) สู่ production
- **ข้อเสนอใหม่:** Phase A (DB + data fixes บน UI เดิม) ปล่อยทีละ release แล้ว Phase B (UI ทั้งหมด) รวมใน `develop` → RC บน staging → UAT โดยเจ้าของ → v2.0.0 ครั้งเดียว
- **เหตุผล:** ไม่มี production ที่มี 2 ดีไซน์ปนกัน, Phase B ไม่มี DB change จึง rollback ด้วย Vercel ได้ทั้งก้อน และไม่ต้องดูแล CSS 2 ชุดใน production
- **ข้อเสีย:** ผู้ใช้เจอการเปลี่ยนแปลงครั้งใหญ่ทีเดียว (CR-09) ลดด้วย UAT + คงตำแหน่งปุ่มบันทึก + คำศัพท์เดิม (S03-02) + สอนการใช้งานสั้น ๆ ตอน release
- **ค่าเริ่มต้นถ้าไม่ตอบ:** ใช้ข้อเสนอใหม่

## S06-03 — Remote branches ค้าง · Low · `NEEDS_APPROVAL`
- **ข้อเสนอ:** ลบ branch ที่ `git branch -r --merged origin/main` ยืนยันแล้วเท่านั้น และย้าย `origin/chore/performance-optimization` (ยังไม่ merge [V]) เป็น `archive/*`
- **ไม่ได้ทำ:** การลบ branch บน remote แก้ไม่ได้ถ้าไม่มี backup ref จึงต้องอนุมัติ

## S06-04 — Pin actions ด้วย SHA · Low · `UNRESOLVED`
- workflow ร่างใช้ `@v4`/`@v2` และตอนสร้างจริงใน A1 ต้องค้น commit SHA ของ release ที่ใช้แล้ว pin (กัน supply-chain T12) ซึ่งทำใน Step 07

## S06-05 — คำสั่ง CLI สำหรับ SQL tests · Low · `UNRESOLVED`
- `ci-quality-gates.md` §2 ใช้ `supabase db query --file` ซึ่ง **ยังไม่ได้ตรวจว่ามีในเวอร์ชัน CLI ที่ใช้** ทางเลือก: `psql "$(supabase status -o env | grep DB_URL …)" -f file.sql` (psql มีบน ubuntu runner [I]) → ยืนยันใน A5

## S06-06 — Build ด้วย placeholder · Low · `UNRESOLVED`
- **หลักฐาน:** `NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key-not-real npm run build` → exit 0, ได้ route ครบ 7 + Proxy [V]
- **ข้อจำกัด:** Next.js แสดง `Environments: .env.local` เพราะไฟล์อยู่ในเครื่อง โดยค่าใน process env ชนะ `.env.local` ตามกติกาของ Next [I] จึงยังไม่ใช่หลักฐานที่สมบูรณ์ว่า build ได้โดยไม่มีไฟล์นั้น และไม่ได้ย้ายหรือเปลี่ยนชื่อ `.env.local` ของผู้ใช้เพื่อทดสอบ
- **การปิด:** CI run แรก (A1) บน runner ที่ไม่มี `.env.local` ผ่าน

## S06-07 — Merge docs → production deploy · Medium · `NEEDS_APPROVAL`
- **สาเหตุ:** Vercel deploy ทุก push เข้า `main` [I]
- **ทางออก:** (a) ตั้ง Ignored Build Step ก่อน (A2 หรือตั้งใน Vercel UI) แล้วจึง merge docs (b) merge docs ได้เลยเพราะโค้ดเหมือนเดิม 100% แต่จะเกิด production deployment ใหม่ (build เดิม) และ (c) เก็บ docs ใน PR ที่ยังไม่ merge ไว้ก่อน
- **ค่าเริ่มต้น:** (c) push + draft PR (หลังอนุมัติ S01-09)

## S06-08 — Prompt ซ้อน · Low · `RESOLVED`
- Prompt Step 06 มาถึงระหว่างเขียน Step 05 จึงทำ Step 05 ให้เสร็จและ commit ก่อน (`14c405e`) แล้วแตก branch Step 06 จาก commit นั้น เพราะ Step 06 อ้างแผน migration และ CI ของ Step 05

## S06-09 — Audit gate fail จนกว่าจะ upgrade · Medium · `RESOLVED` (ในแผน)
- **หลักฐาน:** `npm audit` พบ `next` critical (Step 01)
- **การจัดการ:** ลำดับใน roadmap ให้ H1 (upgrade) มาก่อน A1 (CI) หรือถ้า A1 มาก่อน ให้ audit เป็น warn บน feature branch และ block เฉพาะ `main`/`release` (`ci-quality-gates.md` §2 `continue-on-error`) โดยไม่ปิด gate
