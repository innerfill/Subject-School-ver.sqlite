import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

function activityGroup(name: string): string {
    if (name.includes('ลูกเสือ')) return 'SCOUT';
    if (name.includes('ชุมนุม')) return 'CLUB';
    if (name.includes('แนะแนว')) return 'GUIDANCE';
    return 'OTHER';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const rows = body.rows || [];

        if (!Array.isArray(rows) || rows.length === 0)
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });

        const [grades] = await pool.query('SELECT id, name FROM GradeLevels');
        const gradeMap = new Map<string, number>();
        (grades as any[]).forEach(g => gradeMap.set(g.name.trim().toLowerCase(), g.id));

        const typeMap: Record<string, string> = {
            'พื้นฐาน': 'Fundamental', 'เพิ่มเติม': 'Additional', 'กิจกรรม': 'Activity',
            'fundamental': 'Fundamental', 'additional': 'Additional', 'activity': 'Activity',
        };

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let reactivatedCount = 0;
        let invalidCount = 0;

        for (const row of rows) {
            const { code, name, credits, hours_per_week, type, grade_level_name, semester, status, existingId } = row;

            if (!code || !name) { invalidCount++; continue; }

            const mappedType = typeMap[type?.trim()?.toLowerCase()] || typeMap[type?.trim()] || 'Fundamental';
            const mappedCredits = parseFloat(credits) || 1.0;
            const mappedHours = parseInt(hours_per_week) || 2;
            const semesterValue = semester === 1 || semester === '1' ? 1
                : semester === 2 || semester === '2' ? 2 : null;
            const mappedGradeId: number | null =
                row.grade_level_id != null
                    ? (row.grade_level_id || null)
                    : (gradeMap.get(grade_level_name?.trim()?.toLowerCase()) ?? null);
            const agGroup = mappedType === 'Activity' ? activityGroup(name) : null;

            // Update existing active record
            if (status === 'update' && existingId) {
                await pool.query(
                    'UPDATE Subjects SET name=?, credits=?, hours_per_week=?, grade_level_id=?, semester=?, activity_group=? WHERE id=?',
                    [name.trim(), mappedCredits, mappedHours, mappedGradeId, semesterValue, agGroup, existingId]
                );
                updatedCount++;
                continue;
            }

            const isActivityNoGrade = mappedType === 'Activity' && mappedGradeId === null;
            const gradeCheck = isActivityNoGrade
                ? '(grade_level_id IS NULL OR grade_level_id = 0)'
                : mappedGradeId === null
                    ? 'grade_level_id IS NULL'
                    : 'grade_level_id = ?';
            const gradeParams: any[] = mappedGradeId === null ? [] : [mappedGradeId];

            const [existing] = await pool.query(
                `SELECT id FROM Subjects WHERE code = ? AND type = ? AND is_active = TRUE AND ${gradeCheck}`,
                [code, mappedType, ...gradeParams]
            );
            if ((existing as any[]).length > 0) { skippedCount++; continue; }

            const [inactive] = await pool.query(
                `SELECT id FROM Subjects WHERE code = ? AND type = ? AND is_active = FALSE AND ${gradeCheck}`,
                [code, mappedType, ...gradeParams]
            );

            if ((inactive as any[]).length > 0) {
                const inactiveId = (inactive as any[])[0].id;
                await pool.query(
                    'UPDATE Subjects SET name=?, credits=?, hours_per_week=?, type=?, activity_group=?, grade_level_id=?, semester=?, is_active=TRUE WHERE id=?',
                    [name.trim(), mappedCredits, mappedHours, mappedType, agGroup, mappedGradeId, semesterValue, inactiveId]
                );
                reactivatedCount++;
            } else {
                await pool.query(
                    'INSERT INTO Subjects (code, name, credits, hours_per_week, type, grade_level_id, activity_group, semester) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [code.trim(), name.trim(), mappedCredits, mappedHours, mappedType, mappedGradeId, agGroup, semesterValue]
                );
                insertedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            inserted: insertedCount + reactivatedCount,
            updated: updatedCount,
            skipped: skippedCount,
            reactivated: reactivatedCount,
            invalid: invalidCount,
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json({ error: 'Failed to import subjects', details: error.message }, { status: 500 });
    }
}
