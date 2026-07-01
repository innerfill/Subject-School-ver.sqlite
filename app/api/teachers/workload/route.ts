import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const termId = searchParams.get('term_id');

        let activeTermId = termId;
        if (!activeTermId) {
            const [terms] = await pool.query('SELECT id FROM AcademicTerms WHERE status = "Active" LIMIT 1') as any;
            if (terms.length > 0) activeTermId = terms[0].id;
        }

        const [rows] = await pool.query(`
            SELECT
                t.id, t.name, t.color,
                d.name AS department_name,
                COUNT(combined.s_id) AS total_periods,
                SUM(CASE WHEN combined.day_of_week = 'Monday'    THEN 1 ELSE 0 END) AS monday,
                SUM(CASE WHEN combined.day_of_week = 'Tuesday'   THEN 1 ELSE 0 END) AS tuesday,
                SUM(CASE WHEN combined.day_of_week = 'Wednesday' THEN 1 ELSE 0 END) AS wednesday,
                SUM(CASE WHEN combined.day_of_week = 'Thursday'  THEN 1 ELSE 0 END) AS thursday,
                SUM(CASE WHEN combined.day_of_week = 'Friday'    THEN 1 ELSE 0 END) AS friday
            FROM Teachers t
            LEFT JOIN Departments d ON t.department_id = d.id
            LEFT JOIN (
                SELECT s.teacher_id AS teacher_id, s.id AS s_id, s.day_of_week
                FROM Schedules s
                LEFT JOIN Subjects sub ON sub.id = s.subject_id
                WHERE s.teacher_id IS NOT NULL AND s.academic_term_id = ?
                  AND (sub.activity_group IS NULL OR sub.activity_group NOT IN ('SCOUT','CLUB'))

                UNION ALL

                SELECT ca.teacher_id AS teacher_id, s.id AS s_id, s.day_of_week
                FROM Schedules s
                JOIN CourseAssignments ca
                    ON s.class_id = ca.class_id
                    AND s.subject_id = ca.subject_id
                    AND s.academic_term_id = ca.academic_term_id
                JOIN Subjects sub ON sub.id = s.subject_id
                WHERE s.teacher_id IS NULL AND s.is_locked = 1 AND s.academic_term_id = ?
                  AND sub.activity_group NOT IN ('SCOUT','CLUB')

                UNION ALL

                -- SCOUT/CLUB: ครูทั้งโรงเรียนได้รับคาบนี้ (1 คาบต่อ timeslot ต่อครู)
                SELECT t2.id AS teacher_id, slot.min_id AS s_id, slot.day_of_week
                FROM (
                    SELECT MIN(s.id) AS min_id, s.day_of_week, s.start_time
                    FROM Schedules s
                    JOIN Subjects sub ON sub.id = s.subject_id
                    WHERE s.is_locked = 1 AND s.academic_term_id = ?
                      AND sub.activity_group IN ('SCOUT','CLUB')
                    GROUP BY s.day_of_week, s.start_time
                ) slot
                CROSS JOIN Teachers t2
            ) combined ON combined.teacher_id = t.id
            GROUP BY t.id, t.name, t.color, d.name
            ORDER BY total_periods DESC, t.name ASC
        `, [activeTermId, activeTermId, activeTermId]) as any;

        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch workload', details: error.message }, { status: 500 });
    }
}
