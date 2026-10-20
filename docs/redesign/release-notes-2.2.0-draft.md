# v2.2.0 — สมุดรายชื่อลูกค้า (ร่าง)

> สถานะ: **กำลังพัฒนา** ใน `develop` · ยังไม่มี RC · ฐาน: `v2.1.1` (`02f7038`)
> SemVer: MINOR (ฟีเจอร์ใหม่ + ตารางใหม่แบบ expand-only)
> ออกแบบ: `docs/features/customer-directory.md`

## สำหรับคนในร้าน (เมื่อเสร็จ)

- เก็บรายชื่อลูกค้า เบอร์โทร (หลายเบอร์) และรถ (หลายคัน) · ค้นด้วยชื่อ เบอร์ หรือทะเบียนบางส่วน · กดโทรได้ทันที
- หน้าค้างชำระมีปุ่มโทรลูกค้า · หน้าบันทึกบอกชื่อลูกค้าจากทะเบียน (Phase 3)

## Database (ต้องรันบน production **ก่อน** merge release · เจ้าของรัน)

| ไฟล์ | เนื้อหา | สถานะ |
|---|---|---|
| `supabase/migrations/20261020120000_customers.sql` (M010) | ตาราง `customers`, `customer_phones`, `customer_vehicles` + RLS + audit | merge แล้ว (#56) · staging ✅ |
| `supabase/migrations/20261020120100_save_customer.sql` (M011) | RPC `save_customer` | merge แล้ว (#56) · staging ✅ |
| `supabase/migrations/20261020130000_customer_plate_core.sql` (M012) | `plate_core`: ทะเบียนเทียบโดยไม่สนจังหวัดท้าย · ห้ามซ้ำเฉพาะทะเบียนเต็ม (ผลข้อมูลจริง Q-8) | ใน PR `db/customers-plate-core` |
| M013 (Phase 3) | index ทะเบียนบน `records` + RPC สรุปประวัติ | ยังไม่ทำ |

ทั้งหมดเป็นของใหม่ แอป v2.1.x ใช้ต่อได้แม้รัน migration ไปก่อน

## การเปลี่ยนแปลง

(เติมตาม PR ที่ merge)

## Rollback

แอป: Vercel Instant Rollback ไป `v2.1.1` · ฐานข้อมูล: ไม่ต้องย้อน (ตารางใหม่อยู่เฉย ๆ) · down ของ M010 ใช้ได้เมื่อไม่มีลูกค้าในสมุดเท่านั้น (ป้องกันข้อมูลหาย)
