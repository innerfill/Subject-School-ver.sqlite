import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getConfig } from '@/lib/systemConfig';

async function getLineCredentials() {
    const token   = await getConfig('line_channel_access_token', process.env.LINE_CHANNEL_ACCESS_TOKEN);
    const groupId = await getConfig('line_group_id', process.env.LINE_GROUP_ID);
    return { token, groupId };
}

// POST /api/notify/line?test=1 — ส่ง LINE push
// test=1: ส่ง test message โดยไม่แก้ status ใน DB
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const isTest = searchParams.get('test') === '1';

    const { token, groupId } = await getLineCredentials();

    if (!token || !groupId || token === 'your_channel_access_token_here') {
        return NextResponse.json(
            { error: 'LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_GROUP_ID ยังไม่ได้ตั้งค่า' },
            { status: 503 }
        );
    }

    if (isTest) {
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                to: groupId,
                messages: [{ type: 'text', text: '✅ ทดสอบการเชื่อมต่อ LINE สำเร็จ\nระบบจัดสอนแทน พร้อมใช้งาน' }],
            }),
        });
        if (!lineRes.ok) {
            const err = await lineRes.text();
            return NextResponse.json({ error: `LINE API error: ${err}` }, { status: 502 });
        }
        return NextResponse.json({ success: true, message: 'ส่ง test message สำเร็จ' });
    }

    // ดึง Pending ทั้งหมด
    const [rows] = await pool.query(
        `SELECT
            sr.id,
            sr.date,
            ts.order_index,
            ts.start_time, ts.end_time,
            ta.name AS absent_teacher,
            tb.name AS sub_teacher,
            s.name  AS subject_name,
            c.name  AS class_name
         FROM SubRequests sr
         JOIN timeslots ts   ON ts.id = sr.timeslot_id
         JOIN teachers ta    ON ta.id = sr.absent_teacher_id
         LEFT JOIN teachers tb ON tb.id = sr.sub_teacher_id
         LEFT JOIN subjects s  ON s.id = sr.subject_id
         LEFT JOIN classes c   ON c.id = sr.class_id
         WHERE sr.notify_status = 'Pending'
         ORDER BY sr.date ASC, ts.order_index ASC`
    ) as any;

    if ((rows as any[]).length === 0) {
        return NextResponse.json({ message: 'ไม่มีรายการที่รอแจ้งเตือน', sent: 0 });
    }

    // จัดกลุ่มตามวัน
    const byDate: Record<string, any[]> = {};
    for (const r of rows as any[]) {
        const key = String(r.date).split('T')[0];
        (byDate[key] = byDate[key] || []).push(r);
    }

    const lines: string[] = ['📋 แจ้งการจัดสอนแทน'];
    for (const [dateKey, items] of Object.entries(byDate)) {
        const [y, m, d] = dateKey.split('-');
        lines.push(`\n📅 วันที่ ${d}/${m}/${parseInt(y) + 543}`);
        lines.push('─────────────────');
        for (const item of items) {
            const start = String(item.start_time).slice(0, 5);
            const end   = String(item.end_time).slice(0, 5);
            lines.push(
                `คาบ ${item.order_index} (${start}–${end})` +
                (item.subject_name ? ` ${item.subject_name}` : '') +
                (item.class_name   ? ` ชั้น ${item.class_name}` : '') +
                `\n  ครูขาด: ${item.absent_teacher}` +
                `\n  สอนแทน: ${item.sub_teacher || '(ยังไม่ระบุ)'}`
            );
        }
    }
    lines.push('─────────────────');
    lines.push(`รวม ${(rows as any[]).length} คาบ`);

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: lines.join('\n') }] }),
    });

    const ids = (rows as any[]).map((r: any) => r.id);
    if (!lineRes.ok) {
        const err = await lineRes.text();
        await pool.query(`UPDATE SubRequests SET notify_status = 'Failed' WHERE id IN (?)`, [ids]);
        return NextResponse.json({ error: `LINE API error: ${err}` }, { status: 502 });
    }

    await pool.query(`UPDATE SubRequests SET notify_status = 'Sent' WHERE id IN (?)`, [ids]);
    return NextResponse.json({ success: true, sent: ids.length });
}
