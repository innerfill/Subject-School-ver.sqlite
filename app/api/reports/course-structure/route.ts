import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_schedule',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
        return NextResponse.json({ error: 'Missing classId' }, { status: 400 });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 1. Get active term
        const [terms] = await connection.query<any[]>(
            "SELECT * FROM AcademicTerms WHERE status = 'Active' LIMIT 1"
        );
        const term = terms[0];
        if (!term) {
            return NextResponse.json({ error: 'No active academic term found' }, { status: 400 });
        }

        // 2. Get school settings
        let schoolSettings = { school_name: 'โรงเรียนมุกดาวิทยานุกูล', affiliation: 'จังหวัดมุกดาหาร' };
        // There is a settings API which saves to a file or db, but for simplicity let's hardcode defaults if not fetched.
        // Actually, we can fetch from the `SchoolSettings` if it exists. In page.tsx it was fetched via /api/reports/settings. 
        // For now, the component will handle the school name passed from frontend if needed, or we can just send defaults.

        // 3. Get class and advisors
        const [classes] = await connection.query<any[]>(`
            SELECT 
                c.id, c.name, c.grade_level_id, 
                g.name as grade_name,
                t1.name as advisor1_name,
                t1.prefix as advisor1_prefix,
                t1.rank as advisor1_rank,
                t2.name as advisor2_name,
                t2.prefix as advisor2_prefix,
                t2.rank as advisor2_rank
            FROM Classes c
            LEFT JOIN GradeLevels g ON c.grade_level_id = g.id
            LEFT JOIN Teachers t1 ON c.advisor_id = t1.id
            LEFT JOIN Teachers t2 ON c.advisor2_id = t2.id
            WHERE c.id = ?
        `, [classId]);

        const classInfo = classes[0];
        if (!classInfo) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        // 4. Fetch subjects for the grade level and join with CourseAssignments for teachers
        const [subjects] = await connection.query<any[]>(`
            SELECT 
                s.id as subject_id,
                s.code as subject_code,
                s.name as subject_name,
                s.credits,
                s.hours_per_week,
                s.type,
                GROUP_CONCAT(DISTINCT CONCAT(COALESCE(CONCAT(t.rank, ' '), IF(t.prefix IS NULL OR t.prefix = '', 'ครู', CONCAT(t.prefix, ' '))), t.name) SEPARATOR ', ') as teacher_names
            FROM Subjects s
            LEFT JOIN CourseAssignments ca ON ca.subject_id = s.id AND ca.class_id = ? AND ca.academic_term_id = ?
            LEFT JOIN Teachers t ON ca.teacher_id = t.id
            WHERE s.grade_level_id = ? AND s.is_active = TRUE
            GROUP BY s.id, s.code, s.name, s.credits, s.hours_per_week, s.type
            ORDER BY 
                CASE s.type
                    WHEN 'Fundamental' THEN 1
                    WHEN 'Additional' THEN 2
                    WHEN 'Activity' THEN 3
                    ELSE 4
                END,
                s.code
        `, [classId, term.id, classInfo.grade_level_id]);

        return NextResponse.json({
            header: {
                class_name: classInfo.name,
                grade_name: classInfo.grade_name,
                term_info: `ภาคเรียนที่ ${term.term} ปีการศึกษา ${term.year}`,
                advisor1_name: classInfo.advisor1_name || '',
                advisor1_prefix: classInfo.advisor1_prefix || '',
                advisor1_rank: classInfo.advisor1_rank || '',
                advisor2_name: classInfo.advisor2_name || '',
                advisor2_prefix: classInfo.advisor2_prefix || '',
                advisor2_rank: classInfo.advisor2_rank || ''
            },
            subjects: subjects
        });

    } catch (error: any) {
        console.error('Error fetching course structure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
