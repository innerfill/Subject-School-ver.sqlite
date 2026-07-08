import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { source_term_id, target_term_id } = await request.json();
        if (!source_term_id || !target_term_id)
            return NextResponse.json({ error: 'source_term_id และ target_term_id จำเป็น' }, { status: 400 });
        if (source_term_id === target_term_id)
            return NextResponse.json({ error: 'ต้นทางและปลายทางต้องไม่ใช่ภาคเรียนเดียวกัน' }, { status: 400 });

        const [sourceClasses] = await pool.query(
            'SELECT name, grade_level_id, advisor_id, advisor2_id, home_room_id FROM Classes WHERE academic_term_id = ?',
            [source_term_id]
        );

        const [existingRows] = await pool.query(
            'SELECT name FROM Classes WHERE academic_term_id = ?',
            [target_term_id]
        );
        const existingNames = new Set((existingRows as any[]).map(r => r.name));

        let copied = 0;
        let skipped = 0;
        for (const cls of sourceClasses as any[]) {
            if (existingNames.has(cls.name)) { skipped++; continue; }
            await pool.query(
                'INSERT INTO Classes (name, grade_level_id, academic_term_id, advisor_id, advisor2_id, home_room_id) VALUES (?, ?, ?, ?, ?, ?)',
                [cls.name, cls.grade_level_id, target_term_id, cls.advisor_id, cls.advisor2_id, cls.home_room_id]
            );
            copied++;
        }

        return NextResponse.json({ copied, skipped });
    } catch (error) {
        return NextResponse.json({ error: 'คัดลอกไม่สำเร็จ' }, { status: 500 });
    }
}
