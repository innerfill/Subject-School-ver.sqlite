import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const [rows] = await pool.query('SELECT * FROM AcademicTerms ORDER BY year DESC, term DESC');
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch academic terms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { year, term, status, start_date, end_date } = await request.json();

        // If setting to Active, set others to Inactive
        if (status === 'Active') {
            await pool.query(`UPDATE AcademicTerms SET status = 'Inactive'`);
        }

        // Handle empty dates by converting to NULL
        const [existing] = await pool.query(
            'SELECT id FROM AcademicTerms WHERE year = ? AND term = ?',
            [year, term]
        );
        if ((existing as any[]).length > 0)
            return NextResponse.json({ error: `ปีการศึกษา ${year} ภาคเรียน ${term} มีอยู่แล้ว` }, { status: 409 });

        const startDateVal = start_date === '' ? null : start_date;
        const endDateVal = end_date === '' ? null : end_date;

        const [result] = await pool.query(
            'INSERT INTO AcademicTerms (year, term, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [year, term, status || 'Inactive', startDateVal, endDateVal]
        );
        return NextResponse.json({ id: (result as any).insertId, year, term, status }, { status: 201 });
    } catch (error) {
        console.error('Error creating academic term:', error);
        return NextResponse.json({ error: 'Failed to create academic term' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, status, year, term, start_date, end_date } = await request.json();

        if (status === 'Active') {
            await pool.query(`UPDATE AcademicTerms SET status = 'Inactive'`);
            await pool.query('UPDATE AcademicTerms SET status = ? WHERE id = ?', [status, id]);
        } else {
            const startDateVal = start_date === '' ? null : start_date;
            const endDateVal = end_date === '' ? null : end_date;
            await pool.query(
                'UPDATE AcademicTerms SET year = ?, term = ?, start_date = ?, end_date = ? WHERE id = ?',
                [year, term, startDateVal, endDateVal, id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update academic term' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await pool.query('DELETE FROM AcademicTerms WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete academic term' }, { status: 500 });
    }
}
