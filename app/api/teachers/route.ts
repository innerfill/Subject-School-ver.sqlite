import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, d.name as department_name, c.name as advisor_class, c.id as advisor_class_id
            FROM Teachers t 
            LEFT JOIN Departments d ON t.department_id = d.id
            LEFT JOIN Classes c ON c.advisor_id = t.id OR c.advisor2_id = t.id
        `);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { prefix, rank, name, department_id, class_id } = await request.json();

        // Generate random color
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const [result] = await pool.query(
            'INSERT INTO Teachers (prefix, rank, name, color, department_id) VALUES (?, ?, ?, ?, ?)',
            [prefix || null, rank || null, name, color, department_id]
        );

        const teacherId = (result as any).insertId;

        // If class_id is provided, set this teacher as advisor
        if (class_id) {
            const [classRows] = await pool.query('SELECT advisor_id, advisor2_id FROM Classes WHERE id = ?', [class_id]);
            if ((classRows as any[]).length > 0) {
                const cls = (classRows as any[])[0];
                if (!cls.advisor_id || cls.advisor_id === teacherId) {
                    await pool.query('UPDATE Classes SET advisor_id = ? WHERE id = ?', [teacherId, class_id]);
                } else if (!cls.advisor2_id || cls.advisor2_id === teacherId) {
                    await pool.query('UPDATE Classes SET advisor2_id = ? WHERE id = ?', [teacherId, class_id]);
                } else {
                    return NextResponse.json({ error: 'ห้องเรียนนี้มีครูประจำชั้นครบ 2 คนแล้ว' }, { status: 400 });
                }
            }
        }

        return NextResponse.json({ id: teacherId, name, color, department_id }, { status: 201 });
    } catch (error) {
        console.error('Create teacher error:', error);
        return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { prefix, rank, name, department_id, class_id, id, color } = await request.json();

        await pool.query(
            'UPDATE Teachers SET prefix = ?, rank = ?, name = ?, department_id = ?, color = COALESCE(?, color) WHERE id = ?',
            [prefix || null, rank || null, name, department_id, color || null, id]
        );

        // Handle Advisor Update
        // 1. Remove this teacher from any previous class
        await pool.query('UPDATE Classes SET advisor_id = NULL WHERE advisor_id = ?', [id]);
        await pool.query('UPDATE Classes SET advisor2_id = NULL WHERE advisor2_id = ?', [id]);

        // 2. Assign to new class if provided
        if (class_id) {
            const [classRows] = await pool.query('SELECT advisor_id, advisor2_id FROM Classes WHERE id = ?', [class_id]);
            if ((classRows as any[]).length > 0) {
                const cls = (classRows as any[])[0];
                if (!cls.advisor_id || cls.advisor_id === id) {
                    await pool.query('UPDATE Classes SET advisor_id = ? WHERE id = ?', [id, class_id]);
                } else if (!cls.advisor2_id || cls.advisor2_id === id) {
                    await pool.query('UPDATE Classes SET advisor2_id = ? WHERE id = ?', [id, class_id]);
                } else {
                    return NextResponse.json({ error: 'ห้องเรียนนี้มีครูประจำชั้นครบ 2 คนแล้ว' }, { status: 400 });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update teacher error:', error);
        return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Unset advisor_id and advisor2_id in Classes first
        await pool.query('UPDATE Classes SET advisor_id = NULL WHERE advisor_id = ?', [id]);
        await pool.query('UPDATE Classes SET advisor2_id = NULL WHERE advisor2_id = ?', [id]);

        await pool.query('DELETE FROM Teachers WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
    }
}
