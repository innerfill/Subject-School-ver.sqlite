# Feature Map — ระบบจัดตารางเรียน

> อัปเดต: 2026-06-28 | วิเคราะห์จากโค้ดโดยตรง

---

## Pages & UI

| หน้า | สิ่งที่ทำได้ | สถานะ |
|------|------------|-------|
| `/` | Landing page, ลิงก์ไปหน้าหลัก | ✅ ครบ |
| `/academic-terms` | CRUD ปีการศึกษา, set Active term | ✅ ครบ |
| `/master-data` | CRUD ระดับชั้น (GradeLevels), กลุ่มสาระ (Departments), อาคาร (Buildings) | ✅ ครบ |
| `/teachers` | CRUD ครู, เลือก department, ครูที่ปรึกษา, color picker (hex) | ✅ ครบ |
| `/subjects` | CRUD วิชา, search/filter by grade, **import CSV** | ✅ ครบ |
| `/rooms` | CRUD ห้องเรียน | ✅ ครบ |
| `/classes` | CRUD ชั้นเรียน | ✅ ครบ |
| `/time-slots` | CRUD คาบเรียน, กำหนด type/order_index/เวลา | ✅ ครบ |
| `/course-assignments` | มอบหมายครู+ห้อง ต่อ วิชา+ชั้น+เทอม | ✅ ครบ |
| `/fixed-activities` | ล็อกคาบสำหรับกิจกรรมตาม activity_group × ระดับชั้น, CRUD + edit modal | ✅ ครบ |
| `/workload` | ดูภาระงานสอนครูแยกวัน แสดงสี warning/overload | ✅ ครบ |
| `/time-structure` | ตรวจโครงสร้างเวลาเรียนเทียบมาตรฐาน หน.พัฒนาฯ | ✅ ครบ |
| `/schedule` | Drag-drop ตาราง, auto-schedule (dry run + apply), validate, clear class/all | ✅ ครบ |
| `/reports` | Preview ตารางนักเรียน / ตารางครู / โครงสร้างรายวิชา, settings โรงเรียน+ผู้ลงนาม | ✅ ครบ |
| `/reports/print` | Print ตารางนักเรียนหรือครู (browser print) | ✅ ครบ |
| `/reports/batch-print` | Print ตารางทุกชั้นพร้อมกัน | ✅ ครบ |
| `/reports/course-structure/print` | Print โครงสร้างรายวิชา | ✅ ครบ |

---

## API Routes

| Endpoint | Method | หน้าที่ |
|----------|--------|--------|
| `/api/academic-terms` | GET/POST/PUT/DELETE | CRUD เทอม |
| `/api/master-data?type=grades\|departments\|buildings` | GET/POST/PUT/DELETE | Master data |
| `/api/teachers` | GET/POST/PUT/DELETE | CRUD ครู |
| `/api/teachers/workload` | GET | ภาระงานครูรายวัน |
| `/api/subjects` | GET/POST/PUT/DELETE | CRUD วิชา (+ `?type=group` ดึง activity groups) |
| `/api/subjects/import` | POST | Import วิชาจาก CSV |
| `/api/rooms` | GET/POST/PUT/DELETE | CRUD ห้อง |
| `/api/classes` | GET/POST/PUT/DELETE | CRUD ชั้นเรียน |
| `/api/time-slots` | GET/POST/DELETE | CRUD คาบ |
| `/api/course-assignments` | GET/POST/PUT/DELETE | มอบหมายงานสอน (`?type=quota` → sidebar pool) |
| `/api/fixed-activities` | GET/POST/PUT/DELETE | กิจกรรมล็อกตาราง |
| `/api/schedules` | GET/POST/PUT/DELETE | ตารางเรียน (`scope=class\|all` สำหรับ DELETE) |
| `/api/schedules/validate` | GET | ตรวจ violations (consecutive, overload, duplicate) |
| `/api/schedules/auto-schedule` | POST | CSP backtracking scheduler (`dry_run=true\|false`) |
| `/api/reports/print` | GET | Data สำหรับ print นักเรียน/ครู |
| `/api/reports/batch-print` | GET | Data สำหรับ batch print |
| `/api/reports/course-structure` | GET | โครงสร้างรายวิชา |
| `/api/reports/time-structure` | GET | โครงสร้างเวลาเรียน vs มาตรฐาน |
| `/api/reports/settings` | GET/POST | ตั้งค่าโรงเรียน + ผู้ลงนาม |

---

## Bugs / ความไม่สอดคล้องที่พบ

### 🔴 ต้องแก้

| ไฟล์ | บรรทัด | ปัญหา |
|------|--------|-------|
| ~~`CLAUDE.md`~~ | ~~เอกสาร~~ | ~~ระบุ TimeSlot types เป็น `Learning`~~ → **แก้แล้ว** เป็น `Study` |
| ~~`app/schedule/page.tsx`~~ | ~~interface TimeSlot~~ | ~~TypeScript type ระบุ `'Learning'`~~ → **แก้แล้ว** เป็น `'Study' \| 'Break' \| 'Assembly' \| 'Homeroom'` |
| ~~`app/api/schedules/auto-schedule/route.ts`~~ | ~~L101~~ | ~~filter `type === 'Study' \|\| type === 'Learning'`~~ → **แก้แล้ว** เหลือแค่ `type === 'Study'` |

### 🟡 UX / ข้อจำกัด

| หัวข้อ | รายละเอียด |
|--------|------------|
| `/time-structure` | ไม่มี term selector — ดึงข้อมูลจาก Active term เสมอ, ดูย้อนหลังไม่ได้ |
| `/workload` | ไม่แน่ใจว่ามี term selector หรือไม่ — ต้องตรวจเพิ่ม |
| Auto-schedule | ทำทีละ 1 ชั้นเรียน — ไม่มี "จัดทั้งโรงเรียนครั้งเดียว" |
| Drag-drop | ไม่ใช้งานบน mobile (touch) ได้ |
| Print | พึ่ง browser print เท่านั้น — ไม่มี export Excel/PDF โดยตรง |

---

## ฟีเจอร์ที่ขาด (ไม่มีในระบบเลย)

| ฟีเจอร์ | ความสำคัญ | หมายเหตุ |
|--------|-----------|---------|
| **Room-based timetable view** | สูง | ดูตารางแยกตามห้องเรียน ว่าห้องไหนว่าง/ไม่ว่างชั่วโมงไหน — ช่วยจัดห้องไม่ซ้อน |
| **Copy schedule ระหว่างเทอม** | กลาง | คัดลอกตารางจากเทอม A ไปเทอม B เป็นจุดเริ่มต้น — ไม่มีทั้ง API และ UI |
| **Bulk course assignments** | กลาง | มอบหมายครูคนเดียวสอนหลายชั้นพร้อมกัน — ตอนนี้ทำทีละชั้น |
| **Teacher conflict summary** | ต่ำ | Report ภาพรวมว่าครูคนไหนสอนซ้อนกัน ข้ามชั้น |
| **Export Excel** | ต่ำ | ตอนนี้มีแต่ print → PDF ผ่าน browser |

---

## Data Setup Order (อ้างอิง)

ต้องทำตามลำดับก่อนจัดตารางได้:

1. AcademicTerms (ต้องมี `status = 'Active'` 1 เทอม)
2. Master data — GradeLevels, Departments, Buildings
3. Teachers (ต้องกำหนด `color`)
4. Subjects (link `grade_level_id`, ตั้ง `hours_per_week`, `semester`, `activity_group`)
5. Rooms + Classes
6. TimeSlots (ใช้ type: `Study` | `Break` | `Assembly` | `Homeroom`, เรียงด้วย `order_index`)
7. CourseAssignments (teacher + subject + class + term)
8. FixedActivities (ล็อกคาบ → auto-generate locked Schedules rows)
9. Schedules (drag-drop หรือ auto-schedule)

---

## Key Business Rules (สรุป)

- **Subject pool quota**: คำนวณจาก `hours_per_week` (หรือ `periods_per_week` ถ้าไม่มี) − คาบที่จัดแล้ว → sidebar แสดงเฉพาะ `remaining > 0`
- **Conflict detection**: POST `/api/schedules` → reject 409 ถ้า class/teacher/room ซ้อนกันในวัน+เวลา+เทอม
- **Locked schedules** (`is_locked = 1`): สร้างโดย FixedActivities เท่านั้น, ลาก/ลบ/แก้ไขจาก UI ไม่ได้
- **Auto-schedule**: CSP backtracking + MRV + slot preference scoring แยกตาม tier วิชา (คณิต/วิทย์ = เช้า, กิจกรรม = บ่าย)
- **Schedule spanning**: คาบติดกันที่มี subject+teacher เดียวกัน render เป็น merged cell
