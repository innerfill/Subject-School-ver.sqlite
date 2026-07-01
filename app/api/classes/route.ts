import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const [rows] = await pool.query(`
      SELECT c.*,
             g.name as grade_level_name,
             t.name as advisor_name,
             t2.name as advisor2_name,
             r.name as home_room_name,
             at.year, at.term
      FROM Classes c
      LEFT JOIN GradeLevels g ON c.grade_level_id = g.id
      LEFT JOIN Teachers t ON c.advisor_id = t.id
      LEFT JOIN Teachers t2 ON c.advisor2_id = t2.id
      LEFT JOIN Rooms r ON c.home_room_id = r.id
      LEFT JOIN AcademicTerms at ON c.academic_term_id = at.id
      ORDER BY g.id ASC, CAST(SUBSTRING_INDEX(c.name, '/', -1) AS UNSIGNED) ASC, c.name ASC
    `);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id } = await request.json();
        const [existing] = await pool.query(
            'SELECT id FROM Classes WHERE name = ? AND academic_term_id = ?',
            [name, academic_term_id]
        );
        if ((existing as any[]).length > 0)
            return NextResponse.json({ error: `มีชั้นเรียน "${name}" อยู่แล้วในปีการศึกษานี้` }, { status: 409 });

        const [result] = await pool.query(
            'INSERT INTO Classes (name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id]
        );
        return NextResponse.json({ id: (result as any).insertId, name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const [existing] = await pool.query(
            'SELECT id FROM Classes WHERE name = ? AND academic_term_id = ? AND id != ?',
            [name, academic_term_id, id]
        );
        if ((existing as any[]).length > 0)
            return NextResponse.json({ error: `มีชั้นเรียน "${name}" อยู่แล้วในปีการศึกษานี้` }, { status: 409 });

        await pool.query(
            'UPDATE Classes SET name = ?, grade_level_id = ?, academic_term_id = ?, advisor_id = ?, advisor2_id = ?, home_room_id = ? WHERE id = ?',
            [name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id, id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await pool.query('DELETE FROM Classes WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
