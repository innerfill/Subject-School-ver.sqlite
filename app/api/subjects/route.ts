import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const grade_level_id = searchParams.get('grade_level_id');
        const search = searchParams.get('search');

        if (type === 'group') {
            const [rows] = await pool.query('SELECT DISTINCT activity_group FROM Subjects WHERE activity_group IS NOT NULL');
            return NextResponse.json(rows);
        }

        let query = `
      SELECT s.*, g.name as grade_level_name 
      FROM Subjects s 
      LEFT JOIN GradeLevels g ON s.grade_level_id = g.id
      WHERE s.is_active = TRUE
    `;
        const params: any[] = [];

        if (search) {
            query += ` AND (s.code LIKE ? OR s.name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (grade_level_id) {
            query += ` AND s.grade_level_id = ?`;
            params.push(grade_level_id);
        }

        query += ` ORDER BY s.code ASC`;

        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error in GET /api/subjects:', error);
        return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { code, name, credits, max_credits, hours_per_week, type, grade_level_id, semester } = await request.json();

        let activity_group = null;
        if (type === 'Activity') {
            if (name.includes('ลูกเสือ')) activity_group = 'SCOUT';
            else if (name.includes('ชุมนุม')) activity_group = 'CLUB';
            else if (name.includes('แนะแนว')) activity_group = 'GUIDANCE';
            else activity_group = 'OTHER';
        }

        const semesterValue = semester ? parseInt(semester) : null;

        const [result] = await pool.query(
            'INSERT INTO Subjects (code, name, credits, max_credits, hours_per_week, type, grade_level_id, is_active, activity_group, semester) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)',
            [code, name, credits, max_credits, hours_per_week, type, grade_level_id || null, activity_group, semesterValue]
        );
        return NextResponse.json({ id: (result as any).insertId, code, name, credits, max_credits, hours_per_week, type, grade_level_id, semester: semesterValue }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, code, name, credits, max_credits, hours_per_week, type, grade_level_id, semester } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let activity_group = null;
        if (type === 'Activity') {
            if (name.includes('ลูกเสือ')) activity_group = 'SCOUT';
            else if (name.includes('ชุมนุม')) activity_group = 'CLUB';
            else if (name.includes('แนะแนว')) activity_group = 'GUIDANCE';
            else activity_group = 'OTHER';
        }

        const semesterValue = semester ? parseInt(semester) : null;

        await pool.query(
            'UPDATE Subjects SET code=?, name=?, credits=?, max_credits=?, hours_per_week=?, type=?, grade_level_id=?, activity_group=?, semester=? WHERE id=?',
            [code, name, credits, max_credits, hours_per_week, type, grade_level_id || null, activity_group, semesterValue, id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Soft delete
        await pool.query('UPDATE Subjects SET is_active = FALSE WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
    }
}
