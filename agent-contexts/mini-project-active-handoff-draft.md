# 🌉 Mini-Project: Bi-Directional Active Handoff System (B3-Second-Brain ⇄ Avenger)

## 🎯 Objective
เพื่อสร้างระบบ **"Active Handoff Loop (สองทิศทาง)"** ที่เชื่อมระหว่าง **เจม (Gemini - Architect)** และ **Claude Code (Developer)** ช่วยให้เอเจนต์ทั้งสองสามารถคุยกัน แก้โค้ด สลับหน้างานกันเอง และอัปเดตสรุปข้อมูลอย่างขนานคู่กันไปได้ทันทีโดยคุณบีสามไม่ต้องคอยสลับหน้าต่างก๊อปปี้ข้อความส่งต่อ

---

## 🛠️ System Architecture

ระบบนี้จะทำงานบนการเฝ้าสังเกตไฟล์ประสานงาน (File Watcher) หลังบ้านของเครื่อง Dell:

```
[ คุณบีสาม สั่งผ่านช่องทางใดช่องทางหนึ่ง ]
                   │
                   ▼
  ┌──────────────────────────────────┐
  │ สะพานข้อมูล (BRIDGE_COORDINATION.txt) │
  └────────────────┬─────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  ┌──────────────┐   ┌──────────────┐
  │  เจม (GEM)   │   │ Claude Code  │
  │ (API Watcher)│   │ (CLI Watcher)│
  └──────────────┘   └──────────────┘
```

### 1. โครงสร้างไฟล์สะพานข้อมูล (`BRIDGE_COORDINATION.txt`)
เราใช้ไฟล์ดิบตัวนี้เป็นจุดเซนเซอร์หลัก โดยแบ่งโครงสร้างบันทึกสเตตัสและเวลาดังนี้:
*   `[TIMESTAMP] Asia/Bangkok Time`
*   `[ACTIVE_AGENT] GEM | CLAUDE`
*   `[HANDOVER_TASK] เนื้อหาหรือบรีฟคำสั่งปฏิบัติการเชิงลึก`

---

## 📅 Action Plan & Implementation Steps

### Step 1: สร้างตัวเฝ้าสังเกตไฟล์สองฝั่ง (Bi-Directional Watcher Script)
สร้างสคริปต์ `scripts/active-handoff-loop.js` ขึ้นมาบน Node.js ทำหน้าที่:
1.  เฝ้าจับตาดู (Watch) การแก้ไขไฟล์ `BRIDGE_COORDINATION.txt`
2.  เมื่อ **GEM** ส่งสัญญาณ `[ACTIVE_AGENT] CLAUDE` -> สคริปต์จะใช้ `exec` รันคำสั่ง **`npx @anthropic-ai/claude-code`** นำเนื้อหาจาก `[HANDOVER_TASK]` ป้อนเข้าทาง `stdin` ของ Claude อัตโนมัติ
3.  เมื่อ **Claude** ทำงานเสร็จและอัปเดตเปลี่ยนค่าเป็น `[ACTIVE_AGENT] GEM` -> สคริปต์จะเรียกใช้งาน `proxy-messenger.js` เพื่อส่งบรีฟผลการรัน กลับไปให้ **เจม (Gemini API)** ประมวลผลและอัปเดตสร้างไฟล์วิกิทันที

---

## 📌 GEM'S REQUEST FOR CLAUDE:
> **"ส่งต่องานให้ Claude อ่านไฟล์ [mini-project-active-handoff-draft.md] เพื่อเขียนสคริปต์ Node.js สร้างตัว Watcher ขวา-ซ้ายแบบประสานงานตามโครงสร้างนี้ได้เลยครับ! — 2026-05-31 16:25 ICT"**
