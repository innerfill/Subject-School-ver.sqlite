# ระบบจัดตารางเรียน (School Schedule)

ระบบจัดตารางเรียนสำหรับโรงเรียนไทย — Next.js 15, SQLite, drag-and-drop

## เริ่มต้นใช้งาน

```
1. ดับเบิลคลิก install.bat   ← ติดตั้งครั้งแรกครั้งเดียว
2. ดับเบิลคลิก start.bat     ← เปิดทุกครั้ง
3. เปิด http://localhost:3000
```

ดูรายละเอียดที่ [docs/คู่มือการใช้งาน.md](docs/คู่มือการใช้งาน.md)

## Tech Stack

- **Framework**: Next.js 15 App Router + React 19 + TypeScript
- **Database**: SQLite via `better-sqlite3` (ไม่ต้องติดตั้ง MySQL)
- **Styling**: Tailwind CSS v4 + Sarabun font
- **Drag-and-drop**: `@dnd-kit/core`

## โครงสร้างโปรเจกต์

```
app/          Next.js pages & API routes
components/   Shared UI components
lib/          Database connection + schema.sql
docs/         คู่มือการใช้งาน + Feature map
scripts/      Utility scripts (dedup-subjects)
public/       Static assets
```
