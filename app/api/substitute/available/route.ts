import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/substitute/available?date=2026-06-30&timeslot_id=3&absent_teacher_id=5&academic_term_id=1
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const timeslot_id = searchParams.get('timeslot_id');
        const absent_teacher_id = searchParams.get('absent_teacher_id');
        const academic_term_id = searchParams.get('academic_term_id');

        if (!date || !timeslot_id || !academic_term_id) {
            return NextResponse.json({ error: 'date, timeslot_id, academic_term_id required' }, { status: 400 });
        }

        // หา start_time ของ timeslot นี้ (ใช้ match กับ Schedules ที่เก็บ start_time ไม่ใช่ timeslot_id)
        const [tsRows] = await pool.query(
            'SELECT start_time, end_time, type FROM timeslots WHERE id = ?',
            [timeslot_id]
        );
        if ((tsRows as any[]).length === 0) {
            return NextResponse.json({ error: 'Timeslot not found' }, { status: 404 });
        }
        const ts = (tsRows as any[])[0];
        if (ts.type !== 'Study') {
            return NextResponse.json({ error: 'Timeslot is not a Study period' }, { status: 400 });
        }

        // คำนวณ day_of_week จาก date
        const dateObj = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getDay()];

        // 1. ครูที่สอนอยู่แล้วในคาบ+วันนี้ (จาก Schedules)
        const [busyRows] = await pool.query(
            `SELECT DISTINCT teacher_id FROM schedules
             WHERE day_of_week = ? AND start_time = ? AND academic_term_id = ?`,
            [dayOfWeek, ts.start_time, academic_term_id]
        );
        const busyIds = new Set((busyRows as any[]).map((r: any) => r.teacher_id));

        // 2. ครูที่รับจัดสอนแทนในคาบ+วันนี้แล้ว
        const [subbingRows] = await pool.query(
            `SELECT DISTINCT sub_teacher_id FROM SubRequests
             WHERE date = ? AND timeslot_id = ? AND notify_status NOT IN ('Failed','Expired') AND sub_teacher_id IS NOT NULL`,
            [date, timeslot_id]
        );
        const subbingIds = new Set((subbingRows as any[]).map((r: any) => r.sub_teacher_id));

        // 3. ครูที่ลาในวันนี้ (scope all/morning/afternoon — specific ต้อง check timeslot_id)
        const [leaveRows] = await pool.query(
            `SELECT teacher_id, scope, specific_timeslot_ids FROM TeacherLeave WHERE date = ?`,
            [date]
        );
        const absentIds = new Set<number>();
        for (const row of leaveRows as any[]) {
            if (row.scope === 'all') {
                absentIds.add(row.teacher_id);
            } else if (row.scope === 'specific' && row.specific_timeslot_ids) {
                const ids = row.specific_timeslot_ids.split(',').map((s: string) => parseInt(s.trim()));
                if (ids.includes(parseInt(timeslot_id))) absentIds.add(row.teacher_id);
            }
            // morning/afternoon: ต้องรู้ config ของโรงเรียน ตอนนี้ skip (treat as absent all day เพื่อความปลอดภัย)
            else if (row.scope === 'morning' || row.scope === 'afternoon') {
                absentIds.add(row.teacher_id);
            }
        }

        // ถ้ามี absent_teacher_id ให้เพิ่มเข้า absentIds ด้วย (ครูที่ขาดไม่ควรสอนแทนตัวเอง)
        if (absent_teacher_id) absentIds.add(parseInt(absent_teacher_id));

        // 4. ดึงครูทุกคนที่ active
        // periods_today = master schedule (วันนี้) + sub assignments ที่รับแล้วในวันเดียวกัน
        const [allTeachers] = await pool.query(
            `SELECT t.id, t.name, t.color,
                (
                  (SELECT COUNT(*) FROM schedules s
                   WHERE s.teacher_id = t.id AND s.day_of_week = ? AND s.academic_term_id = ?)
                  +
                  (SELECT COUNT(*) FROM SubRequests sr2
                   WHERE sr2.sub_teacher_id = t.id AND sr2.date = ?
                     AND sr2.notify_status NOT IN ('Failed','Expired'))
                ) AS periods_today,
                (SELECT COUNT(*) FROM SubRequests sr
                 WHERE sr.sub_teacher_id = t.id
                   AND YEAR(sr.date) = YEAR(?) AND MONTH(sr.date) = MONTH(?)
                   AND sr.notify_status NOT IN ('Failed','Expired')) AS monthly_sub_count
             FROM teachers t
             ORDER BY t.name ASC`,
            [dayOfWeek, academic_term_id, date, date, date]
        );

        const candidates = (allTeachers as any[]).filter(t =>
            !busyIds.has(t.id) && !subbingIds.has(t.id) && !absentIds.has(t.id)
        ).sort((a: any, b: any) => {
            if (a.periods_today !== b.periods_today) return a.periods_today - b.periods_today;
            if (a.monthly_sub_count !== b.monthly_sub_count) return a.monthly_sub_count - b.monthly_sub_count;
            return a.name.localeCompare(b.name, 'th');
        }).map((t: any) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            periods_today: Number(t.periods_today),
            monthly_sub_count: Number(t.monthly_sub_count),
            // เตือนถ้าจะครบ 6 คาบ
            overload_warning: Number(t.periods_today) + 1 >= 6,
        }));

        return NextResponse.json({
            date,
            day_of_week: dayOfWeek,
            timeslot_id: parseInt(timeslot_id),
            timeslot: { start_time: ts.start_time, end_time: ts.end_time },
            candidates,
        });
    } catch (error: any) {
        console.error('substitute/available error:', error);
        return NextResponse.json({ error: 'Failed to find available teachers' }, { status: 500 });
    }
}
