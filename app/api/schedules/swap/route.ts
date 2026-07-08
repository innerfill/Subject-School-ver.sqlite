import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function roomAllowsOverlap(room_id: number | null): Promise<boolean> {
    if (!room_id) return false;
    const [rows] = await pool.query('SELECT allow_overlap FROM Rooms WHERE id = ?', [room_id]);
    return !!(rows[0]?.allow_overlap);
}

async function checkConflict(
    sched: any,
    targetDay: string,
    targetStart: string,
    targetEnd: string,
    excludeIds: number[],
    skipRoomCheck: boolean
): Promise<string[]> {
    const placeholders = excludeIds.map(() => '?').join(',');
    let query = `
        SELECT s.*, t.name AS teacher_name FROM Schedules s
        LEFT JOIN Teachers t ON s.teacher_id = t.id
        WHERE s.day_of_week = ?
          AND s.academic_term_id = ?
          AND s.id NOT IN (${placeholders})
          AND (s.start_time < ? AND s.end_time > ?)
          AND (s.class_id = ?
    `;
    const params: any[] = [targetDay, sched.academic_term_id, ...excludeIds, targetEnd, targetStart, sched.class_id];

    if (sched.teacher_id) {
        query += ' OR s.teacher_id = ?';
        params.push(sched.teacher_id);
    }
    if (sched.room_id && !skipRoomCheck) {
        query += ' OR s.room_id = ?';
        params.push(sched.room_id);
    }
    query += ')';

    const [conflicts] = await pool.query(query, params);
    return (conflicts as any[]).map((c: any) => {
        if (sched.teacher_id && c.teacher_id === sched.teacher_id) return `ครู${c.teacher_name ?? ''}มีคาบสอนในช่วงเวลานี้แล้ว`;
        if (sched.room_id && c.room_id === sched.room_id) return 'ห้องเรียนถูกใช้ในช่วงเวลานี้แล้ว';
        return 'ชั้นเรียนมีคาบเรียนในช่วงเวลานี้แล้ว';
    });
}

export async function POST(request: Request) {
    try {
        const { id_a, id_b } = await request.json();
        if (!id_a || !id_b) return NextResponse.json({ error: 'id_a and id_b required' }, { status: 400 });

        const [rows] = await pool.query(
            'SELECT * FROM Schedules WHERE id IN (?, ?)',
            [id_a, id_b]
        );
        if (rows.length !== 2) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

        const schedA = (rows as any[]).find((r: any) => r.id === id_a)!;
        const schedB = (rows as any[]).find((r: any) => r.id === id_b)!;

        if (schedA.is_locked || schedB.is_locked) {
            return NextResponse.json({ error: 'ไม่สามารถสลับคาบที่ล็อกได้' }, { status: 403 });
        }

        const excludeIds = [id_a, id_b];
        const skipRoomA = await roomAllowsOverlap(schedA.room_id);
        const skipRoomB = await roomAllowsOverlap(schedB.room_id);

        // Check A → B's slot
        const errA = await checkConflict(schedA, schedB.day_of_week, schedB.start_time, schedB.end_time, excludeIds, skipRoomA);
        if (errA.length > 0) return NextResponse.json({ error: 'Conflict detected', details: errA }, { status: 409 });

        // Check B → A's slot
        const errB = await checkConflict(schedB, schedA.day_of_week, schedA.start_time, schedA.end_time, excludeIds, skipRoomB);
        if (errB.length > 0) return NextResponse.json({ error: 'Conflict detected', details: errB }, { status: 409 });

        // Swap
        await pool.query(
            'UPDATE Schedules SET day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?',
            [schedB.day_of_week, schedB.start_time, schedB.end_time, id_a]
        );
        await pool.query(
            'UPDATE Schedules SET day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?',
            [schedA.day_of_week, schedA.start_time, schedA.end_time, id_b]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to swap: ' + (error as Error).message }, { status: 500 });
    }
}
