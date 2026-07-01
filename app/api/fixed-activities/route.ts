import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const term_id = searchParams.get('term_id');

        let query = `
            SELECT fa.*, s.name as subject_name, s.code as subject_code
            FROM FixedActivities fa
            LEFT JOIN Subjects s ON fa.subject_id = s.id
        `;

        const params: any[] = [];
        if (term_id) {
            query += ` WHERE fa.academic_term_id = ?`;
            params.push(term_id);
        }

        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch fixed activities' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subject_id, activity_group, academic_term_id, day_of_week, start_time, end_time, target_grade_level_ids } = body;

        // Save target_grade_level_ids as JSON string
        const targets = JSON.stringify(target_grade_level_ids);

        // 1. Check same activity_group already assigned to any of these grades (any day/time)
        if (activity_group) {
            const [sameGroupRows] = await pool.query(
                `SELECT target_grade_level_ids FROM FixedActivities WHERE academic_term_id = ? AND activity_group = ?`,
                [academic_term_id, activity_group]
            ) as any[];
            for (const row of sameGroupRows) {
                let existing: number[] = [];
                try { existing = typeof row.target_grade_level_ids === 'string' ? JSON.parse(row.target_grade_level_ids) : row.target_grade_level_ids; } catch { existing = []; }
                const dup = (target_grade_level_ids as number[]).filter(id => existing.includes(id));
                if (dup.length > 0) {
                    const [gradeRows] = await pool.query(`SELECT name FROM GradeLevels WHERE id IN (${dup.map(() => '?').join(',')})`, dup) as any[];
                    const gradeNames = (gradeRows as any[]).map((r: any) => r.name).join(', ');
                    return NextResponse.json({ error: `กิจกรรมนี้ถูกล็อกให้ ${gradeNames} ไปแล้ว (ห้ามซ้ำในภาคเรียนเดียวกัน)` }, { status: 400 });
                }
            }
        }

        // 2. Check time overlap on same day for same grade levels
        const [existingActivities] = await pool.query(
            `SELECT id, target_grade_level_ids, activity_group FROM FixedActivities
             WHERE academic_term_id = ? AND day_of_week = ?
             AND (start_time < ? AND end_time > ?)`,
            [academic_term_id, day_of_week, end_time, start_time]
        );

        const existingList = existingActivities as any[];
        let overlappingGrades = false;

        for (const existing of existingList) {
            let existingTargets = [];
            try {
                existingTargets = typeof existing.target_grade_level_ids === 'string'
                    ? JSON.parse(existing.target_grade_level_ids)
                    : existing.target_grade_level_ids;
            } catch (e) {
                existingTargets = [];
            }

            if (target_grade_level_ids.some((gradeId: number) => existingTargets.includes(gradeId))) {
                overlappingGrades = true;
                break;
            }
        }

        if (overlappingGrades) {
            return NextResponse.json({
                error: 'ไม่สามารถเพิ่มได้ เนื่องจากมีกิจกรรมอื่นถูกล็อกไว้แล้วในวันและเวลาเดียวกัน สำหรับระดับชั้นที่เลือก'
            }, { status: 400 });
        }

        const [result] = await pool.query(
            `INSERT INTO FixedActivities (subject_id, activity_group, academic_term_id, day_of_week, start_time, end_time, target_grade_level_ids) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [subject_id || null, activity_group || null, academic_term_id, day_of_week, start_time, end_time, targets]
        );

        const fixedActivityId = (result as any).insertId;

        // Generate Schedules for target classes
        if (target_grade_level_ids.length > 0) {
            // 1. Find all classes in target grades for this term
            const [classes] = await pool.query(
                `SELECT id, grade_level_id FROM Classes WHERE grade_level_id IN (?)`,
                [target_grade_level_ids]
            );

            if ((classes as any[]).length > 0) {
                const scheduleValues = [];

                // 2. Prepare Subject Map if using Group
                let subjectMap: any = {}; // grade_level_id -> subject_id
                if (activity_group) {
                    const [subjects] = await pool.query(
                        `SELECT id, grade_level_id FROM Subjects WHERE activity_group = ? AND grade_level_id IN (?)`,
                        [activity_group, target_grade_level_ids]
                    );
                    (subjects as any[]).forEach(s => subjectMap[s.grade_level_id] = s.id);
                }

                // 3. Build Schedule Entries
                for (const cls of (classes as any[])) {
                    // Determine subject_id for this class (may be null if no subject mapped)
                    let finalSubjectId = subject_id || null;
                    if (activity_group) {
                        finalSubjectId = subjectMap[cls.grade_level_id] ?? null;
                    }

                    scheduleValues.push([
                        null, // teacher_id
                        finalSubjectId,
                        null, // room_id
                        cls.id,
                        day_of_week,
                        start_time,
                        end_time,
                        academic_term_id,
                        true, // is_locked
                        fixedActivityId
                    ]);
                }

                // 4. Batch Insert
                if (scheduleValues.length > 0) {
                    // Clear existing schedules for these slots to avoid conflicts/duplicates
                    const classIds = (classes as any[]).map((c: any) => c.id);
                    await pool.query(
                        `DELETE FROM Schedules 
                         WHERE class_id IN (?) 
                         AND day_of_week = ? 
                         AND start_time = ? 
                         AND academic_term_id = ?`,
                        [classIds, day_of_week, start_time, academic_term_id]
                    );

                    await pool.query(
                        `INSERT INTO Schedules (teacher_id, subject_id, room_id, class_id, day_of_week, start_time, end_time, academic_term_id, is_locked, fixed_activity_id) 
                         VALUES ?`,
                        [scheduleValues]
                    );
                }
            }
        }

        return NextResponse.json({ id: fixedActivityId, ...body }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create fixed activity' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // First, delete all schedules linked to this fixed activity
        await pool.query('DELETE FROM Schedules WHERE fixed_activity_id = ?', [id]);

        // Then delete the fixed activity itself
        await pool.query('DELETE FROM FixedActivities WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting fixed activity:', error);
        return NextResponse.json({ error: 'Failed to delete fixed activity' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, subject_id, activity_group, academic_term_id, day_of_week, start_time, end_time, target_grade_level_ids } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const targets = JSON.stringify(target_grade_level_ids);

        // 1. Check same activity_group already assigned to any of these grades (any day/time), excluding self
        if (activity_group) {
            const [sameGroupRows] = await pool.query(
                `SELECT target_grade_level_ids FROM FixedActivities WHERE academic_term_id = ? AND activity_group = ? AND id != ?`,
                [academic_term_id, activity_group, id]
            ) as any[];
            for (const row of sameGroupRows) {
                let existing: number[] = [];
                try { existing = typeof row.target_grade_level_ids === 'string' ? JSON.parse(row.target_grade_level_ids) : row.target_grade_level_ids; } catch { existing = []; }
                const dup = (target_grade_level_ids as number[]).filter(gid => existing.includes(gid));
                if (dup.length > 0) {
                    const [gradeRows] = await pool.query(`SELECT name FROM GradeLevels WHERE id IN (${dup.map(() => '?').join(',')})`, dup) as any[];
                    const gradeNames = (gradeRows as any[]).map((r: any) => r.name).join(', ');
                    return NextResponse.json({ error: `กิจกรรมนี้ถูกล็อกให้ ${gradeNames} ไปแล้ว (ห้ามซ้ำในภาคเรียนเดียวกัน)` }, { status: 400 });
                }
            }
        }

        // 2. Check time overlap on same day for same grade levels, excluding self
        const [existingActivities] = await pool.query(
            `SELECT id, target_grade_level_ids, activity_group FROM FixedActivities
             WHERE academic_term_id = ? AND day_of_week = ?
             AND (start_time < ? AND end_time > ?) AND id != ?`,
            [academic_term_id, day_of_week, end_time, start_time, id]
        );

        const existingList = existingActivities as any[];
        let overlappingGrades = false;

        for (const existing of existingList) {
            let existingTargets = [];
            try {
                existingTargets = typeof existing.target_grade_level_ids === 'string'
                    ? JSON.parse(existing.target_grade_level_ids)
                    : existing.target_grade_level_ids;
            } catch (e) {
                existingTargets = [];
            }

            if (target_grade_level_ids.some((gradeId: number) => existingTargets.includes(gradeId))) {
                overlappingGrades = true;
                break;
            }
        }

        if (overlappingGrades) {
            return NextResponse.json({
                error: 'ไม่สามารถอัปเดตได้ เนื่องจากมีกิจกรรมอื่นถูกล็อกไว้แล้วในวันและเวลาเดียวกัน สำหรับระดับชั้นที่เลือก'
            }, { status: 400 });
        }

        // Update FixedActivity
        await pool.query(
            `UPDATE FixedActivities 
             SET subject_id = ?, activity_group = ?, academic_term_id = ?, day_of_week = ?, start_time = ?, end_time = ?, target_grade_level_ids = ?
             WHERE id = ?`,
            [subject_id || null, activity_group || null, academic_term_id, day_of_week, start_time, end_time, targets, id]
        );

        // Clear existing schedules for this fixed activity
        await pool.query('DELETE FROM Schedules WHERE fixed_activity_id = ?', [id]);

        // Regenerate Schedules for target classes
        if (target_grade_level_ids.length > 0) {
            const [classes] = await pool.query(
                `SELECT id, grade_level_id FROM Classes WHERE grade_level_id IN (?)`,
                [target_grade_level_ids]
            );

            if ((classes as any[]).length > 0) {
                const scheduleValues = [];
                let subjectMap: any = {};
                
                if (activity_group) {
                    const [subjects] = await pool.query(
                        `SELECT id, grade_level_id FROM Subjects WHERE activity_group = ? AND grade_level_id IN (?)`,
                        [activity_group, target_grade_level_ids]
                    );
                    (subjects as any[]).forEach(s => subjectMap[s.grade_level_id] = s.id);
                }

                for (const cls of (classes as any[])) {
                    let finalSubjectId = subject_id || null;
                    if (activity_group) {
                        finalSubjectId = subjectMap[cls.grade_level_id] ?? null;
                    }

                    scheduleValues.push([
                        null, finalSubjectId, null, cls.id, day_of_week, start_time, end_time, academic_term_id, true, id
                    ]);
                }

                if (scheduleValues.length > 0) {
                    const classIds = (classes as any[]).map((c: any) => c.id);
                    await pool.query(
                        `DELETE FROM Schedules 
                         WHERE class_id IN (?) AND day_of_week = ? AND start_time = ? AND academic_term_id = ?`,
                        [classIds, day_of_week, start_time, academic_term_id]
                    );

                    await pool.query(
                        `INSERT INTO Schedules (teacher_id, subject_id, room_id, class_id, day_of_week, start_time, end_time, academic_term_id, is_locked, fixed_activity_id) 
                         VALUES ?`,
                        [scheduleValues]
                    );
                }
            }
        }

        return NextResponse.json({ id, ...body }, { status: 200 });
    } catch (error) {
        console.error('Error updating fixed activity:', error);
        return NextResponse.json({ error: 'Failed to update fixed activity' }, { status: 500 });
    }
}
