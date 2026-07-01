# วิเคราะห์ระบบ GAS → Next.js Migration

## ภาพรวม GAS System

ระบบ GAS ชื่อ **Substitute Teacher Scheduling and Notification System** (โรงเรียนบ้านห้วยตาด)  
เขียนด้วย Google Apps Script + HTML หนึ่งไฟล์ ทำงานบน Google Sheets 4 ชีท

---

## ฟีเจอร์ทั้งหมดของ GAS

| ฟีเจอร์ | รายละเอียด |
|---|---|
| **Smart Assignment** | หาครูว่างจาก Master_Schedule + ตรวจ double-booking จาก Sub_Manager |
| **Load Balancing** | เรียงลำดับครูตาม: คาบที่สอนวันนี้น้อยสุด → สอนแทนเดือนนี้น้อยสุด → ชื่อ A-Z |
| **Workload Guard** | เตือนถ้าครูจะมีคาบรวม ≥ 6 คาบ/วัน |
| **Leave Types** | ลากิจ, ลาป่วย, ไปราชการ, แลกคาบ — แต่ละแบบมี Morning/Afternoon/Specific variant |
| **LINE Notification** | Push message เข้ากลุ่ม LINE รวม pending ทั้งหมดในข้อความเดียว |
| **Auto-Expire** | Pending ที่วันผ่านไปแล้ว → mark Expired อัตโนมัติ |
| **Locked Periods** | พฤหัส คาบ 6 (ลูกเสือ), ศุกร์ คาบ 6 (ชุมนุม) — ห้ามจัดสอนแทน |
| **Teacher CRUD** | เพิ่ม/ลบ/toggle Active/Inactive + cascade ลบ Master_Schedule |
| **Statistics** | นับ leave_count, sub_count ต่อครู กรองตามเดือน/ปีการศึกษา + Chart.js |
| **History** | ดูประวัติสอนแทนย้อนหลังตามวันที่ |
| **Dashboard** | จำนวนครู, pending วันนี้, sent วันนี้, total เดือนนี้ |
| **LINE Registration** | ครู DM รหัสครู (เช่น T01) → ระบบบันทึก LINE userId ลง Teachers sheet |
| **Web UI** | SPA 5 tabs: หน้าหลัก / จัดสอนแทน / ข้อมูลครู / ตารางสอน / สถิติครู |

---

## เปรียบเทียบ Data Model

### GAS Sheets → Next.js MySQL

| GAS Sheet | Next.js Equivalent | หมายเหตุ |
|---|---|---|
| `Teachers` | `Teachers` table | มีอยู่แล้ว แต่ GAS เก็บ LINE_User_ID และ Leave_Count/Sub_Count เพิ่ม |
| `Master_Schedule` | `Schedules` table | ซ้อนทับกัน — GAS เก็บ Teacher+Day+Period+Subject+Class, ระบบเราเก็บแบบเดียวกันแต่ละเอียดกว่า (รวม room, timeslot FK) |
| `Sub_Manager` | **ยังไม่มี** — ต้องสร้างใหม่ `SubRequests` |  |
| `System_Config` | `.env.local` | LINE token → env var |

### Fields ใหม่ที่ต้องเพิ่ม

```sql
-- เพิ่มใน Teachers table
ALTER TABLE Teachers ADD COLUMN line_user_id VARCHAR(50) NULL;
ALTER TABLE Teachers ADD COLUMN leave_count INT DEFAULT 0;
ALTER TABLE Teachers ADD COLUMN sub_count INT DEFAULT 0;

-- ตารางใหม่: บันทึกการลา
CREATE TABLE TeacherLeave (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id  INT NOT NULL,
  date        DATE NOT NULL,
  type        VARCHAR(50) NOT NULL,  -- Leave, SickLeave, OfficialDuty, Swap
  scope       VARCHAR(20) DEFAULT 'all',  -- all, morning, afternoon, specific
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES Teachers(id)
);

-- ตารางใหม่: log การจัดสอนแทน
CREATE TABLE SubRequests (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  log_id            VARCHAR(20) UNIQUE,
  date              DATE NOT NULL,
  day_of_week       VARCHAR(20),
  leave_type        VARCHAR(50),
  absent_teacher_id INT NOT NULL,
  timeslot_id       INT NOT NULL,      -- FK → TimeSlots (แทน period number)
  class_id          INT,               -- FK → Classes
  subject_id        INT,               -- FK → Subjects (auto-lookup จาก Schedules)
  sub_teacher_id    INT,               -- FK → Teachers
  notify_status     ENUM('Pending','Sent','Failed','Expired') DEFAULT 'Pending',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (absent_teacher_id) REFERENCES Teachers(id),
  FOREIGN KEY (timeslot_id) REFERENCES TimeSlots(id),
  FOREIGN KEY (class_id) REFERENCES Classes(id),
  FOREIGN KEY (subject_id) REFERENCES Subjects(id),
  FOREIGN KEY (sub_teacher_id) REFERENCES Teachers(id)
);
```

---

## Algorithm หลัก: `findAvailableTeachers`

GAS ทำงานอย่างนี้ (แปลงมาเป็น logic ของเรา):

```
INPUT: date, timeslot_id, term_id

1. คำนวณ day_of_week จาก date

2. Query Schedules WHERE timeslot_id = X AND day = day_of_week AND term_id = Y
   → busyTeacherIds (สอนอยู่แล้วในคาบนั้น)

3. Query SubRequests WHERE date = X AND timeslot_id = Y AND status NOT IN ('Failed','Expired')
   → alreadySubbingIds (รับจัดสอนแทนคาบนั้นไปแล้ว)

4. Query TeacherLeave WHERE date = X
   → absentTeacherIds (ลาในวันนั้น)

5. Teachers WHERE is_active = TRUE
   AND id NOT IN (busyTeacherIds ∪ alreadySubbingIds ∪ absentTeacherIds)
   → candidates

6. เรียง candidates โดย:
   a. จำนวนคาบที่สอนวันนี้ (จาก Schedules) ASC
   b. จำนวนสอนแทนเดือนนี้ (จาก SubRequests) ASC
   c. ชื่อ ASC (tie-break)

OUTPUT: sorted teacher list พร้อม metadata
```

---

## ประเมินความเป็นไปได้

### ✅ ทำได้ทันที (High Confidence)

| ส่วน | เหตุผล |
|---|---|
| Core algorithm | Logic ชัดเจน port เป็น `/api/substitute/available` ได้เลย ข้อมูลมีครบใน Schedules+Teachers |
| SubRequests CRUD | เป็น standard REST API, schema ออกแบบได้ไม่ซับซ้อน |
| Leave tracking | `TeacherLeave` table ตรงไปตรงมา |
| Auto-expire | cron job หรือ middleware ตรวจเมื่อ load หน้า |
| History/Stats | SQL aggregate query ไม่ซับซ้อน |

### ⚠️ ต้องคิดเพิ่ม (Medium Complexity)

| ส่วน | ปัญหา | แนวทาง |
|---|---|---|
| **Timeslot mapping** | GAS ใช้ period number (1,2,3...) แต่ระบบเราใช้ `timeslot_id` FK + มี Break/Assembly ด้วย | ต้อง filter เฉพาะ type='Study' แล้ว map index → timeslot |
| **Locked periods** | GAS hardcode วัน+คาบ | ระบบเรามี `FixedActivities` อยู่แล้ว — ใช้ตรวจว่า timeslot ถูก lock ไหมแทน |
| **Workload Guard** | GAS ใช้ threshold 6 คาบ | port ตรง ๆ โดย count Schedules + SubRequests รวมกัน |
| **Multi-period leave** | ลา "ครึ่งเช้า" ต้องรู้ว่าคาบไหนคือ "ช่วงเช้า" | ใช้ TimeSlots.order_index + เวลา หรือกำหนด morning/afternoon range ใน config |

### ❌ ต้องเขียนใหม่ทั้งหมด (GAS-specific)

| ส่วน | เหตุผล |
|---|---|
| `onEdit` trigger | ไม่มีใน Next.js — แทนด้วย `onChange` ใน UI เรียก API |
| `SpreadsheetApp.*` | ทั้งหมดแทนด้วย MySQL queries |
| `HtmlService` Web App | แทนด้วย Next.js pages ปกติ |
| GAS deploy/webhook setup | ไม่จำเป็น — Next.js รัน HTTP server เองอยู่แล้ว |

### 🔔 LINE Notification

```
GAS approach: pushToLine(groupId, message, token)
→ ทำเหมือนกันเลยใน Next.js:

POST /api/notify/line
Body: { subRequestIds: number[] }
→ รวม pending rows → build message → POST api.line.me/v2/bot/message/push
→ อัปเดต notify_status = 'Sent'

ต้องเพิ่มใน .env.local:
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_GROUP_ID=...
```

---

## สถานะปัจจุบัน (อัปเดต 2026-06-30)

### Phase 1 ✅ เสร็จ — Infrastructure

| สิ่งที่ทำ | ไฟล์ | สถานะ |
|---|---|---|
| ALTER TABLE teachers (line_user_id, leave_count, sub_count) | `scripts/migrate-substitute.js` | ✅ รันแล้ว — columns มีใน DB |
| สร้าง `TeacherLeave` table | `scripts/migrate-substitute.js` | ✅ อยู่ใน DB แล้ว |
| สร้าง `SubRequests` table (log_id, notify_status, FK ทั้งหมด) | `scripts/migrate-substitute.js` | ✅ อยู่ใน DB แล้ว |
| `/api/teacher-leave` GET/POST/DELETE | `app/api/teacher-leave/route.ts` | ✅ |
| `/api/substitute/available` — findAvailableTeachers | `app/api/substitute/available/route.ts` | ✅ sort by periods_today → monthly_sub_count → name |
| `/api/sub-requests` GET/POST/PATCH/DELETE + auto-expire | `app/api/sub-requests/route.ts` | ✅ รวม transaction + log_id auto-gen |
| `/api/substitute/teacher-schedule` — ดึงตารางสอนของครูในวันนั้น | `app/api/substitute/teacher-schedule/route.ts` | ✅ (เพิ่มนอกแผนเดิม) |

**Bug fixes ใน Phase 1:**
- `periods_today` นับทั้ง master schedule + SubRequests ของวันนั้น (ไม่ใช่แค่ตารางหลัก)
- `teacher-schedule` API กรองคาบที่มี SubRequest Pending/Sent อยู่แล้วออก — ไม่ให้จัดซ้ำ

### Phase 2 ✅ เสร็จ — UI หลัก

| สิ่งที่ทำ | ไฟล์ | สถานะ |
|---|---|---|
| `/substitute` page เต็ม — สีน้ำเงิน | `app/substitute/page.tsx` | ✅ |
| ThaiDatePicker (วว/ดด/ปปปป พ.ศ.) | `components/ThaiDatePicker.tsx` | ✅ |
| Scope selector — iOS segmented control | — | ✅ |
| Period cards + sub teacher dropdown (sorted by load) | — | ✅ parallel fetch candidates ทุกคาบ |
| Overload warning ≥ 5 คาบ | — | ✅ |
| บันทึก TeacherLeave อัตโนมัติตอน confirm | — | ✅ (ignore ถ้า 409 ซ้ำ) |
| Dashboard stats widget (pending_today / sent_today / total_month) | — | ✅ |
| 4 tabs: จัดสอนแทน / วันนี้ / ประวัติ / ตั้งค่า LINE | — | ✅ |
| History filters: date range, teacher, status (default = Sent) | — | ✅ default เดือนปัจจุบัน |
| CRUD Pending records: เปลี่ยนครูสอนแทน / ลบ | — | ✅ edit inline + confirm delete |
| Period numbering sequential (1,2,3,4... ไม่ใช่ order_index) | — | ✅ ใช้ `idx + 1` |
| Navbar link "จัดสอนแทน" (desktop + mobile) | `components/Navbar.tsx` | ✅ |

### Phase 3 ✅ เสร็จ — Notification

| สิ่งที่ทำ | ไฟล์ | สถานะ |
|---|---|---|
| `SystemConfig` table (DB-side config store) | auto-create ตอน first access | ✅ |
| `lib/systemConfig.ts` — `getConfig(key, envFallback)` | `lib/systemConfig.ts` | ✅ DB first → env fallback |
| `/api/settings` GET/POST — อ่าน/บันทึก config, mask sensitive | `app/api/settings/route.ts` | ✅ |
| `/api/notify/line` — ส่ง LINE push, mark Sent/Failed, `?test=1` mode | `app/api/notify/line/route.ts` | ✅ |
| `components/LineSettings.tsx` — token, group ID, save, test | `components/LineSettings.tsx` | ✅ shared component |
| ปุ่ม "ส่งแจ้งเตือน LINE" ใน stats widget | `app/substitute/page.tsx` | ✅ |
| Tab "ตั้งค่า LINE" ใน /substitute | — | ✅ ย้ายออกจาก Navbar |
| `.env.local` — placeholder สำหรับ LINE credentials | `.env.local` | ✅ (ต้องใส่ค่าจริง) |

> **หมายเหตุ:** LINE_CHANNEL_ACCESS_TOKEN และ LINE_GROUP_ID ใน `.env.local` ยังเป็น placeholder — ต้องใส่ค่าจริงหรือตั้งค่าผ่าน UI tab "ตั้งค่า LINE"

### Phase 4 — Statistics (ยังไม่ทำ)

- [ ] `/substitute/stats` page — chart sub count / leave count ต่อครู
- [ ] กรองตามเดือน/ปีการศึกษา

---

## แผนการพัฒนา (Suggested Phases — เดิม)

### Phase 1 — Infrastructure (ทำก่อน)
- [x] รัน ALTER TABLE เพิ่ม `line_user_id`, `leave_count`, `sub_count` ใน Teachers
- [x] สร้าง `TeacherLeave` table
- [x] สร้าง `SubRequests` table
- [x] `/api/teacher-leave` (CRUD)
- [x] `/api/substitute/available` (findAvailableTeachers algorithm)
- [x] `/api/sub-requests` (CRUD + auto-expire logic)

### Phase 2 — UI หลัก
- [x] `/substitute` page: เลือกครูขาด + วัน + ประเภทลา + scope → แสดงคาบ → เลือกครูแทน → confirm
- [x] scope: ทั้งวัน / ครึ่งเช้า / ครึ่งบ่าย / เฉพาะคาบ (segmented control)
- [x] history tab พร้อม filter ครบ
- [x] Dashboard stats widget (pending today, sent today, total month)
- [x] CRUD Pending records ก่อนส่ง LINE

### Phase 3 — Notification
- [x] เพิ่ม `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_GROUP_ID` ใน `.env.local`
- [x] `/api/notify/line` route + `?test=1` mode
- [x] `/api/settings` route + `lib/systemConfig.ts`
- [x] `LineSettings` component + tab ตั้งค่า LINE ใน /substitute
- [x] ปุ่ม "ส่งแจ้งเตือน LINE" ใน UI

### Phase 4 — Statistics
- [ ] `/substitute/stats` page — chart sub count / leave count ต่อครู
- [ ] กรองตามเดือน/ปีการศึกษา

---

## จุดที่ระบบเราดีกว่า GAS

| ด้าน | GAS | ระบบเรา |
|---|---|---|
| Data integrity | ไม่มี FK, ข้อมูลซ้ำได้ | MySQL FK + constraint |
| Schedules resolution | Day_of_Week + Period number (string) | TimeSlot FK พร้อม order_index และ type |
| Room tracking | ไม่มี | มี room_id ใน Schedules |
| Multi-class | ไม่ชัด | Class FK ชัดเจน |
| Dark mode / UX | ไม่มี | มี ThemeProvider |
| Concurrent access | Google Sheets อาจ conflict | MySQL transaction-safe |

---

## สรุป

**ทำได้ — แนะนำให้พัฒนา Phase 1-2 ก่อน**

Logic หลักของ GAS (หาครูว่าง + load balancing + บันทึก log) port มาได้ตรง ๆ เพราะข้อมูล Teachers และ Schedules มีอยู่ในระบบครบแล้ว  
ส่วนที่ต้องระวังคือการ map `timeslot_id` กับ "period number" ของ GAS ซึ่งต้องกำหนด convention ให้ชัดก่อน  
LINE notification เพิ่มได้ใน Phase 3 โดยไม่กระทบ Phase 1-2

> **Estimated new tables:** 2 ตาราง (`TeacherLeave`, `SubRequests`) + 3 columns ใน `Teachers`  
> **Estimated new API routes:** ~6 endpoints  
> **Estimated new pages:** 1-2 pages (`/substitute`, `/substitute/stats`)
