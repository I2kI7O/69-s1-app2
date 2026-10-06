# 69-s1-app2 — ระบบจัดการยืม-คืนอุปกรณ์คอมพิวเตอร์ (Equipment Loan System)

## My Information

- Wachirawit Kantho
- 012-6

---

## 1. ภาพรวมของระบบ

ระบบสำหรับบันทึกการ **ยืม-คืนอุปกรณ์คอมพิวเตอร์** ของหน่วยงาน (โน้ตบุ๊ก โปรเจคเตอร์ กล้อง ฯลฯ)
สร้างด้วย **Strapi 5 (TypeScript)** + **SQLite** โดยออกแบบให้ครอบคลุม 3 เงื่อนไขหลักของคู่มือ:

| หลักประกัน | การนำมาใช้จริงในระบบ |
|---|---|
| **Confidentiality** | เข้ารหัสข้อมูลอ่อนไหว 2 ฟิลด์ (`borrower_phone`, `equipment_serial`) ด้วย **AES-256-CBC** ก่อนลงฐานข้อมูล |
| **Integrity** | คำนวณ **MD5 Checksum** (`integrity_hash`) จากข้อมูลสำคัญ แล้วตรวจจับการแอบแก้ไขผ่าน endpoint `/verify` |
| **Least Privilege** | เปิดสิทธิ์ Public เฉพาะ `find`, `findOne`, `create`, `verifyIntegrity` — ไม่เปิด `update` / `delete` ให้สาธารณะ |

---

## 2. เทคโนโลยีที่ใช้

- Strapi 5.56.0 (Community) บน Node.js v24 — TypeScript
- SQLite (ไฟล์ `.tmp/data.db`) ผ่าน `better-sqlite3`
- `node:crypto` สำหรับ AES-256-CBC และ MD5 (ไม่ใช้ไลบรารีภายนอกเพิ่ม)
- `@strapi/plugin-users-permissions` สำหรับจัดการสิทธิ์ Public role

---

## 3. โครงสร้างไฟล์ที่สำคัญ

```
69-s1-app2/
├── src/
│   ├── index.ts                                   # bootstrap: ตั้งสิทธิ์ Public + seed ข้อมูลตัวอย่าง
│   └── api/equipment-loan/
│       ├── content-types/equipment-loan/
│       │   ├── schema.json                        # โมเดลข้อมูล (11 ฟิลด์)
│       │   └── lifecycles.ts                      # beforeCreate: ค่าเริ่มต้น + เข้ารหัส + สร้าง hash
│       ├── controllers/equipment-loan.ts          # ถอดรหัสอัตโนมัติ + verifyIntegrity
│       ├── routes/01-custom-equipment-loan.ts     # GET /:id/verify (auth: false)
│       ├── routes/equipment-loan.ts               # REST มาตรฐาน (CRUD)
│       ├── services/equipment-loan.ts
│       └── utils/
│           ├── cipher.ts                          # AES-256-CBC: encryptData / decryptData / isEncrypted
│           └── hash.ts                            # MD5: calculateLoanHash
├── dist/                                          # ผลลัพธ์การ compile TypeScript (npm run build)
├── api.http                                       # ไฟล์ทดสอบ REST API สำหรับ VS Code REST Client
├── .env                                           # DATA_ENCRYPTION_KEY (ห้าม commit ค่าจริง)
└── .tmp/data.db                                   # ฐานข้อมูล SQLite
```

---

## 4. กลไกความปลอดภัย

### 4.1 ข้อมูลอ่อนไหวที่เข้ารหัส (AES-256)

| ฟิลด์ | เนื้อหา |
|---|---|
| `borrower_phone` | เบอร์โทรศัพท์ผู้ยืม |
| `equipment_serial` | Serial Number ของอุปกรณ์ |

- **Algorithm:** `aes-256-cbc` (Key 32 bytes จาก `SHA-256(DATA_ENCRYPTION_KEY)` ใน `.env`, IV สุ่ม 16 bytes ทุกครั้ง)
- **รูปแบบที่เก็บใน DB:** `enc:<iv-hex>:<ciphertext-hex>`

```text
ตัวอย่างจริงในฐานข้อมูล
borrower_phone  = enc:3e7d34ff0ff1ae579cb3cf0952caedd9:0e68e23e267bc800e851a09508ec3d7b
equipment_serial = enc:69e437f229f83fe0b8e5f3468151d3a0:f11b53af76dedb843cab44d719732012
```

- ระบบ **ถอดรหัสอัตโนมัติ** ตอนตอบกลับ (`find` / `findOne` / `create`) ผู้ใช้จึงเห็นข้อความธรรมดาตามปกติ
- `isEncrypted()` ตรวจ `enc:` prefix เพื่อไม่ให้เข้ารหัสซ้ำซ้อน

### 4.2 การตรวจสอบความถูกต้อง (MD5)

`calculateLoanHash()` ต่อค่าจาก 9 ฟิลด์ (`loan_code`, `borrower_name`, `equipment_name`, `borrow_date`,
`return_date`, `status`, `fine_amount`, เบอร์โทร/Serial หลังถอดรหัส) ด้วยเครื่องหมาย `::` แล้วทำ **MD5**

- ถอดรหัสก่อนคำนวณ hash เพราะ IV สุ่มใหม่ทุกครั้ง ถ้า hash ค่าเข้ารหัสตรงๆ ค่าจะไม่คงที่
- `beforeCreate` ใน `lifecycles.ts` จะ: ตั้งค่าเริ่มต้น → เข้ารหัส → สร้าง hash **ตามลำดับนี้เท่านั้น**
  (ลำดับผิดจะทำให้ hash ไม่ตรงกันในทุก record)

### 4.3 Endpoint ตรวจสอบ: `GET /api/equipment-loans/:id/verify`

รับ `loan_code` หรือ `documentId` → คำนวณ hash ใหม่ → เทียบกับ `integrity_hash` ที่เก็บไว้

---

## 5. วิธีติดตั้งและรัน

```powershell
# 1) ติดตั้ง dependency
npm install

# 2) compile TypeScript ไปที่ dist/   ← บังคับต้องรันก่อน start
npm run build

# 3) เริ่มระบบ (port 1337)
npm run start
```

- Admin panel: http://localhost:1337/admin
- ระหว่างพัฒนาใช้ `npm run dev` ได้ (compile + reload อัตโนมัติ)

> **หมายเหตุสำคัญ:** `npm run start` รันไฟล์ที่ compile แล้วใน `dist/`
> ดังนั้น **แก้ไขไฟล์ใน `src/**` แล้วต้องรัน `npm run build` (หรือ `npx tsc`) ก่อน restart เสมอ**
> ไม่เช่นนั้นระบบจะยังรันโค้ดเก่าอยู่

### Bootstrap อัตโนมัติทุกครั้งที่เริ่มระบบ (`src/index.ts`)

```
[security] เปิดสิทธิ์ Public: ...find, ...findOne, ...create, ...verifyIntegrity
[seed] สร้างข้อมูลตัวอย่าง 5 รายการ        ← ทำเมื่อฐานข้อมูลยังว่างเท่านั้น
```

---

## 6. สิทธิ์ที่อนุญาต (Public role)

| Action | UID | ผล |
|---|---|---|
| find | `api::equipment-loan.equipment-loan.find` | ดึงรายการทั้งหมด |
| findOne | `api::equipment-loan.equipment-loan.findOne` | ดึงรายชิ้นเดียว |
| create | `api::equipment-loan.equipment-loan.create` | เพิ่มรายการยืมใหม่ |
| verifyIntegrity | `api::equipment-loan.equipment-loan.verifyIntegrity` | ตรวจสอบความถูกต้อง |

**ไม่ได้เปิด** `update` / `delete` / `publish` ให้ Public (ตรงตามหลัก Least Privilege)

---

## 7. ข้อมูลตัวอย่าง (5 รายการ)

| loan_code | ผู้ยืม | อุปกรณ์ | สถานะ |
|---|---|---|---|
| LN-2026-001 | Wachirawit Kantho | MacBook Pro M3 (CP-012) | borrowing |
| LN-2026-002 | สมชาย เรียนดี | Dell OptiPlex 7010 (CP-045) | returned |
| LN-2026-003 | สมหญิง รักเรียน | กล้อง Canon EOS 250D (CP-078) | borrowing |
| LN-2026-004 | วรรณา ใจดี | โปรเจคเตอร์ Epson EB-X06 (CP-101) | damaged (ค่าปรับ 1,500) |
| LN-2026-005 | อาทิตย์ มีไฟ | iPad Air 5 (CP-133) | borrowing |

---

## 8. รายการ API

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/equipment-loans` | ดึงทั้งหมด (ถอดรหัส AES-256 ให้อัตโนมัติ) |
| GET | `/api/equipment-loans?filters[loan_code][$eq]=LN-2026-001` | ค้นหา / ดึงรายชิ้นเดียว |
| POST | `/api/equipment-loans` | เพิ่มรายการ (เข้ารหัส + สร้าง MD5 อัตโนมัติ) |
| GET | `/api/equipment-loans/:loan_code_or_documentId/verify` | ตรวจสอบความถูกต้อง |

> ส่วน `PUT` / `PATCH` / `DELETE` ต้องใช้ token ของผู้ใช้ที่ login แล้ว (ไม่เปิดให้ Public)

### ตัวอย่าง POST

```json
POST /api/equipment-loans
Content-Type: application/json

{
  "data": {
    "loan_code": "LN-2026-006",
    "borrower_name": "Wachirawit Kantho",
    "borrower_phone": "081-234-5678",
    "equipment_name": "โน้ตบุ๊ก Lenovo ThinkPad (รหัสครุภัณฑ์ CP-150)",
    "equipment_serial": "PF-3XK9QL",
    "borrow_date": "2026-10-07",
    "status": "borrowing",
    "fine_amount": 0
  }
}
```

---

## 9. ผลการทดสอบ (Test Results)

| ทดสอบ | คำสั่ง | ผลลัพธ์ |
|---|---|---|
| สิทธิ์ Public | `GET /api/equipment-loans` | **200 OK** (ก่อนตั้งสิทธิ์ = 403) |
| route ที่ไม่มีจริง | `GET /api/nonexistent-xyz` | **404** (ยืนยันว่า 200 มาจาก permission จริง) |
| ดึงข้อมูล + ถอดรหัส | `GET /api/equipment-loans` | ได้ `borrower_phone = 081-234-5678` (ใน DB เป็น `enc:...`) |
| ค้นด้วย filter | `GET ?filters[loan_code][$eq]=LN-2026-001` | 200, count = 1 |
| สร้างข้อมูล | `POST /api/equipment-loans` | **201 Created**, บันทึกเป็น `enc:...` + `integrity_hash` |
| duplicate | `POST` loan_code ซ้ำ | **400** (unique constraint) |
| ตรวจสอบความถูกต้อง | `GET .../LN-2026-001/verify` | `is_valid: true`, `SECURE_AND_VERIFIED` |
| **จับการแอบแก้ไข** | แก้ `fine_amount = 9999` ใน DB ตรงๆ แล้ว verify | `is_valid: false`, `verification: TAMPER_DETECTED (DATA MODIFIED)` |
| คืนค่าแล้ว verify | restore ค่าเดิม | `is_valid: true` กลับมา |
| ข้อมูลใน DB | อ่านไฟล์ `.tmp/data.db` | เบอร์โทร/Serial เก็บเป็น `enc:` ทุกแถว, `borrower_name` เป็นข้อความไทย/อังกฤษปกติ |

### ตัวอย่างคำตอบเมื่อถูกแก้ไข

```json
{
  "loan_code": "LN-2026-001",
  "is_valid": false,
  "verification": "TAMPER_DETECTED (DATA MODIFIED)",
  "message": "แจ้งเตือนความปลอดภัย! ข้อมูลถูกแอบแก้ไขโดยตรงในฐานข้อมูล (MD5 Checksum Mismatch)",
  "security_info": {
    "confidentiality": {
      "borrower_phone_status": "AES-256 ENCRYPTED",
      "decrypted_borrower_phone": "081-234-5678"
    },
    "integrity": {
      "algorithm": "MD5",
      "stored_hash": "7bd42100b1804e6e13fc25eb45d17a27",
      "computed_hash": "466cf2fa3992081b5b4b533b682d15a8"
    }
  }
}
```

---

## 10. สาธิตการจับการแอบแก้ไข (Tamper Detection)

1. เรียก `GET /api/equipment-loans/LN-2026-001/verify` → ได้ `is_valid: true`
2. แก้ข้อมูลใน SQLite **โดยตรง** (ข้ามระบบ API) ด้วยวิธีใดก็ได้:
   - **DB Browser for SQLite** เปิด `.tmp/data.db` แล้วแก้ `fine_amount`
   - หรือ PowerShell/Node สั่ง `UPDATE equipment_loans SET fine_amount = 9999 WHERE loan_code = 'LN-2026-001'`
3. เรียก `GET .../verify` **ซ้ำ** → ระบบตอบ `is_valid: false` + `TAMPER_DETECTED`
   เพราะค่า MD5 ที่คำนวณใหม่ไม่ตรงกับ `integrity_hash` ที่ถูกบันทึกไว้ตอนสร้าง record
4. คืนค่า `fine_amount` เป็น `0` แล้ว verify อีกครั้ง → กลับเป็น `SECURE_AND_VERIFIED`

---

## 11. ไฟล์ทดสอบ API

เปิดไฟล์ `api.http` ด้วย VS Code Extension **REST Client** แล้วกด *Send Request* ได้ทันที
(ต้องรัน `npm run start` หรือ `npm run dev` ไว้ก่อน)

---

## 12. เช็กลิสต์ตามคู่มือ

| ข้อกำหนด | สถานะ |
|---|---|
| ชื่อโปรเจกต์ `69-s1-app2` | ✅ |
| ระบบของตัวเอง (ไม่ใช่ข้อมูลนักศึกษา / IT Helpdesk) | ✅ ระบบยืม-คืนอุปกรณ์ |
| Content-Type + REST API | ✅ `equipment-loan` collectionType |
| เข้ารหัส AES-256 อย่างน้อย 1-2 ฟิลด์ | ✅ 2 ฟิลด์ (`borrower_phone`, `equipment_serial`) |
| ตรวจสอบความถูกต้องด้วย MD5 | ✅ `integrity_hash` |
| Endpoint `/verify` | ✅ `GET /api/equipment-loans/:id/verify` |
| สิทธิ์ Public = find, findOne, create, verifyIntegrity | ✅ ตั้งอัตโนมัติตอน bootstrap |
| ข้อมูลตัวอย่างสำหรับสาธิต | ✅ 5 รายการ (seed อัตโนมัติเมื่อ DB ว่าง) |
| สาธิตจับการแก้ไขข้อมูล | ✅ ผ่านการทดสอบจริง |
