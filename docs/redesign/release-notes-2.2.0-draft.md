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
| `supabase/migrations/20261020130000_customer_plate_core.sql` (M012) | `plate_core`: ทะเบียนเทียบโดยไม่สนจังหวัดท้าย · ห้ามซ้ำเฉพาะทะเบียนเต็ม (ผลข้อมูลจริง Q-8) | merge แล้ว (#57) · staging ✅ |
| `supabase/migrations/20261020140000_customer_vehicle_model.sql` (M013) | รุ่นรถ `customer_vehicles.model` + `save_customer` บันทึกรุ่น | ใน PR `feature/customers-vehicle-model` · staging: รอเจ้าของรัน |
| M014 (Phase 3) | index ทะเบียนบน `records` + RPC สรุปประวัติ | ยังไม่ทำ |

ทั้งหมดเป็นของใหม่ แอป v2.1.x ใช้ต่อได้แม้รัน migration ไปก่อน

## การเปลี่ยนแปลง

| PR | เนื้อหา |
|---|---|
| #55 | เอกสารออกแบบ (Phase 0) |
| #56 | M010–M011: ตารางลูกค้า + `save_customer` |
| #57 | M012: ทะเบียนเทียบด้วย `plate_core` |
| #59 (Phase 2) | หน้า `/customers` (ค้นชื่อ/เบอร์/ทะเบียนบางส่วน, โทร, คัดลอกเบอร์) · หน้า `/customers/<id>` · ฟอร์มเพิ่ม/แก้ (หลายเบอร์ หลายคัน, ย้ายรถจากลูกค้าอื่น, draft) · ลบพร้อมยืนยัน · เมนู: SideNav (PC) + การ์ดบน `/more` (มือถือ) · `/customers` อยู่ใน `PROTECTED_ROUTES` · ลิงก์ออกจากระบบไม่พาคำค้นลูกค้าไป server · ไม่มี migration |
| `feature/customers-vehicle-model` (Phase 2b, รอ review) | M013 · ช่อง "รุ่น" ในฟอร์ม · รายชื่อแสดงยี่ห้อ/รุ่นของคันแรก (PC มีคอลัมน์ "ยี่ห้อ / รุ่น") · หน้าลูกค้าแสดง "ประเภท · ยี่ห้อ รุ่น · สี" |

## Rollback

แอป: Vercel Instant Rollback ไป `v2.1.1` · ฐานข้อมูล: ไม่ต้องย้อน (ตารางใหม่อยู่เฉย ๆ) · down ของ M010 ใช้ได้เมื่อไม่มีลูกค้าในสมุดเท่านั้น (ป้องกันข้อมูลหาย)
