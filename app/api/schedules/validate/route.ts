import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface Violation {
    type: 'consecutive' | 'duplicate_subject' | 'overload_week' | 'overload_day';
    severity: 'warning' | 'error';
    message: string;
}

const DAYS_TH: Record<string, string> = {
    Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ',
    Thursday: 'พฤหัสบดี', Friday: 'ศุกร์',
};

const MAX_PERIODS_WEEK = 25;
const MAX_PERIODS_DAY = 6;
const MAX_CONSECUTIVE = 3;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const termId = searchParams.get('term_id');

        let activeTermId = termId;
        if (!activeTermId) {
            const [terms] = await pool.query(`SELECT id FROM AcademicTerms WHERE status = 'Active' LIMIT 1`) as any;
            if (terms.length > 0) activeTermId = terms[0].id;
        }

        // Fetch time slots to get order_index mapping
        const [timeSlots] = await pool.query('SELECT start_time, order_index, type FROM TimeSlots ORDER BY order_index') as any;
        const slotMap: Record<string, { order_index: number; type: string }> = {};
        for (const ts of timeSlots) {
            slotMap[ts.start_time.slice(0, 5)] = { order_index: ts.order_index, type: ts.type };
        }
        // Set of order_index values that are Break
        const breakIndexes = new Set(timeSlots.filter((ts: any) => ts.type === 'Break').map((ts: any) => ts.order_index));

        // Fetch all schedules for the term with teacher/class/subject names
        const [schedules] = await pool.query(`
            SELECT s.id, s.day_of_week, s.start_time, s.teacher_id, s.class_id, s.subject_id,
                   t.name AS teacher_name, c.name AS class_name, sub.name AS subject_name
            FROM Schedules s
            LEFT JOIN Teachers t ON s.teacher_id = t.id
            LEFT JOIN Classes c ON s.class_id = c.id
            LEFT JOIN Subjects sub ON s.subject_id = sub.id
            WHERE s.academic_term_id = ? AND s.teacher_id IS NOT NULL
        `, [activeTermId]) as any;

        const violations: Violation[] = [];

        // --- Rule 1: Consecutive periods per teacher per day ---
        const byTeacherDay: Record<string, any[]> = {};
        for (const s of schedules) {
            const key = `${s.teacher_id}__${s.day_of_week}`;
            if (!byTeacherDay[key]) byTeacherDay[key] = [];
            const slotInfo = slotMap[s.start_time.slice(0, 5)];
            if (slotInfo) byTeacherDay[key].push({ ...s, order_index: slotInfo.order_index });
        }

        for (const [key, slots] of Object.entries(byTeacherDay)) {
            const sorted = slots.sort((a, b) => a.order_index - b.order_index);
            let run = 1;
            for (let i = 1; i < sorted.length; i++) {
                const diff = sorted[i].order_index - sorted[i - 1].order_index;
                const hasBreakBetween = [...Array(diff - 1)].some((_, k) =>
                    breakIndexes.has(sorted[i - 1].order_index + k + 1)
                );
                if (diff === 1 && !hasBreakBetween) {
                    run++;
                } else {
                    run = 1;
                }
                if (run > MAX_CONSECUTIVE) {
                    const day = sorted[i].day_of_week;
                    violations.push({
                        type: 'consecutive',
                        severity: 'warning',
                        message: `${sorted[i].teacher_name} สอนต่อเนื่อง ${run} คาบ วัน${DAYS_TH[day] ?? day}`,
                    });
                    break; // report once per teacher-day
                }
            }
        }

        // --- Rule 2: Duplicate subject in same class same day ---
        const byClassDaySubject: Record<string, { count: number; class_name: string; subject_name: string; day: string }> = {};
        const allSchedules = await pool.query(`
            SELECT s.day_of_week, s.class_id, s.subject_id,
                   c.name AS class_name, sub.name AS subject_name
            FROM Schedules s
            LEFT JOIN Classes c ON s.class_id = c.id
            LEFT JOIN Subjects sub ON s.subject_id = sub.id
            WHERE s.academic_term_id = ?
        `, [activeTermId]) as any;

        for (const s of allSchedules[0]) {
            const key = `${s.class_id}__${s.day_of_week}__${s.subject_id}`;
            if (!byClassDaySubject[key]) byClassDaySubject[key] = { count: 0, class_name: s.class_name, subject_name: s.subject_name, day: s.day_of_week };
            byClassDaySubject[key].count++;
        }
        for (const v of Object.values(byClassDaySubject)) {
            if (v.count > 1) {
                violations.push({
                    type: 'duplicate_subject',
                    severity: 'warning',
                    message: `วิชา${v.subject_name} จัดซ้ำ ${v.count} คาบ วัน${DAYS_TH[v.day] ?? v.day} ชั้น ${v.class_name}`,
                });
            }
        }

        // --- Rule 3: Weekly overload per teacher ---
        const weeklyCount: Record<string, { name: string; count: number }> = {};
        for (const s of schedules) {
            if (!weeklyCount[s.teacher_id]) weeklyCount[s.teacher_id] = { name: s.teacher_name, count: 0 };
            weeklyCount[s.teacher_id].count++;
        }
        for (const v of Object.values(weeklyCount)) {
            if (v.count > MAX_PERIODS_WEEK) {
                violations.push({
                    type: 'overload_week',
                    severity: 'error',
                    message: `${v.name} สอน ${v.count} คาบ/สัปดาห์ (เกินกว่า ${MAX_PERIODS_WEEK} คาบ)`,
                });
            }
        }

        // --- Rule 4: Daily overload per teacher ---
        for (const [key, slots] of Object.entries(byTeacherDay)) {
            if (slots.length > MAX_PERIODS_DAY) {
                const { teacher_name, day_of_week } = slots[0];
                violations.push({
                    type: 'overload_day',
                    severity: 'warning',
                    message: `${teacher_name} สอน ${slots.length} คาบ วัน${DAYS_TH[day_of_week] ?? day_of_week} (เกินกว่า ${MAX_PERIODS_DAY} คาบ/วัน)`,
                });
            }
        }

        return NextResponse.json({ violations, term_id: activeTermId });
    } catch (error: any) {
        return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 500 });
    }
}
