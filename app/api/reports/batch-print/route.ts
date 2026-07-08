import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'student' or 'teacher'
        const termId = searchParams.get('term_id');

        if (!type) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Get Active Term if not provided
        let activeTermId = termId;
        let activeTermName = '';
        let activeTermYear = '';

        if (!activeTermId) {
            const [terms] = await pool.query(`SELECT id, term, year FROM AcademicTerms WHERE status = 'Active' LIMIT 1`);
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

        // 2. Fetch Common Data
        const [settings] = await pool.query('SELECT * FROM SchoolSettings LIMIT 1');
        const [signatories] = await pool.query('SELECT * FROM Signatories');
        const [timeSlots] = await pool.query('SELECT * FROM TimeSlots ORDER BY start_time ASC');

        let reports: any[] = [];

        if (type === 'student') {
            // Fetch ALL Classes
            const [classes] = await pool.query('SELECT id, name, advisor_id, advisor2_id FROM Classes ORDER BY name');
            const classesArray = classes as any[];

            for (const cls of classesArray) {
                // Fetch Advisor Name
                let advisorName: string | null = null;
                let advisorPrefix: string | null = null;
                let advisorRank: string | null = null;
                if (cls.advisor_id) {
                    const [advisor] = await pool.query('SELECT name, prefix, rank FROM Teachers WHERE id = ?', [cls.advisor_id]);
                    const advisorArray = advisor as any[];
                    if (advisorArray.length > 0) {
                        advisorName = advisorArray[0].name;
                        advisorPrefix = advisorArray[0].prefix;
                        advisorRank = advisorArray[0].rank;
                    }
                }

                let advisor2Name = null;
                let advisor2Prefix = null;
                let advisor2Rank = null;
                if (cls.advisor2_id) {
                    const [advisor2] = await pool.query('SELECT name, prefix, rank FROM Teachers WHERE id = ?', [cls.advisor2_id]);
                    const advisor2Array = advisor2 as any[];
                    if (advisor2Array.length > 0) {
                        advisor2Name = advisor2Array[0].name;
                        advisor2Prefix = advisor2Array[0].prefix;
                        advisor2Rank = advisor2Array[0].rank;
                    }
                }

                // Fetch Schedule
                const [schedule] = await pool.query(`
                    SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color_code, sub.credits as credit,
                           t.name as teacher_name, t.prefix as teacher_prefix, t.rank as teacher_rank, r.name as room_name
                    FROM Schedules s
                    LEFT JOIN Subjects sub ON s.subject_id = sub.id
                    LEFT JOIN Teachers t ON s.teacher_id = t.id
                    LEFT JOIN Rooms r ON s.room_id = r.id
                    WHERE s.class_id = ? AND s.academic_term_id = ?
                `, [cls.id, activeTermId]);

                // Fetch Subjects Summary
                const [subjectsSummary] = await pool.query(`
                    SELECT sub.code, sub.name, sub.credits as credit, sub.hours_per_week
                    FROM Schedules s
                    JOIN Subjects sub ON s.subject_id = sub.id
                    WHERE s.class_id = ? AND s.academic_term_id = ?
                    GROUP BY sub.id
                `, [cls.id, activeTermId]);

                reports.push({
                    header: {
                        title: `ตารางเรียนชั้น ${cls.name}`,
                        subtitle: `ครูที่ปรึกษา: ${[
                            advisorName !== '-' ? `${advisorRank || advisorPrefix || 'ครู'}${advisorName}` : null,
                            advisor2Name ? `${advisor2Rank || advisor2Prefix || 'ครู'}${advisor2Name}` : null
                        ].filter(Boolean).join(' และ ')}`,
                        term_info: activeTermId ? ` ภาคเรียนที่ ${activeTermName} ปีการศึกษา ${activeTermYear}` : ' (ไม่พบปีการศึกษาปัจจุบัน)',
                        advisor_name: advisorName !== '-' ? advisorName : null,
                        advisor_prefix: advisorPrefix,
                        advisor_rank: advisorRank,
                        advisor2_name: advisor2Name,
                        advisor2_prefix: advisor2Prefix,
                        advisor2_rank: advisor2Rank
                    },
                    schedule,
                    summary: subjectsSummary
                });
            }

        } else if (type === 'teacher') {
            // Fetch ALL Teachers
            const [teachers] = await pool.query(`
                SELECT t.id, t.name, t.prefix, t.rank, d.name as department_name 
                FROM Teachers t 
                LEFT JOIN Departments d ON t.department_id = d.id 
                ORDER BY d.name, t.name
            `);
            const teachersArray = teachers as any[];

            for (const teacher of teachersArray) {
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
                `, [teacher.id, teacher.id, activeTermId]);

                const scheduleArray = schedule as any[];
                const countableSlots = scheduleArray.filter((s: any) => s.is_countable === 1).length;

                reports.push({
                    header: {
                        title: `ตารางสอน ${teacher.rank || teacher.prefix || 'ครู'}${teacher.name}`,
                        subtitle: teacher.department_name ? `กลุ่มสาระการเรียนรู้${teacher.department_name}` : '',
                        term_info: activeTermId ? ` ภาคเรียนที่ ${activeTermName} ปีการศึกษา ${activeTermYear}` : ' (ไม่พบปีการศึกษาปัจจุบัน)',
                        info_right: `จำนวนคาบสอน: ${countableSlots} คาบ/สัปดาห์`,
                        teacher_name: teacher.name,
                        teacher_prefix: teacher.prefix,
                        teacher_rank: teacher.rank
                    },
                    schedule,
                    summary: []
                });
            }
        }

        return NextResponse.json({
            school: (settings as any)[0] || {},
            signatories,
            reports, // Array of report data
            timeSlots,
            term_id: activeTermId
        });

    } catch (error: any) {
        console.error('Batch report data error:', error);
        return NextResponse.json({ error: 'Failed to fetch batch report data', details: error.message }, { status: 500 });
    }
}
