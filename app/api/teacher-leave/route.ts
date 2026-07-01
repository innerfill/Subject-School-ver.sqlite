import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const teacher_id = searchParams.get('teacher_id');

        let query = `
            SELECT tl.*, t.name AS teacher_name
            FROM TeacherLeave tl
            JOIN teachers t ON t.id = tl.teacher_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (date) { query += ' AND tl.date = ?'; params.push(date); }
        if (teacher_id) { query += ' AND tl.teacher_id = ?'; params.push(teacher_id); }

        query += ' ORDER BY tl.date DESC, t.name ASC';

        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch leave records' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { teacher_id, date, type, scope = 'all', specific_timeslot_ids, notes } = await request.json();

        if (!teacher_id || !date || !type) {
            return NextResponse.json({ error: 'teacher_id, date, type required' }, { status: 400 });
        }

        // ตรวจซ้ำ: ครูคนเดียวลาวันเดียวกัน scope เดียวกัน
        const [existing] = await pool.query(
            'SELECT id FROM TeacherLeave WHERE teacher_id = ? AND date = ? AND type = ? AND scope = ?',
            [teacher_id, date, type, scope]
        );
        if ((existing as any[]).length > 0) {
            return NextResponse.json({ error: 'รายการนี้มีอยู่แล้ว' }, { status: 409 });
        }

        const [result] = await pool.query(
            'INSERT INTO TeacherLeave (teacher_id, date, type, scope, specific_timeslot_ids, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [teacher_id, date, type, scope, specific_timeslot_ids || null, notes || null]
        );

        // อัปเดต leave_count ใน teachers
        await pool.query(
            'UPDATE teachers SET leave_count = leave_count + 1 WHERE id = ?',
            [teacher_id]
        );

        return NextResponse.json({ id: (result as any).insertId }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create leave record' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const [rows] = await pool.query('SELECT teacher_id FROM TeacherLeave WHERE id = ?', [id]);
        if ((rows as any[]).length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const { teacher_id } = (rows as any[])[0];

        await pool.query('DELETE FROM TeacherLeave WHERE id = ?', [id]);
        await pool.query('UPDATE teachers SET leave_count = GREATEST(0, leave_count - 1) WHERE id = ?', [teacher_id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to delete leave record' }, { status: 500 });
    }
}
