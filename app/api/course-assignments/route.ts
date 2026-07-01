import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const class_id = searchParams.get('class_id');
        const term_id = searchParams.get('term_id');

        // Quota calculation endpoint
        if (type === 'quota' && class_id && term_id) {
            // Get class's grade_level_id
            const [classesRows] = await pool.query('SELECT grade_level_id FROM Classes WHERE id = ?', [class_id]);
            const grade_level_id = (classesRows as any[])[0]?.grade_level_id;

            if (!grade_level_id) {
                return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            }

            // Get term number (1 or 2) to filter subjects by semester
            const [termRows] = await pool.query('SELECT term FROM AcademicTerms WHERE id = ?', [term_id]);
            const termNumber = (termRows as any[])[0]?.term ?? null;

            const [assignments] = await pool.query(`
                SELECT s.id as subject_id, s.code as subject_code, s.name as subject_name, s.hours_per_week,
                       ca.id as assignment_id, ca.teacher_id, ca.room_id, ca.periods_per_week,
                       t.name as teacher_name, t.color as teacher_color
                FROM Subjects s
                LEFT JOIN CourseAssignments ca ON s.id = ca.subject_id AND ca.class_id = ? AND ca.academic_term_id = ?
                LEFT JOIN Teachers t ON ca.teacher_id = t.id
                WHERE s.grade_level_id = ? AND s.is_active = TRUE
                AND (s.semester IS NULL OR s.semester = ?)
            `, [class_id, term_id, grade_level_id, termNumber]);

            // For each assignment, count existing schedules
            const subjectsWithQuota = await Promise.all(
                (assignments as any[]).map(async (assignment) => {
                    const [schedules] = await pool.query(`
                        SELECT COUNT(*) as count
                        FROM Schedules
                        WHERE class_id = ?
                        AND subject_id = ?
                        AND academic_term_id = ?
                    `, [class_id, assignment.subject_id, term_id]);

                    const placedPeriods = (schedules as any[])[0].count;
                    // Prefer Subject's hours_per_week, fallback to CourseAssignment's periods_per_week
                    const totalPeriods = assignment.hours_per_week || assignment.periods_per_week || 0;
                    const remainingPeriods = totalPeriods - placedPeriods;

                    return {
                        id: assignment.assignment_id || `temp-${assignment.subject_id}`,
                        subject_id: assignment.subject_id,
                        code: assignment.subject_code,
                        name: assignment.subject_name,
                        teacher_id: assignment.teacher_id || null,
                        teacher_name: assignment.teacher_name || 'ยังไม่กำหนดครู',
                        teacher_color: assignment.teacher_color || '#9ca3af',
                        room_id: assignment.room_id || null,
                        total_periods: totalPeriods,
                        placed_periods: placedPeriods,
                        remaining_periods: remainingPeriods
                    };
                })
            );

            // Filter to only show subjects with remaining periods > 0
            const needsScheduling = subjectsWithQuota.filter(s => s.remaining_periods > 0);

            return NextResponse.json({ 
                subjects: needsScheduling,
                has_assignments: true // No longer blocking use based on missing assignments
            });
        }

        // Regular GET – filter by class+term if provided
        if (class_id && term_id) {
            const [rows] = await pool.query(
                `SELECT ca.*, t.name as teacher_name, t.color as teacher_color
                 FROM CourseAssignments ca
                 LEFT JOIN Teachers t ON ca.teacher_id = t.id
                 WHERE ca.class_id = ? AND ca.academic_term_id = ?`,
                [class_id, term_id]
            );
            return NextResponse.json(rows);
        }
        const [rows] = await pool.query(`
      SELECT ca.*,
             t.name as teacher_name, t.color as teacher_color,
             s.name as subject_name, s.code as subject_code,
             c.name as class_name
      FROM CourseAssignments ca
      LEFT JOIN Teachers t ON ca.teacher_id = t.id
      LEFT JOIN Subjects s ON ca.subject_id = s.id
      LEFT JOIN Classes c ON ca.class_id = c.id
    `);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { teacher_id, subject_id, class_id, periods_per_week } = await request.json();
        const [result] = await pool.query(
            'INSERT INTO CourseAssignments (teacher_id, subject_id, class_id, periods_per_week) VALUES (?, ?, ?, ?)',
            [teacher_id, subject_id, class_id, periods_per_week]
        );
        return NextResponse.json({ id: (result as any).insertId, teacher_id, subject_id, class_id, periods_per_week }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { teacher_id, subject_id, class_id, academic_term_id, room_id } = body;

        // Check if assignment exists
        const [existing] = await pool.query(
            'SELECT id FROM CourseAssignments WHERE subject_id = ? AND class_id = ? AND academic_term_id = ?',
            [subject_id, class_id, academic_term_id]
        );
        console.log('Existing assignment:', existing);

        if ((existing as any[]).length > 0) {
            const existingId = (existing as any[])[0].id;
            await pool.query(
                'UPDATE CourseAssignments SET teacher_id = ?, room_id = ? WHERE id = ?',
                [teacher_id || null, room_id || null, existingId]
            );
            return NextResponse.json({ success: true, id: existingId });
        } else {
            const [subjectRows] = await pool.query('SELECT hours_per_week FROM Subjects WHERE id = ?', [subject_id]);
            const periods = (subjectRows as any[])[0]?.hours_per_week || 0;

            const [insertResult] = await pool.query(
                'INSERT INTO CourseAssignments (teacher_id, subject_id, class_id, academic_term_id, room_id, periods_per_week) VALUES (?, ?, ?, ?, ?, ?)',
                [teacher_id || null, subject_id, class_id, academic_term_id, room_id || null, periods]
            );
            return NextResponse.json({ success: true, id: (insertResult as any).insertId });
        }
    } catch (error) {
        console.error('Error updating assignment:', error);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await pool.query('DELETE FROM CourseAssignments WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
