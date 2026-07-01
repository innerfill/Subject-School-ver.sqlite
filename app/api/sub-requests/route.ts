import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// auto-expire past Pending rows
async function expirePastPending() {
    await pool.query(
        `UPDATE SubRequests SET notify_status = 'Expired'
         WHERE notify_status = 'Pending' AND date < CURDATE()`
    );
}

function generateLogId(id: number) {
    return 'SUB-' + String(id).padStart(4, '0');
}

// GET /api/sub-requests?date=&academic_term_id=&status=&type=stats
export async function GET(request: Request) {
    try {
        await expirePastPending();

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const term = searchParams.get('academic_term_id');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '100');

        // stats mode: ?type=stats&date=YYYY-MM-DD
        if (searchParams.get('type') === 'stats') {
            const statsDate = date || new Date().toISOString().split('T')[0];
            const [[row]] = await pool.query(
                `SELECT
                    SUM(CASE WHEN date = ? AND notify_status = 'Pending' THEN 1 ELSE 0 END) AS pending_today,
                    SUM(CASE WHEN date = ? AND notify_status = 'Sent'    THEN 1 ELSE 0 END) AS sent_today,
                    SUM(CASE WHEN YEAR(date) = YEAR(?) AND MONTH(date) = MONTH(?)
                              AND notify_status NOT IN ('Failed','Expired')  THEN 1 ELSE 0 END) AS total_month
                 FROM SubRequests`,
                [statsDate, statsDate, statsDate, statsDate]
            ) as any;
            return NextResponse.json({
                pending_today: Number(row.pending_today) || 0,
                sent_today:    Number(row.sent_today)    || 0,
                total_month:   Number(row.total_month)   || 0,
            });
        }

        let query = `
            SELECT
                sr.*,
                ta.name  AS absent_teacher_name,
                ta.color AS absent_teacher_color,
                ts2.name AS sub_teacher_name,
                ts2.color AS sub_teacher_color,
                ts.start_time, ts.end_time, ts.order_index,
                c.name   AS class_name,
                s.name   AS subject_name, s.code AS subject_code
            FROM SubRequests sr
            JOIN teachers ta   ON ta.id = sr.absent_teacher_id
            LEFT JOIN teachers ts2 ON ts2.id = sr.sub_teacher_id
            JOIN timeslots ts  ON ts.id = sr.timeslot_id
            LEFT JOIN classes c ON c.id = sr.class_id
            LEFT JOIN subjects s ON s.id = sr.subject_id
            WHERE 1=1
        `;
        const params: any[] = [];
        const dateFrom = searchParams.get('date_from');
        const dateTo   = searchParams.get('date_to');
        const absentId = searchParams.get('absent_teacher_id');
        const subId    = searchParams.get('sub_teacher_id');

        if (date)     { query += ' AND sr.date = ?';               params.push(date); }
        if (dateFrom) { query += ' AND sr.date >= ?';              params.push(dateFrom); }
        if (dateTo)   { query += ' AND sr.date <= ?';              params.push(dateTo); }
        if (term)     { query += ' AND sr.academic_term_id = ?';   params.push(term); }
        if (status)   { query += ' AND sr.notify_status = ?';      params.push(status); }
        if (absentId) { query += ' AND sr.absent_teacher_id = ?';  params.push(absentId); }
        if (subId)    { query += ' AND sr.sub_teacher_id = ?';     params.push(subId); }

        query += ' ORDER BY sr.date DESC, ts.start_time ASC LIMIT ?';
        params.push(limit);

        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch sub requests' }, { status: 500 });
    }
}

// POST /api/sub-requests — สร้าง 1 หรือหลาย requests พร้อมกัน
export async function POST(request: Request) {
    try {
        const body = await request.json();
        // รับทั้ง single object และ array
        const items: any[] = Array.isArray(body) ? body : [body];

        if (items.length === 0) return NextResponse.json({ error: 'No data' }, { status: 400 });

        const results = [];
        const conn = await (pool as any).getConnection();
        try {
            await conn.beginTransaction();

            for (const item of items) {
                const { date, leave_type, absent_teacher_id, timeslot_id, class_id, subject_id, sub_teacher_id, academic_term_id } = item;

                if (!date || !leave_type || !absent_teacher_id || !timeslot_id) {
                    throw new Error('date, leave_type, absent_teacher_id, timeslot_id required');
                }

                // คำนวณ day_of_week
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayOfWeek = days[new Date(date).getDay()];

                // ตรวจซ้ำ
                const [dup] = await conn.query(
                    `SELECT id FROM SubRequests WHERE date = ? AND absent_teacher_id = ? AND timeslot_id = ? AND notify_status NOT IN ('Failed','Expired')`,
                    [date, absent_teacher_id, timeslot_id]
                );
                if ((dup as any[]).length > 0) {
                    throw new Error(`ซ้ำ: ครู ID ${absent_teacher_id} มีคาบนี้อยู่แล้วในวันที่ ${date}`);
                }

                const [ins] = await conn.query(
                    `INSERT INTO SubRequests (date, day_of_week, leave_type, absent_teacher_id, timeslot_id, class_id, subject_id, sub_teacher_id, academic_term_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [date, dayOfWeek, leave_type, absent_teacher_id, timeslot_id, class_id || null, subject_id || null, sub_teacher_id || null, academic_term_id || null]
                );
                const newId = (ins as any).insertId;
                const logId = generateLogId(newId);
                await conn.query('UPDATE SubRequests SET log_id = ? WHERE id = ?', [logId, newId]);

                // อัปเดต sub_count ของครูที่รับสอนแทน
                if (sub_teacher_id) {
                    await conn.query('UPDATE teachers SET sub_count = sub_count + 1 WHERE id = ?', [sub_teacher_id]);
                }

                results.push({ id: newId, log_id: logId });
            }

            await conn.commit();
            return NextResponse.json({ success: true, results }, { status: 201 });
        } catch (e: any) {
            await conn.rollback();
            return NextResponse.json({ error: e.message }, { status: 409 });
        } finally {
            conn.release();
        }
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create sub request' }, { status: 500 });
    }
}

// PATCH /api/sub-requests?id= — อัปเดต sub_teacher_id หรือ notify_status
export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const body = await request.json();
        const { sub_teacher_id, notify_status } = body;

        // ดู record เดิม
        const [existing] = await pool.query('SELECT * FROM SubRequests WHERE id = ?', [id]);
        if ((existing as any[]).length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const old = (existing as any[])[0];

        if (sub_teacher_id !== undefined) {
            // ถ้าเปลี่ยนครูสอนแทน: ลด sub_count ตัวเก่า เพิ่มตัวใหม่
            if (old.sub_teacher_id && old.sub_teacher_id !== sub_teacher_id) {
                await pool.query('UPDATE teachers SET sub_count = GREATEST(0, sub_count - 1) WHERE id = ?', [old.sub_teacher_id]);
            }
            if (sub_teacher_id && sub_teacher_id !== old.sub_teacher_id) {
                await pool.query('UPDATE teachers SET sub_count = sub_count + 1 WHERE id = ?', [sub_teacher_id]);
            }
            await pool.query('UPDATE SubRequests SET sub_teacher_id = ? WHERE id = ?', [sub_teacher_id, id]);
        }

        if (notify_status !== undefined) {
            const allowed = ['Pending', 'Sent', 'Failed', 'Expired'];
            if (!allowed.includes(notify_status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            await pool.query('UPDATE SubRequests SET notify_status = ? WHERE id = ?', [notify_status, id]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update sub request' }, { status: 500 });
    }
}

// DELETE /api/sub-requests?id= — ลบได้เฉพาะ Pending
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const [rows] = await pool.query('SELECT * FROM SubRequests WHERE id = ?', [id]);
        if ((rows as any[]).length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const row = (rows as any[])[0];

        if (row.notify_status !== 'Pending') {
            return NextResponse.json({ error: `ลบไม่ได้: status เป็น "${row.notify_status}" — ลบได้เฉพาะ Pending` }, { status: 409 });
        }

        await pool.query('DELETE FROM SubRequests WHERE id = ?', [id]);

        if (row.sub_teacher_id) {
            await pool.query('UPDATE teachers SET sub_count = GREATEST(0, sub_count - 1) WHERE id = ?', [row.sub_teacher_id]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to delete sub request' }, { status: 500 });
    }
}
