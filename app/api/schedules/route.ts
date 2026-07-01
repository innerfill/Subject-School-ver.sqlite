import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const term_id = searchParams.get('term_id');

        let query = `
      SELECT s.*,
             COALESCE(t.name,  ca_t.name)  AS teacher_name,
             COALESCE(t.color, ca_t.color) AS teacher_color,
             sub.name as subject_name, sub.code as subject_code,
             r.name as room_name,
             c.name as class_name,
             fa.activity_group as fixed_activity_group
      FROM Schedules s
      LEFT JOIN Teachers t ON s.teacher_id = t.id
      LEFT JOIN CourseAssignments ca
             ON s.is_locked = 1 AND s.teacher_id IS NULL
            AND ca.class_id = s.class_id
            AND ca.subject_id = s.subject_id
            AND ca.academic_term_id = s.academic_term_id
      LEFT JOIN Teachers ca_t ON ca.teacher_id = ca_t.id
      LEFT JOIN Subjects sub ON s.subject_id = sub.id AND sub.is_active = TRUE
      LEFT JOIN Rooms r ON s.room_id = r.id
      LEFT JOIN Classes c ON s.class_id = c.id
      LEFT JOIN FixedActivities fa ON s.fixed_activity_id = fa.id
    `;

        const params: any[] = [];
        if (term_id) {
            query += ` WHERE s.academic_term_id = ?`;
            params.push(term_id);
        }

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { teacher_id, subject_id, room_id, class_id, day_of_week, start_time, end_time, academic_term_id } = body;

        // Check if the room allows overlap (e.g. sports field) — if so, skip room conflict
        let roomAllowsOverlap = false;
        if (room_id) {
            const [roomRows] = await pool.query<RowDataPacket[]>('SELECT allow_overlap FROM Rooms WHERE id = ?', [room_id]);
            roomAllowsOverlap = !!(roomRows[0]?.allow_overlap);
        }

        // Conflict Detection
        let query = `
      SELECT s.*, t.name AS teacher_name FROM Schedules s
      LEFT JOIN Teachers t ON s.teacher_id = t.id
      WHERE s.day_of_week = ?
      AND s.academic_term_id = ?
      AND (
        (s.start_time < ? AND s.end_time > ?)
      )
      AND (
        s.class_id = ?
    `;

        const params: any[] = [
            day_of_week,
            academic_term_id,
            end_time, start_time, // Overlap logic: (StartA < EndB) AND (EndA > StartB)
            class_id
        ];

        if (teacher_id) {
            query += ` OR s.teacher_id = ?`;
            params.push(teacher_id);
        }

        if (room_id && !roomAllowsOverlap) {
            query += ` OR s.room_id = ?`;
            params.push(room_id);
        }

        query += ` )`;

        const [conflicts] = await pool.query<RowDataPacket[]>(query, params);

        if (conflicts.length > 0) {
            const conflictDetails = conflicts.map(c => {
                if (teacher_id && c.teacher_id === teacher_id) return `ครู${c.teacher_name ?? ''}มีคาบสอนในช่วงเวลานี้แล้ว`;
                if (room_id && c.room_id === room_id) return 'ห้องเรียนถูกใช้ในช่วงเวลานี้แล้ว';
                if (c.class_id === class_id) return 'ชั้นเรียนมีคาบเรียนในช่วงเวลานี้แล้ว';
                return 'พบคาบที่ชนกัน';
            });
            return NextResponse.json({ error: 'Conflict detected', details: conflictDetails }, { status: 409 });
        }

        const [result] = await pool.query(
            `INSERT INTO Schedules (teacher_id, subject_id, room_id, class_id, day_of_week, start_time, end_time, academic_term_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [teacher_id || null, subject_id, room_id || null, class_id, day_of_week, start_time, end_time, academic_term_id]
        );

        return NextResponse.json({ id: (result as any).insertId, ...body }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create schedule: ' + (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, teacher_id, room_id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Fetch existing schedule
        const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM Schedules WHERE id = ?', [id]);
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }
        
        const schedule = existing[0];
        
        // Check if the room allows overlap
        let roomAllowsOverlapPut = false;
        if (room_id) {
            const [roomRows] = await pool.query<RowDataPacket[]>('SELECT allow_overlap FROM Rooms WHERE id = ?', [room_id]);
            roomAllowsOverlapPut = !!(roomRows[0]?.allow_overlap);
        }

        // Check for conflicts with the new teacher/room
        let conflictQuery = `
          SELECT s.*, t.name AS teacher_name FROM Schedules s
          LEFT JOIN Teachers t ON s.teacher_id = t.id
          WHERE s.day_of_week = ?
          AND s.academic_term_id = ?
          AND s.id != ?
          AND (
            (s.start_time < ? AND s.end_time > ?)
          )
          AND (
            1 = 0
        `;

        const conflictParams: any[] = [
            schedule.day_of_week,
            schedule.academic_term_id,
            id,
            schedule.end_time, schedule.start_time
        ];

        if (teacher_id) {
            conflictQuery += ` OR s.teacher_id = ?`;
            conflictParams.push(teacher_id);
        }

        if (room_id && !roomAllowsOverlapPut) {
            conflictQuery += ` OR s.room_id = ?`;
            conflictParams.push(room_id);
        }

        conflictQuery += ` )`;
        
        // Only run conflict check if we are actually assigning a teacher or room that could conflict
        if (teacher_id || room_id) {
            const [conflicts] = await pool.query<RowDataPacket[]>(conflictQuery, conflictParams);
    
            if (conflicts.length > 0) {
                const conflictDetails = conflicts.map(c => {
                    if (teacher_id && c.teacher_id === teacher_id) return `ครู${c.teacher_name ?? ''}มีคาบสอนในช่วงเวลานี้แล้ว`;
                    if (room_id && c.room_id === room_id) return 'ห้องเรียนถูกใช้ในช่วงเวลานี้แล้ว';
                    return 'พบคาบที่ชนกัน';
                });
                return NextResponse.json({ error: 'Conflict detected', details: conflictDetails }, { status: 409 });
            }
        }

        await pool.query(
            'UPDATE Schedules SET teacher_id = ?, room_id = ? WHERE id = ?',
            [teacher_id || null, room_id || null, id]
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update schedule: ' + (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const scope = searchParams.get('scope'); // 'class' | 'all'
        const class_id = searchParams.get('class_id');
        const term_id = searchParams.get('term_id');

        // --- Bulk clear ---
        if (scope === 'class') {
            if (!class_id || !term_id) return NextResponse.json({ error: 'class_id and term_id required' }, { status: 400 });
            const [result] = await pool.query(
                'DELETE FROM Schedules WHERE class_id = ? AND academic_term_id = ? AND is_locked = 0',
                [class_id, term_id]
            );
            return NextResponse.json({ deleted: (result as any).affectedRows });
        }

        if (scope === 'all') {
            if (!term_id) return NextResponse.json({ error: 'term_id required' }, { status: 400 });
            const [result] = await pool.query(
                'DELETE FROM Schedules WHERE academic_term_id = ? AND is_locked = 0',
                [term_id]
            );
            return NextResponse.json({ deleted: (result as any).affectedRows });
        }

        // --- Single delete (existing) ---
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const [rows] = await pool.query('SELECT is_locked, fixed_activity_id FROM Schedules WHERE id = ?', [id]);
        if ((rows as any[]).length > 0) {
            const schedule = (rows as any[])[0];
            if (schedule.is_locked && schedule.fixed_activity_id) {
                const [faRows] = await pool.query('SELECT id FROM FixedActivities WHERE id = ?', [schedule.fixed_activity_id]);
                if ((faRows as any[]).length > 0) {
                    return NextResponse.json({ error: 'Cannot delete a locked schedule. Please remove the rule from Fixed Activities.' }, { status: 403 });
                }
                console.log(`Allowing deletion of orphaned locked schedule ${id} (fixed_activity_id: ${schedule.fixed_activity_id})`);
            }
        }

        await pool.query('DELETE FROM Schedules WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }
}
