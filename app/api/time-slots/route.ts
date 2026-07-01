import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [rows] = await pool.query('SELECT * FROM TimeSlots ORDER BY order_index');
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch time slots' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { order_index, start_time, end_time, type } = await request.json();

        if (start_time >= end_time) {
            return NextResponse.json({ error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' }, { status: 400 });
        }

        // Check for duplicates
        const [existing] = await pool.query(
            'SELECT * FROM TimeSlots WHERE order_index = ? OR (start_time = ? AND end_time = ?)',
            [order_index, start_time, end_time]
        );

        if ((existing as any[]).length > 0) {
            return NextResponse.json({ error: 'คาบเรียนที่ ' + order_index + ' หรือช่วงเวลานี้มีอยู่แล้ว' }, { status: 400 });
        }

        const [result] = await pool.query(
            'INSERT INTO TimeSlots (order_index, start_time, end_time, type) VALUES (?, ?, ?, ?)',
            [order_index, start_time, end_time, type]
        );
        return NextResponse.json({ id: (result as any).insertId, order_index, start_time, end_time, type }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create time slot' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Get the time slot's start and end time
        const [slotRows] = await pool.query('SELECT start_time, end_time, order_index FROM TimeSlots WHERE id = ?', [id]);
        if ((slotRows as any[]).length === 0) {
            return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
        }
        const { start_time, end_time, order_index } = (slotRows as any[])[0];

        // Must delete last slot first
        const [maxRows] = await pool.query('SELECT MAX(order_index) as max_order FROM TimeSlots') as any;
        if (order_index !== maxRows[0].max_order) {
            return NextResponse.json({ error: 'ลบได้เฉพาะคาบสุดท้ายก่อน' }, { status: 400 });
        }

        // Check for dependencies in FixedActivities and Schedules
        const [faRows] = await pool.query('SELECT COUNT(*) as count FROM FixedActivities WHERE start_time = ? AND end_time = ?', [start_time, end_time]);
        const faCount = (faRows as any[])[0].count;

        const [schRows] = await pool.query('SELECT COUNT(*) as count FROM Schedules WHERE start_time = ? AND end_time = ?', [start_time, end_time]);
        const schCount = (schRows as any[])[0].count;

        if (faCount > 0 || schCount > 0) {
            let messages = [];
            if (faCount > 0) messages.push('กิจกรรมที่ล็อกเวลาไว้');
            if (schCount > 0) messages.push('ตารางสอน');
            
            return NextResponse.json({ 
                error: `ไม่สามารถลบคาบเรียนนี้ได้ เนื่องจากมี ${messages.join(' และ ')} ในช่วงเวลานี้ กรุณาลบข้อมูลเหล่านั้นออกก่อน` 
            }, { status: 400 });
        }

        await pool.query('DELETE FROM TimeSlots WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting slot:', error);
        return NextResponse.json({ error: 'Failed to delete time slot: ' + error.message }, { status: 500 });
    }
}
