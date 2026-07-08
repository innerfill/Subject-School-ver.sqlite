import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let termId = searchParams.get('term_id');

        const [terms] = await pool.query(`SELECT * FROM AcademicTerms WHERE status = 'Active' LIMIT 1`) as any;
        const activeTerm = terms[0] ?? null;
        if (!termId) termId = activeTerm?.id ?? null;

        if (!termId) {
            return NextResponse.json({ activeTerm: null, stats: null, classCompletion: [] });
        }

        const [selectedTermRows] = await pool.query('SELECT term FROM AcademicTerms WHERE id = ?', [termId]) as any;
        const termNumber = selectedTermRows[0]?.term ?? null;

        const [[{ total_teachers }]] = await pool.query('SELECT COUNT(*) as total_teachers FROM Teachers') as any;
        const [[{ total_classes }]] = await pool.query('SELECT COUNT(*) as total_classes FROM Classes') as any;
        const [[{ total_schedules }]] = await pool.query(
            'SELECT COUNT(*) as total_schedules FROM Schedules WHERE academic_term_id = ?', [termId]
        ) as any;

        const [[{ overloaded_teachers }]] = await pool.query(`
            SELECT COUNT(*) as overloaded_teachers FROM (
                SELECT teacher_id FROM Schedules
                WHERE academic_term_id = ? AND teacher_id IS NOT NULL
                GROUP BY teacher_id HAVING COUNT(*) > 22
            ) sub
        `, [termId]) as any;

        const [classCompletion] = await pool.query(`
            SELECT
                c.id,
                c.name,
                gl.name AS grade_name,
                (SELECT COUNT(*) FROM Schedules s WHERE s.class_id = c.id AND s.academic_term_id = ?) AS placed_periods,
                (SELECT COALESCE(SUM(sub.hours_per_week), 0) FROM Subjects sub
                 WHERE sub.grade_level_id = c.grade_level_id AND sub.is_active = TRUE
                 AND (sub.semester IS NULL OR sub.semester = ?)) AS total_expected
            FROM Classes c
            LEFT JOIN GradeLevels gl ON c.grade_level_id = gl.id
            ORDER BY gl.name, c.name
        `, [termId, termNumber]) as any;

        return NextResponse.json({
            activeTerm,
            stats: { total_teachers, total_classes, total_schedules, overloaded_teachers },
            classCompletion,
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
    }
}
