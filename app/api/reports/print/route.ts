import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'student' or 'teacher'
        const id = searchParams.get('id'); // class_id or teacher_id
        const termId = searchParams.get('term_id');

        if (!id || !type) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Get Active Term if not provided
        let activeTermId = termId;
        let activeTermName = '';
        let activeTermYear = '';

        if (!activeTermId) {
            const [terms] = await pool.query('SELECT id, term, year FROM AcademicTerms WHERE status = "Active" LIMIT 1');
            const termsArray = terms as any[];
            if (termsArray.length > 0) {
                activeTermId = termsArray[0].id;
                activeTermName = termsArray[0].term;
                activeTermYear = termsArray[0].year;
            }
        } else {
            const [terms] = await pool.query('SELECT term, year FROM AcademicTerms WHERE id = ?', [activeTermId]);
            const termsArray = terms as any[];
            if (termsArray.length > 0) {
                activeTermName = termsArray[0].term;
                activeTermYear = termsArray[0].year;
            }
        }

        // 2. Fetch Common Data (School Settings & Signatories)
        const [settings] = await pool.query('SELECT * FROM SchoolSettings LIMIT 1');
        const [signatories] = await pool.query('SELECT * FROM Signatories');

        // Fetch Time Slots for Dynamic Layout
        const [timeSlots] = await pool.query('SELECT * FROM TimeSlots ORDER BY start_time ASC');

        let reportData = {};

        if (type === 'student') {
            // Fetch Class Info
            const [classes] = await pool.query(`
                SELECT c.name, t.name as advisor_name, t.prefix as advisor_prefix, t.rank as advisor_rank, t2.name as advisor2_name, t2.prefix as advisor2_prefix, t2.rank as advisor2_rank
                FROM Classes c 
                LEFT JOIN Teachers t ON c.advisor_id = t.id 
                LEFT JOIN Teachers t2 ON c.advisor2_id = t2.id
                WHERE c.id = ?
            `, [id]);

            const classesArray = classes as any[];
            if (classesArray.length === 0) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

            // Fetch Schedule
            const [schedule] = await pool.query(`
                SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.credits as credit, sub.color_code,
                       t.name as teacher_name, t.prefix as teacher_prefix, t.rank as teacher_rank, r.name as room_name
                FROM Schedules s
                LEFT JOIN Subjects sub ON s.subject_id = sub.id
                LEFT JOIN Teachers t ON s.teacher_id = t.id
                LEFT JOIN Rooms r ON s.room_id = r.id
                WHERE s.class_id = ? AND s.academic_term_id = ?
            `, [id, activeTermId]);

            // Fetch Subjects Summary for Footer
            const [subjectsSummary] = await pool.query(`
                SELECT sub.code, sub.name, sub.credits as credit, sub.hours_per_week
                FROM Schedules s
                JOIN Subjects sub ON s.subject_id = sub.id
                WHERE s.class_id = ? AND s.academic_term_id = ?
                GROUP BY sub.id
            `, [id, activeTermId]);

            reportData = {
                header: {
                    title: `ตารางเรียนชั้น ${classesArray[0].name}`,
                    subtitle: `ครูที่ปรึกษา: ${[
                        classesArray[0].advisor_name ? `${classesArray[0].advisor_rank || classesArray[0].advisor_prefix || 'ครู'}${classesArray[0].advisor_name}` : null,
                        classesArray[0].advisor2_name ? `${classesArray[0].advisor2_rank || classesArray[0].advisor2_prefix || 'ครู'}${classesArray[0].advisor2_name}` : null
                    ].filter(Boolean).join(' และ ')}`,
                    term_info: activeTermId ? ` ภาคเรียนที่ ${activeTermName} ปีการศึกษา ${activeTermYear}` : ' (ไม่พบปีการศึกษาปัจจุบัน)',
                    advisor_name: classesArray[0].advisor_name, // Add for signature
                    advisor_prefix: classesArray[0].advisor_prefix,
                    advisor_rank: classesArray[0].advisor_rank,
                    advisor2_name: classesArray[0].advisor2_name, // Add second advisor for signature
                    advisor2_prefix: classesArray[0].advisor2_prefix,
                    advisor2_rank: classesArray[0].advisor2_rank
                },
                schedule,
                summary: subjectsSummary
            };

        } else if (type === 'teacher') {
            // Fetch Teacher Info
            const [teachers] = await pool.query(`
                SELECT t.id, t.name, t.prefix, t.rank, d.name as department_name 
                FROM Teachers t 
                LEFT JOIN Departments d ON t.department_id = d.id 
                WHERE t.id = ?
            `, [id]);

            const teachersArray = teachers as any[];
            if (teachersArray.length === 0) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

            // Fetch Schedule
            const [schedule] = await pool.query(`
                SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color_code, sub.is_countable,
                       c.name as class_name, r.name as room_name
                FROM Schedules s
                LEFT JOIN Subjects sub ON s.subject_id = sub.id
                LEFT JOIN Classes c ON s.class_id = c.id
                LEFT JOIN Rooms r ON s.room_id = r.id
                LEFT JOIN CourseAssignments ca ON s.class_id = ca.class_id AND s.subject_id = ca.subject_id AND s.academic_term_id = ca.academic_term_id
                WHERE (
                    s.teacher_id = ?
                    OR (s.teacher_id IS NULL AND ca.teacher_id = ?)
                    OR (s.is_locked = 1 AND sub.activity_group IN ('SCOUT','CLUB'))
                )
                AND s.academic_term_id = ?
            `, [id, id, activeTermId]);

            const scheduleArray = schedule as any[];

            // Calculate Teaching Load
            // Count distinct slots (day + period) where subject is countable
            const countableSlots = scheduleArray.filter((s: any) => s.is_countable === 1).length;

            reportData = {
                header: {
                    title: `ตารางสอน ${teachersArray[0].rank || teachersArray[0].prefix || 'ครู'}${teachersArray[0].name}`,
                    subtitle: `กลุ่มสาระการเรียนรู้${teachersArray[0].department_name || '-'}`,
                    term_info: activeTermId ? ` ภาคเรียนที่ ${activeTermName} ปีการศึกษา ${activeTermYear}` : ' (ไม่พบปีการศึกษาปัจจุบัน)',
                    info_right: `จำนวนคาบสอน: ${countableSlots} คาบ/สัปดาห์`,
                    teacher_name: teachersArray[0].name, // Add for signature
                    teacher_prefix: teachersArray[0].prefix,
                    teacher_rank: teachersArray[0].rank
                },
                schedule,
                summary: []
            };
        }

        return NextResponse.json({
            school: (settings as any)[0] || {},
            signatories,
            data: reportData,
            timeSlots, // Add timeSlots at top level
            term_id: activeTermId
        });

    } catch (error: any) {
        console.error('Report data error:', error);
        return NextResponse.json({ error: 'Failed to fetch report data', details: error.message }, { status: 500 });
    }
}
