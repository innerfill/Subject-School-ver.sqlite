import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const [rows] = await pool.query(`
      SELECT r.*, b.name as building_name 
      FROM Rooms r 
      LEFT JOIN Buildings b ON r.building_id = b.id
    `);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, type, capacity, building_id, allow_overlap = 0 } = await request.json();
        const [result] = await pool.query(
            'INSERT INTO Rooms (name, type, capacity, building_id, allow_overlap) VALUES (?, ?, ?, ?, ?)',
            [name, type, capacity, building_id, allow_overlap ? 1 : 0]
        );
        return NextResponse.json({ id: (result as any).insertId, name, type, capacity, building_id, allow_overlap }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, name, type, capacity, building_id, allow_overlap = 0 } = await request.json();
        await pool.query(
            'UPDATE Rooms SET name = ?, type = ?, capacity = ?, building_id = ?, allow_overlap = ? WHERE id = ?',
            [name, type, capacity, building_id, allow_overlap ? 1 : 0, id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await pool.query('DELETE FROM Rooms WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }
}
