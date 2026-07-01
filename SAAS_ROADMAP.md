# SaaS Roadmap — ระบบจัดตารางเรียน (Multi-tenant)

> สถาปัตยกรรม: **Shared MySQL + school_id isolation** | Hosting: VPS (self-hosted) | Billing: รายปี (annual subscription)

---

## สถานะปัจจุบัน (Baseline)

- Single-tenant — ไม่มี `school_id` ในตาราง
- Auth system พร้อม (NextAuth v5, JWT, bcrypt)
- Role: `admin` / `user` (ระดับ app)
- Deploy: localhost XAMPP

---

## Phase 0 — Cloud Deployment (ก่อนทำ Multi-tenant)

**เป้าหมาย:** ย้ายระบบขึ้น cloud ให้เข้าถึงได้จากภายนอก

### งานที่ต้องทำ

- [ ] เช่า VPS (แนะนำ: DigitalOcean / Vultr / Hetzner — ~$6-12/เดือน)
- [ ] ติดตั้ง Node.js, MySQL, Nginx, PM2 บน VPS
- [ ] ซื้อ domain (เช่น `schoolschedule.loei1.app`)
- [ ] SSL certificate (Let's Encrypt / Certbot)
- [ ] ตั้งค่า `.env.production` แยกจาก `.env.local`
- [ ] Deploy Next.js ด้วย PM2 หรือ Docker
- [ ] MySQL remote access + firewall rules
- [ ] Automated backup ทุกวัน (mysqldump → S3 / Backblaze B2)
- [ ] ตั้ง NEXTAUTH_URL ให้ตรง domain จริง

### ผลลัพธ์

โรงเรียนบ้านห้วยตาดสามารถเข้าใช้ผ่าน browser จากที่ไหนก็ได้

---

## Phase 1 — Multi-tenant Database (งานใหญ่ที่สุด)

**เป้าหมาย:** แยกข้อมูลแต่ละโรงเรียนใน MySQL database เดียวกัน

### 1.1 สร้าง `Schools` table ใหม่

```sql
CREATE TABLE Schools (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  affiliation VARCHAR(255),
  logo_url    LONGTEXT,
  address     TEXT,
  phone       VARCHAR(50),
  email       VARCHAR(255),
  status      ENUM('pending','active','suspended') DEFAULT 'pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  approved_by INT -- Users.id ของ super admin
);
```

### 1.2 เพิ่ม `school_id` ในทุกตาราง

ตารางที่ต้องเพิ่ม `school_id INT NOT NULL` + Foreign Key:

| ตาราง | หมายเหตุ |
|---|---|
| `AcademicTerms` | |
| `GradeLevels` | |
| `Departments` | |
| `Buildings` | |
| `Teachers` | |
| `Subjects` | |
| `Rooms` | |
| `Classes` | |
| `TimeSlots` | |
| `CourseAssignments` | |
| `Schedules` | |
| `FixedActivities` | |
| `SchoolSettings` | เปลี่ยน 1:1 → 1:school |
| `Signatories` | |
| `Users` | เพิ่ม `school_id` (nullable สำหรับ Super Admin) |

Migration script สร้างทีละตาราง ไม่ทำพร้อมกัน

### 1.3 อัปเดต API Routes ทั้งหมด

ทุก GET/POST/PUT/DELETE ต้องเพิ่ม `WHERE school_id = ?` — ประมาณ **50+ queries**

กลยุทธ์: สร้าง helper `getSchoolId(session)` return `school_id` จาก session token
แล้วทุก route เรียก helper นี้ก่อน query

```typescript
// lib/tenant.ts
export async function getSchoolId(): Promise<number> {
  const session = await auth();
  const schoolId = (session?.user as any)?.school_id;
  if (!schoolId) throw new Error('No school context');
  return schoolId;
}
```

### 1.4 เพิ่ม `school_id` ใน JWT/Session

```typescript
// auth.ts — jwt callback
token.school_id = dbUser?.school_id ?? null;
token.role = dbUser?.role ?? 'user';      // 'super_admin' | 'admin' | 'user'
```

### Role ใหม่

| Role | ขอบเขต | หมายเหตุ |
|---|---|---|
| `super_admin` | ทั้งระบบ | เห็นทุกโรงเรียน |
| `admin` | โรงเรียนตัวเอง | จัดการ user ในโรงเรียน |
| `user` | โรงเรียนตัวเอง | ใช้งานเท่านั้น |

### ผลลัพธ์

2 โรงเรียนสามารถ login เข้าระบบเดียวกัน เห็นเฉพาะข้อมูลตัวเอง

---

## Phase 2 — School Onboarding

**เป้าหมาย:** โรงเรียนสมัครเองได้ + Super Admin อนุมัติ

### 2.1 หน้าสมัครโรงเรียน (`/register/school`)

ข้อมูลที่เก็บ:
- ชื่อโรงเรียน, สังกัด, จังหวัด
- ชื่อผู้ติดต่อ (ผอ. หรือแอดมิน)
- อีเมล, เบอร์โทร
- เหตุผลที่ต้องการใช้

สร้าง record ใน `Schools (status='pending')` + `Users (role='admin', school_id=...)`

### 2.2 Super Admin อนุมัติ/ปฏิเสธ

- กด **Approve** → `status='active'`, ส่งอีเมลต้อนรับ + credentials
- กด **Reject** → `status='rejected'`, ส่งอีเมลแจ้งเหตุผล
- กด **Suspend** → `status='suspended'`, block ไม่ให้ login

### 2.3 Auto-provisioning เมื่อ Approve

Seed ข้อมูลพื้นฐานให้โรงเรียนใหม่อัตโนมัติ:
- GradeLevels: ป.1–ป.6 (หรือตาม template ที่เลือก)
- Departments: 9 กลุ่มสาระมาตรฐาน
- TimeSlots: โครงสร้างคาบ 8 คาบ/วัน (ค่า default)
- AcademicTerm: ปีการศึกษาปัจจุบัน

### ผลลัพธ์

โรงเรียนใหม่ approve แล้วเข้าใช้ได้เลย ไม่ต้องตั้งค่าพื้นฐานใหม่ทั้งหมด

---

## Phase 3 — Subscription & Billing

**เป้าหมาย:** ระบบ annual subscription + ปิดการใช้งานเมื่อหมดอายุ

### 3.1 `Subscriptions` table

```sql
CREATE TABLE Subscriptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  school_id    INT NOT NULL UNIQUE,
  plan         ENUM('trial','basic','standard','unlimited') DEFAULT 'trial',
  status       ENUM('active','expired','cancelled') DEFAULT 'active',
  started_at   DATETIME NOT NULL,
  expires_at   DATETIME NOT NULL,
  renewed_by   INT,  -- Users.id ของ super admin ที่ต่ออายุ
  price_thb    INT,  -- ราคาที่ชำระจริง (บาท)
  note         TEXT, -- หลักฐานการโอนเงิน / เลข ref
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES Schools(id)
);
```

### 3.2 แผนราคา (ตัวอย่าง)

| Plan | ราคา/ปี | ครู | ห้องเรียน | Feature |
|---|---|---|---|---|
| Trial | ฟรี 30 วัน | 10 | 5 | ทุก feature |
| Basic | 1,500 ฿ | 30 | 15 | ทุก feature |
| Standard | 3,000 ฿ | 100 | 50 | ทุก feature |
| Unlimited | 6,000 ฿ | ไม่จำกัด | ไม่จำกัด | ทุก feature |

### 3.3 Middleware เช็ก Subscription

```typescript
// middleware.ts เพิ่ม
// ถ้า subscription expired → redirect /subscription-expired
// ยกเว้น super_admin (เห็นทุกอย่างเสมอ)
```

### 3.4 การรับเงิน (Thai context)

- รับ **โอนเงิน / PromptPay** แล้ว Super Admin กดอัปเดตใน console
- ไม่ integrate payment gateway ในระยะแรก (ลดความซับซ้อน)
- อนาคต: ต่อกับ Omise / GB Prime Pay ถ้า volume เยอะ

### 3.5 แจ้งเตือนหมดอายุ

- 30 วัน, 7 วัน, 1 วัน ก่อนหมด → ส่งอีเมลแจ้ง admin โรงเรียน
- ใช้ cron job (Node.js `node-cron` หรือ PM2 cron)

### ผลลัพธ์

Super Admin ต่ออายุ subscription ให้โรงเรียนได้ + โรงเรียนถูก block อัตโนมัติเมื่อหมดอายุ

---

## Phase 4 — Super Admin Console

**เป้าหมาย:** หน้า dashboard ควบคุมทุกโรงเรียน (`/superadmin`)

### 4.1 School Directory

- ตารางโรงเรียนทั้งหมด: ชื่อ, สถานะ, แผน, วันหมดอายุ, จำนวน user
- ค้นหา/filter ตาม status, plan, จังหวัด
- ปุ่ม: Approve / Suspend / Activate / View Detail

### 4.2 Subscription Management

- รายชื่อโรงเรียนที่กำลังจะหมดอายุ (30 วัน)
- กดต่ออายุ: เลือก plan + ระยะเวลา + บันทึกหลักฐาน
- ประวัติการต่ออายุทั้งหมด

### 4.3 Impersonation (Login as School Admin)

- กด "เข้าระบบในฐานะ" ที่โรงเรียนใด → สร้าง short-lived token
- session จะมี flag `impersonating: true` + `original_super_admin_id`
- แสดง banner สีแดงในทุกหน้า: "คุณกำลังดูระบบในฐานะโรงเรียน X"
- ปุ่ม "ออกจากโหมดนี้" กลับ session เดิม
- **บันทึก audit log** ทุกครั้งที่ใช้ impersonation

### 4.4 System Announcements

```sql
CREATE TABLE Announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  type       ENUM('info','warning','maintenance') DEFAULT 'info',
  target     ENUM('all','specific') DEFAULT 'all',
  show_from  DATETIME NOT NULL,
  show_until DATETIME NOT NULL,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

แสดงเป็น banner ใน Navbar ของทุกโรงเรียนที่ได้รับ

### 4.5 Usage Analytics

- Active schools วันนี้ / เดือนนี้
- Login count ต่อวัน (aggregate)
- Top schools by activity
- Revenue summary: รายได้ต่อเดือน, แผนไหนนิยมที่สุด

---

## Phase 5 — Quota & Feature Flags

**เป้าหมาย:** จำกัดทรัพยากรตาม plan

### 5.1 Quota Enforcement

```typescript
// ตรวจก่อน INSERT teacher/class
const quota = await getQuota(school_id);
const count = await countTeachers(school_id);
if (count >= quota.max_teachers) {
  return 409 'เกินจำนวนที่ plan อนุญาต';
}
```

Quota ต่อ plan เก็บใน config / table `Plans`

### 5.2 Feature Flags

```sql
CREATE TABLE SchoolFeatures (
  school_id    INT PRIMARY KEY,
  substitute   BOOLEAN DEFAULT TRUE,   -- ระบบจัดสอนแทน
  auto_schedule BOOLEAN DEFAULT FALSE, -- จัดตารางอัตโนมัติ (premium)
  batch_print  BOOLEAN DEFAULT TRUE,
  export_excel BOOLEAN DEFAULT FALSE   -- อนาคต
);
```

ตรวจใน middleware หรือ API route ก่อน render/execute

---

## Phase 6 — Hardening & Scale

**เป้าหมาย:** เสถียรภาพระบบ production

- [ ] Rate limiting per school (ป้องกัน abuse)
- [ ] Audit log ทุก action สำคัญ (login, delete, impersonate)
- [ ] Per-school database backup (export เฉพาะของโรงเรียนนั้น)
- [ ] Error monitoring (Sentry หรือ self-hosted Glitchtip)
- [ ] Health check endpoint (`/api/health`)
- [ ] Zero-downtime deploy strategy
- [ ] MySQL read replica ถ้า load สูง

---

## เรียงลำดับ Priority

```
Phase 0 (Deploy)
    ↓
Phase 1 (Multi-tenant DB) ← งานใหญ่ที่สุด ทำก่อน
    ↓
Phase 2 (Onboarding)
    ↓
Phase 3 (Subscription)
    ↓
Phase 4 (Super Admin Console)
    ↓
Phase 5 (Quota/Feature)
    ↓
Phase 6 (Hardening)
```

---

## ไฟล์ที่จะได้รับผลกระทบใน Phase 1 (ประมาณการ)

| ประเภท | จำนวนไฟล์ |
|---|---|
| `app/api/*/route.ts` | ~20 ไฟล์ |
| `app/*/page.tsx` | ~15 ไฟล์ |
| `lib/` | 2-3 ไฟล์ใหม่ |
| `auth.ts`, `middleware.ts` | 2 ไฟล์ |
| Migration SQL scripts | ~1 ไฟล์ใหญ่ |

**ประมาณเวลา Phase 1**: 2-3 สัปดาห์ (ทำทีละ module ไม่ทำพร้อมกัน)
