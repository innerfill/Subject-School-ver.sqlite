import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const TYPE_MAP: Record<string, string> = {
    'พื้นฐาน': 'Fundamental', 'เพิ่มเติม': 'Additional', 'กิจกรรม': 'Activity',
    'fundamental': 'Fundamental', 'additional': 'Additional', 'activity': 'Activity',
};

const semLabel = (s: number | null) => s === 1 ? 'ภาค 1' : s === 2 ? 'ภาค 2' : 'ทั้งปี';

export async function POST(request: Request) {
    try {
        const { rows } = await request.json();
        if (!Array.isArray(rows) || rows.length === 0)
            return NextResponse.json({ error: 'No rows' }, { status: 400 });

        const [grades] = await pool.query('SELECT id, name FROM GradeLevels');
        const gradeMap = new Map<string, number>();
        (grades as any[]).forEach(g => gradeMap.set(g.name.trim().toLowerCase(), g.id));

        const results = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const issues: string[] = [];

            const code = row.code?.trim() || '';
            const name = row.name?.trim() || '';
            const grade_level_name = row.grade_level_name?.trim() || '';
            const semesterRaw = row.semester?.toString().trim() || '';
            const creditsRaw = parseFloat(row.credits);
            const hoursRaw = parseInt(row.hours_per_week);

            if (!code) issues.push('ไม่มีรหัสวิชา');
            if (!name) issues.push('ไม่มีชื่อวิชา');

            const mappedType = TYPE_MAP[row.type?.trim()?.toLowerCase()] || TYPE_MAP[row.type?.trim()] || null;
            if (!mappedType && row.type?.trim()) issues.push(`ประเภท "${row.type}" ไม่รู้จัก → ใช้ Fundamental`);
            const finalType = mappedType || 'Fundamental';

            if (isNaN(creditsRaw)) issues.push('หน่วยกิตไม่ถูกต้อง → ใช้ 1.0');
            if (isNaN(hoursRaw) || hoursRaw < 1) issues.push('ชม./สัปดาห์ไม่ถูกต้อง → ใช้ 2');

            const gradeId = grade_level_name ? (gradeMap.get(grade_level_name.toLowerCase()) ?? null) : null;
            if (grade_level_name && gradeId === null) issues.push(`ไม่พบระดับชั้น "${grade_level_name}"`);

            const semester = semesterRaw === '1' ? 1 : semesterRaw === '2' ? 2 : null;

            const base = {
                rowIndex: i + 2,
                code,
                name,
                credits: isNaN(creditsRaw) ? 1.0 : creditsRaw,
                hours_per_week: isNaN(hoursRaw) || hoursRaw < 1 ? 2 : hoursRaw,
                type: finalType,
                grade_level_name,
                grade_level_id: gradeId,
                semester,
                issues,
                changes: [] as string[],
                existingId: null as number | null,
            };

            if (!code || !name) {
                results.push({ ...base, status: 'invalid' });
                continue;
            }

            const isActivityNoGrade = finalType === 'Activity' && gradeId === null;
            const gradeCheck = isActivityNoGrade
                ? '(grade_level_id IS NULL OR grade_level_id = 0)'
                : gradeId === null
                    ? 'grade_level_id IS NULL'
                    : 'grade_level_id = ?';
            const gradeParams: any[] = gradeId === null ? [] : [gradeId];

            const [existingRows] = await pool.query(
                `SELECT id, name, credits, hours_per_week, semester FROM Subjects WHERE code = ? AND name = ? AND type = ? AND is_active = TRUE AND ${gradeCheck}`,
                [code, name, finalType, ...gradeParams]
            );

            if ((existingRows as any[]).length > 0) {
                const ex = (existingRows as any[])[0];
                const changes: string[] = [];

                if (Number(ex.credits) !== base.credits) changes.push(`หน่วยกิต: ${ex.credits} → ${base.credits}`);
                if (Number(ex.hours_per_week) !== base.hours_per_week) changes.push(`ชม.: ${ex.hours_per_week} → ${base.hours_per_week}`);
                const exSem = ex.semester ?? null;
                if (exSem !== semester) changes.push(`ภาคเรียน: ${semLabel(exSem)} → ${semLabel(semester)}`);

                if (changes.length > 0) {
                    results.push({ ...base, status: 'update', changes, existingId: ex.id });
                } else {
                    results.push({ ...base, status: 'duplicate' });
                }
                continue;
            }

            const [inactiveRows] = await pool.query(
                `SELECT id FROM Subjects WHERE code = ? AND name = ? AND type = ? AND is_active = FALSE AND ${gradeCheck}`,
                [code, name, finalType, ...gradeParams]
            );
            results.push({ ...base, status: (inactiveRows as any[]).length > 0 ? 'reactivate' : 'new' });
        }

        return NextResponse.json({
            rows: results,
            summary: {
                total: results.length,
                new: results.filter(r => r.status === 'new').length,
                update: results.filter(r => r.status === 'update').length,
                duplicate: results.filter(r => r.status === 'duplicate').length,
                reactivate: results.filter(r => r.status === 'reactivate').length,
                invalid: results.filter(r => r.status === 'invalid').length,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Preview failed', details: error.message }, { status: 500 });
    }
}
