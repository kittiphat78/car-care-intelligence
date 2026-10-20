# Vercel Deployment Guide

> Step 12 · 2026-10-20 · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> ลำดับ release ทั้งหมด: `git-workflow.md` §4 · ย้อนกลับ: `rollback-plan.md` · ตัวแปร: `environment-setup.md`
> ตัวอย่างจริงของการ deploy ทั้งรอบ: `release-record.md`, `production-release-report.md` (v2.1.0)

## 1. Deploy ทำงานอย่างไร

| เรื่อง | ค่า |
|---|---|
| ที่ไหน | Vercel project `car-care-intelligence-53wd` (เจ้าของ, แผน Hobby) [V] |
| Production URL | `https://car-care-intelligence-53wd.vercel.app` (ไม่มี custom domain) [V] |
| Production | **ทุก merge เข้า `main`** · ไม่มีการ deploy production ด้วยมือ (`vercel --prod`) [V] |
| Preview | ทุก push ของ branch อื่น · URL ต่อ deployment `car-care-intelligence-53wd-<hash>-kittiphat78s-projects.vercel.app` · ต้องผ่าน Vercel Authentication [V] |
| Build | `next build` · env guard ตรวจฐานข้อมูลก่อน build (`lib/env-guard.ts`) · เลขเวอร์ชันจาก `package.json` |
| ไม่ build | commit ที่แก้แค่ `docs/` (Ignored Build Step) [V] · commit ที่แก้ `supabase/` ยัง build (S07-20) [U ว่าแก้แล้วหรือยัง] |
| ฐานข้อมูล | Vercel ไม่ได้รัน migration · DB เปลี่ยนแยกตาม `database-migrations.md` |
| GitHub | Vercel ส่งสถานะ deployment กลับมาที่ GitHub (ใช้ตรวจ §4) [V] |

## 2. ก่อน deploy production

ใช้ `release-checklist.md` เป็น body ของ release PR และ `production-readiness-checklist.md` เป็นแม่แบบ Go/No-Go · ขั้นต่ำ:

- [ ] RC ผ่าน `e2e-preview` บน Preview ที่ใช้ staging และ tag RC แล้ว
- [ ] `package.json` เป็นเลขจริง (ไม่ใช่ `-rc`) และ CI ของ commit นั้นผ่าน
- [ ] ไม่มี defect Critical/High ค้าง
- [ ] Migration (ถ้ามี) รันบน production แล้ว และ backup ก่อนรัน
- [ ] รู้ deployment ที่จะ rollback ไป (Vercel → Deployments → Production ปัจจุบัน)
- [ ] นอกเวลาทำการของร้าน (Q-19) และเจ้าของอนุมัติ (Q-20)

## 3. Deploy

1. เจ้าของเปิด release PR (`base: main`, `compare: release/x.y.z`) และรอ checks ครบ 9 ตัว
2. **Create a merge commit** → Vercel เริ่ม build production ทันที (ประมาณ 1 นาที [V v2.1.0])
3. ระหว่างนี้ไม่ merge อะไรเข้า `main` เพิ่ม

## 4. ยืนยันหลัง deploy

```bash
SHA=<merge commit sha>
curl -s "https://api.github.com/repos/kittiphat78/car-care-intelligence/deployments?sha=$SHA"        # environment = Production
curl -s "https://api.github.com/repos/kittiphat78/car-care-intelligence/deployments/<id>/statuses"  # state = success
P=https://car-care-intelligence-53wd.vercel.app
curl -s $P/login | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+[-a-z0-9.]*' | head -1   # เลขเวอร์ชันใหม่
```

**Smoke test อ่านอย่างเดียว (ไม่ login, ไม่เขียนข้อมูล)** · แม่แบบ `smoke-test-results.md`:

| ตรวจ | คาดหวัง |
|---|---|
| `curl -sI $P/login` | 200 · มี CSP (ไม่มี `unsafe-eval`), HSTS, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy |
| `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' $P/history` | `307 …/login?next=%2Fhistory` |
| `curl -s -o /dev/null -w '%{http_code}' -X POST -H "Origin: $P" -d '{}' $P/api/client-errors` | `401` |
| ฟอร์ม login | `method="post"` |
| JavaScript ที่หน้า login โหลด | มี project ref ของ production · ไม่มี ref ของ staging · ไม่มี `service_role` / `sb_secret_` |
| เปิดในเบราว์เซอร์ (มือถือ, PC, iPhone) | ไม่มี error ใน console นอกจาก `interactive-widget` บน iPhone · ไม่มี request ล้ม · ไม่มีแถบ "ระบบทดสอบ" |

**เจ้าของ login ตรวจด้วยบัญชีร้าน (ดูอย่างเดียว):** ภาพรวม (ยอด, การ์ดค้างชำระ, อากาศ, กราฟ) · ค้างชำระ · ประวัติ · ส่งออก Excel · หน้าเพิ่มเติมขึ้นเลขเวอร์ชันใหม่

## 5. เปลี่ยนตัวแปรบน production

1. Vercel → Settings → Environment Variables → แก้เฉพาะ scope **Production**
2. ตัวแปร `NEXT_PUBLIC_*` ถูกฝังตอน build: ต้อง Redeploy (Deployments → deployment ล่าสุดของ production → Redeploy) จึงมีผล
3. ถ้าเปลี่ยน URL ฐานข้อมูล: env guard จะทำให้ build ล้มถ้าไม่ตรงกับ `PRODUCTION_SUPABASE_PROJECT_REF` (ตั้งใจ)
4. Rollback ของ Vercel **ไม่ย้อน**ตัวแปร: จดค่าเดิม (ชื่อและ scope ไม่ใช่ค่า key) ไว้ก่อนแก้

## 6. หลัง deploy

| เมื่อ | ทำอะไร |
|---|---|
| ทันที | §4 · ถ้าไม่ผ่านตามเกณฑ์ `rollback-plan.md` §2 → rollback |
| 30 นาทีแรก | Vercel → Logs → "Last 30 minutes" · ค้น `client` (รายงาน error จากเบราว์เซอร์ `"source":"client"`) และดู Console Level Error/Fatal · `POST 401 /api/client-errors` ที่เวลาตรงกับสคริปต์ตรวจไม่ใช่ปัญหา |
| วันแรกที่ร้านเปิด | ให้คนในร้านปิดเปิดแอปบน tablet/มือถือ 1 ครั้ง · ดู log เป็นช่วง ๆ (Hobby ย้อนได้ 30 นาที ไม่มี alert) · ถามตอนปิดร้าน |
| บันทึก | tag release (`git-workflow.md` §4 ข้อ 11) · release record |

## 7. Preview

- เข้าดูด้วยบัญชี Vercel ที่มีสิทธิ์ใน project · คนอื่นต้องได้ share link จากเจ้าของ
- test อัตโนมัติใช้ "Protection Bypass for Automation" (secret เก็บใน `.env.preview` ในเครื่อง ไม่ commit) ผ่าน query `?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=samesitenone` ครั้งแรกเพื่อรับ cookie (`e2e-preview/preview.spec.ts`)
- Preview แสดงแถบ "ระบบทดสอบ (Preview)" และใช้ staging เสมอ · ทุกอย่างที่บันทึกใน Preview ไปอยู่บน staging
- Vercel Toolbar บน Preview ทำให้มีข้อความ CSP ของ `vercel.live` ใน console (production ไม่มี)

## 8. ข้อจำกัดที่รู้

| เรื่อง | ผล |
|---|---|
| Vercel Hobby | log ย้อนได้ 30 นาที · ไม่มี alert · ไม่มี gradual rollout [V] |
| Node version | ไม่มี `engines.node` · Vercel ใช้ค่าตั้งของ project [U] |
| Function region | [U] ควรใกล้ Supabase |
| ไม่มี feature flag | ของใหม่ปิดได้ด้วย rollback ทั้ง deployment เท่านั้น |
| GitHub Actions ล่ม | merge ไม่ได้เพราะ ruleset (ตั้งใจ) · รอ (S11-02) |
