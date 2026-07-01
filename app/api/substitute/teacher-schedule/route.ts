import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/substitute/teacher-schedule?teacher_id=X&date=YYYY-MM-DD&academic_term_id=Z
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teacher_id = searchParams.get('teacher_id');
        const date = searchParams.get('date');
        const academic_term_id = searchParams.get('academic_term_id');

        if (!teacher_id || !date || !academic_term_id) {
            return NextResponse.json({ error: 'teacher_id, date, academic_term_id required' }, { status: 400 });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[new Date(date).getDay()];

        // ดึงตารางสอนของครูในวันนั้น + match timeslot (Study เท่านั้น)
        // คาบที่มี SubRequest อยู่แล้ว (Pending หรือ Sent) → ไม่ต้องจัดใหม่
        const [assignedRows] = await pool.query(
            `SELECT timeslot_id FROM SubRequests
             WHERE absent_teacher_id = ? AND date = ?
               AND notify_status NOT IN ('Failed','Expired')`,
            [teacher_id, date]
        );
        const assignedSlots = new Set((assignedRows as any[]).map((r: any) => r.timeslot_id));

        const [rows] = await pool.query(
            `SELECT
                s.id          AS schedule_id,
                ts.id         AS timeslot_id,
                ts.order_index,
                ts.start_time,
                ts.end_time,
                sub.id        AS subject_id,
                sub.name      AS subject_name,
                sub.code      AS subject_code,
                c.id          AS class_id,
                c.name        AS class_name
             FROM schedules s
             JOIN timeslots ts ON ts.start_time = s.start_time
                               AND ts.end_time = s.end_time
                               AND ts.type = 'Study'
             LEFT JOIN subjects sub ON sub.id = s.subject_id
             LEFT JOIN classes c    ON c.id = s.class_id
             WHERE s.teacher_id = ?
               AND s.day_of_week = ?
               AND s.academic_term_id = ?
               AND s.is_locked = 0
             ORDER BY ts.order_index ASC`,
            [teacher_id, dayOfWeek, academic_term_id]
        );

        // กรองเฉพาะคาบที่ยังไม่มีครูสอนแทน
        const filtered = (rows as any[]).filter(r => !assignedSlots.has(r.timeslot_id));

        return NextResponse.json({ day_of_week: dayOfWeek, periods: filtered });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch teacher schedule' }, { status: 500 });
    }
}
