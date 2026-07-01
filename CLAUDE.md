# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules of Engagement

**VERIFY BEFORE DONE** *(highest priority)*: ห้ามบอก "เสร็จ" หรือ "done" ถ้ายังไม่ได้รันจริงหรือไม่มีหลักฐานยืนยัน ต้องมี output, log, หรือผลลัพธ์จริงก่อนเสมอ

**NO MAGIC**: ไม่รู้ path อยู่ไหนต้องถาม ไม่รู้ว่ามี function/file นั้นจริงมั้ยต้องตรวจก่อน ห้ามแต่งหรือเดา

**DISSENT**: ก่อนทำงานใหญ่ที่กระทบหลาย module ให้ประเมินก่อนว่า — พังแล้วกระทบแค่ไหน? ถอยกลับได้มั้ย? แล้วค่อยบอก user

**SCOPE DRIFT**: ถ้าสั่งแก้ bug 1 ตัวแล้วเห็นว่าต้องแตะ module อื่น ให้หยุดและแจ้งก่อน อย่า refactor เกินสิ่งที่สั่ง

**R0/R1/R2 Decision tiers**:
- R0 (ถอยไม่ได้): DROP TABLE, ลบไฟล์, force push — หยุดและถามก่อนเสมอ
- R1 (ถอยยาก): เปลี่ยน schema, แก้ API contract, เปลี่ยน env — ทำได้แต่ต้องบอก user ว่าทำอะไรไปแล้ว
- R2 (ถอยง่าย): แก้ UI, เพิ่ม field, เปลี่ยน query — ทำได้เลย

## Commands

```bash
npm run dev      # Start dev server (Next.js + Turbopack) at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment

Create a `.env.local` file with MySQL credentials:

```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=school_schedule
```

Defaults match a local MySQL install with no password. The connection pool is in `lib/db.ts`.

## Architecture

**Thai school timetable scheduling system** (ระบบจัดตารางเรียน). Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, MySQL via `mysql2` (no ORM — all raw SQL queries).

### Data flow & setup order

Data must be set up in this dependency order before scheduling is possible:

1. **AcademicTerms** — one must be `status = 'Active'`
2. **Master data** — GradeLevels, Departments, Buildings (`/api/master-data?type=grades|departments|buildings`)
3. **Teachers** (with a hex `color` field used throughout the UI)
4. **Subjects** — linked to `grade_level_id`; key fields: `hours_per_week` (periods/week), `semester` (NULL = both, 1 or 2), `is_active`, `activity_group`
5. **Rooms** and **Classes** (Classes link to `grade_level_id`)
6. **TimeSlots** — ordered by `order_index`; types: `Study`, `Break`, `Assembly`, `Homeroom`
7. **CourseAssignments** — maps teacher + subject + class + term; `periods_per_week` is a fallback if `Subjects.hours_per_week` is not set
8. **FixedActivities** — locks a timeslot for all classes in target grade levels; auto-generates locked `Schedules` rows
9. **Schedules** — the actual timetable, managed via the drag-and-drop UI at `/schedule`

### Key business logic

**Subject pool** (`/api/course-assignments?type=quota`): calculates remaining periods per subject for a class/term by comparing `hours_per_week` (preferred) or `periods_per_week` against already-placed schedule rows. Only subjects with `remaining_periods > 0` appear in the sidebar.

**Conflict detection** (in `POST /api/schedules`): prevents double-booking a class, teacher, or room at the same day/time/term. Returns HTTP 409 with details.

**Locked schedules** (`is_locked = 1`): created by FixedActivities. Cannot be dragged, deleted, or edited in the UI. Deleting a FixedActivity cascades to delete its Schedule rows. An orphaned locked schedule (whose FixedActivity was deleted externally) can be deleted directly.

**Drag-and-drop** (`/schedule` page, `@dnd-kit/core`): two drag sources — subject cards from the sidebar pool (creates a new schedule) and existing schedule cards on the grid (moves: POST new → DELETE old). Optimistic UI update on grid-to-grid moves, rolled back on conflict.

**Schedule spanning**: consecutive timeslots with the same `subject_id` + `teacher_id` for the same class are rendered as a single merged cell spanning multiple columns.

### Global providers (wrapping all pages via `app/layout.tsx`)

- `ThemeProvider` — dark/light mode toggle, persisted in localStorage
- `ToastProvider` / `useToast()` — `showToast(message, 'success' | 'error')`
- `ConfirmProvider` / `useConfirm()` — returns a Promise<boolean> for async confirmation dialogs

### API route conventions

All routes live in `app/api/`. Each file handles multiple methods (GET/POST/PUT/DELETE) for its resource. Multi-entity endpoints (like `/api/master-data`) use a `?type=` query param to dispatch to different tables. No authentication layer.

### Font

Sarabun (Thai) is loaded via `next/font/google` with CSS variable `--font-sarabun` and applied globally. Use `font-sarabun` Tailwind class for Thai text.
