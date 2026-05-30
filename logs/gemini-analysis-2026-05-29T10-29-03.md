# Gemini Output: บันทึก knowledge เรื่อง CIT Signing System Fix — root cause: signing link showed 'null' token เนื่องจากลืม select sign_token column เมื่อ insert new onsite report. Fix: เปลี่ยน .select('id') เป็น .select('id, sign_token'). Details ใน file wiki/cit/cit-signing-system-fix.md — ให้ Gemini สร้าง markdown knowledge document เพื่อบันทึก: (1) issue description, (2) root cause analysis, (3) fix details with code snippets, (4) how signing system works, (5) testing steps. ส่งเก็บใน wiki/cit/cit-signing-knowledge.md

**Task Type:** analysis  
**Generated:** 29/5/2569 17:29:18  
**Delegated by:** Claude Code

---

```markdown
# CIT Signing System Fix: 'null' Token in Signing Link

**File Path:** `wiki/cit/cit-signing-knowledge.md`

---

## 1. Issue Description

เมื่อมีการสร้างรายงาน onsite ใหม่ ลิงก์สำหรับลงนาม (signing link) ที่ถูกสร้างขึ้นสำหรับรายงานนั้นแสดงค่า `null` ในส่วนของ `sign_token` ทำให้ลิงก์ไม่สามารถใช้งานได้จริง ผู้ใช้งานไม่สามารถเข้าถ��งหน้าลงนามเพื่อดำเนินการลงนามในรายงานได้

**ตัวอย่างปัญหา:**
*   ลิงก์ที่คาดหวัง: `https://example.com/sign/onsite-report/aBcDeFgHiJkLmNoPqRsT`
*   ลิงก์ที่พบ: `https://example.com/sign/onsite-report/null`

## 2. Root Cause Analysis

สาเหตุหลักของปัญหานี้เกิดจากในขั้นตอนการสร้างรายงาน onsite ใหม่ และหลังจากนั้นมีการดึงข้อมูลของรายงานที่เพิ่งสร้างขึ้นมาเพื่อนำไปสร้าง signing link ระบบได้ลืมเลือก (select) คอลัมน์ `sign_token` ในการ query ข้อมูล

โดยปกติแล้ว เมื่อมีการ insert ข้อมูลใหม่เข้าสู่ฐานข้อมูล ระบบจะทำการสร้าง `sign_token` ให้โดยอัตโนมัติ (หร���อถูกสร้างขึ้นใน logic ก่อน insert) แต่เมื่อมีการดึงข้อมูลรายงานที่เพิ่งสร้างขึ้นมาเพื่อใช้งานต่อ ระบบกลับเลือกเฉพาะคอลัมน์ `id` เท่านั้น ทำให้ข้อมูล `sign_token` ไม่ถูกดึงกลับมาด้วย เมื่อระบบพยายามนำค่า `sign_token` ไปใช้สร้าง URL จึงได้ค่าเป็น `null`

## 3. Fix Details with Code Snippets

การแก้ไขปัญหานี้ทำได้โดยการเพิ่มคอลัมน์ `sign_token` เข้าไปในคำสั่ง `select` เมื่อมีการดึงข้อมูลรายงาน onsite หลังจากที่ได้ทำการ insert ข้อมูลใหม่แล้ว

**ก่อนการแก้ไข (Before Fix):**
โค้ดเดิมที่ดึงข้อมูลรายงานหลังจาก insert จะเลือกเฉพาะ `id` เท่านั้น:

```javascript
// สมมติว่า reportData คือข้อมูลที่จะ insert
const newReportIds = await db('onsite_reports').insert(reportData).returning('id');
const newReportId = newReportIds[0]; // ได้ ID ของรายงานที่สร้างใหม่

// ดึงข้อมูลรายงานที่เพิ่งสร้าง โดยเลือกเฉพาะ 'id'
const createdReport = await db('onsite_reports')
  .select('id') // <<< ปัญหาอยู่ตรงนี้: ลืม select 'sign_token'
  .where({ id: newReportId })
  .first();

// createdReport จะมีลักษณะเป็น { id: 123 }
// เมื่อนำไปสร้างลิงก์: `/sign/onsite-report/${createdReport.sign_token}` จะได้ `/sign/onsite-report/null`
```

**หลังการแก้ไข (After Fix):**
เปลี่ยน `.select('id')` เป็น `.select('id', 'sign_token')` เพื่อให้มั่นใจว่า `sign_token` ถูกดึงกล��บมาพร้อมกับข้อมูลรายงาน:

```javascript
// สมมติว่า reportData คือข้อมูลที่จะ insert
const newReportIds = await db('onsite_reports').insert(reportData).returning('id');
const newReportId = newReportIds[0]; // ได้ ID ของรายงานที่สร้างใหม่

// ดึงข้อมูลรายงานที่เพิ่งสร้าง โดยเลือก 'id' และ 'sign_token'
const createdReport = await db('onsite_reports')
  .select('id', 'sign_token') // <<< แก้ไขตรงนี้: เพิ่ม 'sign_token'
  .where({ id: newReportId })
  .first();

// createdReport จะมีลักษณะเป็น { id: 123, sign_token: 'aBcDeFgHiJkLmNoPqRsT' }
// เมื่อนำไปสร้างลิงก์: `/sign/onsite-report/${createdReport.sign_token}` จะได้ `/sign/onsite-report/aBcDeFgHiJkLmNoPqRsT`
```

## 4. How Signing System Works

ระบบการลงนาม (Signing System) ของ CIT ถูกออกแบบมาเพื่อให้ผู้��ช้งานภายนอก (หรือผู้ที่ได้รับมอบหมาย) สามารถลงนามในเอกสารหรือรายงานต่างๆ ได้อย่างปลอดภัยและมีประสิทธิภาพ โดยมีกลไกการทำงานดังนี้:

1.  **การสร้างเอกสาร/รายงาน:** เมื่อมีการสร้างเอกสารหรือรายงานที่ต้องการการลงนาม (เช่น Onsite Report) ระบบจะทำการสร้าง `sign_token` ที่ไม่ซ้ำกันและคาดเดาได้ยากสำหรับเอกสารนั้นๆ `sign_token` นี้จะถูกจัดเก็บไว้ในฐานข้อมูลพร้อมกับข้อมูลของเอกสาร
2.  **การสร้าง Signing Link:** ระบบจะใช้ `sign_token` ที่สร้างขึ้นนี้เพื่อสร้าง URL เฉพาะสำหรับเ��กสารนั้นๆ (เช่น `https://example.com/sign/report/{sign_token}`) ลิงก์นี้จะถูกส่งไปยังผู้ที่ต้องลงนาม
3.  **การเข้าถึงและตรวจสอบ:** เมื่อผู้รับลิงก์เข้าถึง URL ระบบจะใช้ `sign_token` ที่อยู่ใน URL เพื่อค้นหาและยืนยันเอกสารที่ถูกต้องจากฐานข้อมูล
4.  **การแสดงผลและลงนาม:** หาก `sign_token` ถูกต้องและเอกสารยังไม่ถูกลงนาม ระบบจะแสดงหน้าจอสำหรับลงนาม ผู้ใช้งานสามารถตรวจสอบเนื้อหาและดำเนินการลงนามอิเล็กทรอนิกส์ได้
5.  **การบันทึกสถานะ:** หลังจากลงนามสำเร็จ ระบบจะอัปเดตสถานะของเอกสารใ���ฐานข้อมูลว่าได้รับการลงนามแล้ว และอาจบันทึกข้อมูลผู้ลงนามและเวลาที่ลงนาม

`sign_token` ทำหน้าที่เป็นกลไกการยืนยันตัวตนแบบชั่วคราวและเฉพาะเจาะจง เพื่อให้มั่นใจว่าเฉพาะผู้ที่มีลิงก์เท่านั้นที่สามารถเข้าถึงและลงนามในเอกสารนั้นๆ ได้

## 5. Testing Steps

เพื่อให้มั่นใจว่าการแก้ไขทำงานได้อย่างถูกต้องและไม่มีผลกระทบข้างเคียง สามารถดำเนินการทดสอบตามขั้นตอนดังนี้:

1.  **Pre-requisite:** ตรวจสอบให้แน่ใจว่าโค้ดที่แก้ไขได้ถูก Deploy ไปยังสภาพแวดล้อมที่��้องการทดสอบแล้ว
2.  **สร้างรายงาน Onsite ใหม่:**
    *   เข้าสู่ระบบในฐานะผู้ใช้งานที่มีสิทธิ์สร้างรายงาน Onsite
    *   ดำเนินการสร้างรายงาน Onsite ใหม่ให้เสร็จสมบูรณ์
3.  **ตรวจสอบ Signing Link:**
    *   หลังจากสร้างรายงานสำเร็จ ให้ค้นหารายงานที่เพิ่งสร้างขึ้น
    *   ตรวจสอบลิงก์สำหรับลงนาม (Signing Link) ที่ระบบสร้างขึ้นสำหรับรายงานนั้น
    *   **คาดหวัง:** ลิงก์ควรมี `sign_token` ที่เป็นสตริงตัวอักษรและตัวเลขที่ถูกต้อง ไม่ใช่ `null` (เช่น `https://example.com/sign/onsite-report/aBcDeFgHiJkLmNoPqRsT`)
4.  **ทดสอบการเข้าถึงลิงก์:**
    *   คัดลอก Signing Link ที่ได้จากขั้นตอนที่ 3
    *   เปิดลิงก์นั้นในเบราว์เซอร์ (อาจใช้โหมด Incognito เพื่อจำลองผู้ใช้งานภายนอก)
    *   **คาดหวัง:** ระบบควรแสดงหน้าจอสำหรับลงนามของรายงาน Onsite ที่ถูกต้อง ไม่ควรแสดงข้อผิดพลาด "Page Not Found" หรือ "Invalid Token"
5.  **ทดสอบการลงนาม (Optional):**
    *   ดำเนินการลงนามในรายงานผ่านหน้าจอลงนาม
    *   **คาดหวัง:** การลงนามควรสำเร็จ และสถานะของรายงานควรเปลี่ยนเป็น "Signed" หรือตามที่กำหนดไว้

---
```