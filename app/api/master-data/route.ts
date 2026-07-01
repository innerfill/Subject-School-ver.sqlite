import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        if (type === 'grades') {
            const [rows] = await pool.query('SELECT * FROM GradeLevels ORDER BY order_index');
            return NextResponse.json(rows);
        } else if (type === 'departments') {
            const [rows] = await pool.query('SELECT * FROM Departments ORDER BY name');
            return NextResponse.json(rows);
        } else if (type === 'buildings') {
            const [rows] = await pool.query('SELECT * FROM Buildings ORDER BY name');
            return NextResponse.json(rows);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { type, ...data } = await request.json();

        if (type === 'grades') {
            const { name, order_index } = data;
            const [result] = await pool.query('INSERT INTO GradeLevels (name, order_index) VALUES (?, ?)', [name, order_index || 0]);
            return NextResponse.json({ id: (result as any).insertId, ...data }, { status: 201 });
        } else if (type === 'departments') {
            const { name } = data;
            const [result] = await pool.query('INSERT INTO Departments (name) VALUES (?)', [name]);
            return NextResponse.json({ id: (result as any).insertId, ...data }, { status: 201 });
        } else if (type === 'buildings') {
            const { name, zone } = data;
            const [result] = await pool.query('INSERT INTO Buildings (name, zone) VALUES (?, ?)', [name, zone]);
            return NextResponse.json({ id: (result as any).insertId, ...data }, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create master data' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { type, id, ...data } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        if (type === 'buildings') {
            const { name, zone } = data;
            await pool.query('UPDATE Buildings SET name = ?, zone = ? WHERE id = ?', [name, zone, id]);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update master data' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let table = '';
        if (type === 'grades') table = 'GradeLevels';
        else if (type === 'departments') table = 'Departments';
        else if (type === 'buildings') table = 'Buildings';
        else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

        await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete master data' }, { status: 500 });
    }
}
