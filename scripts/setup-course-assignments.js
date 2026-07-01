const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function setupCourseAssignments() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // Check if teachers exist
        const [teachers] = await connection.query('SELECT COUNT(*) as count FROM Teachers');

        if (teachers[0].count === 0) {
            console.log('📝 Creating sample teachers...');
            const sampleTeachers = [
                { name: 'ครูสมชาย', color: '#3B82F6' },
                { name: 'ครูสมหญิง', color: '#10B981' },
                { name: 'ครูสมศักดิ์', color: '#F59E0B' },
                { name: 'ครูสมหมาย', color: '#EF4444' },
                { name: 'ครูสมใจ', color: '#8B5CF6' },
            ];

            for (const teacher of sampleTeachers) {
                await connection.query(
                    'INSERT INTO Teachers (name, color) VALUES (?, ?)',
                    [teacher.name, teacher.color]
                );
            }
            console.log(`✅ Created ${sampleTeachers.length} teachers`);
        }

        // Now seed course assignments
        const [teacherList] = await connection.query('SELECT id, name FROM Teachers LIMIT 5');
        const [subjects] = await connection.query(`
      SELECT id, code, name FROM Subjects 
      WHERE grade_level_id = 1 
      AND activity_group IS NULL
      ORDER BY code
      LIMIT 5
    `);
        const [classes] = await connection.query(`SELECT id FROM Classes WHERE name = 'ป.1/1'`);

        if (teacherList.length > 0 && subjects.length > 0 && classes.length > 0) {
            console.log('\n📝 Creating course assignments...');

            const assignments = [
                { subject_id: subjects[4].id, teacher_id: teacherList[0].id, periods: 5 }, // ภาษาไทย
                { subject_id: subjects[1].id, teacher_id: teacherList[1].id, periods: 5 }, // คณิตศาสตร์
                { subject_id: subjects[0].id, teacher_id: teacherList[2].id, periods: 3 }, // ภาษาอังกฤษ
                { subject_id: subjects[2].id, teacher_id: teacherList[3].id, periods: 3 }, // วิทยาศาสตร์
                { subject_id: subjects[3].id, teacher_id: teacherList[4].id, periods: 2 }, // สังคมศึกษา
            ];

            for (const assignment of assignments) {
                await connection.query(`
          INSERT INTO CourseAssignments 
          (teacher_id, subject_id, class_id, academic_term_id, periods_per_week)
          VALUES (?, ?, ?, 1, ?)
        `, [
                    assignment.teacher_id,
                    assignment.subject_id,
                    classes[0].id,
                    assignment.periods
                ]);
            }

            console.log(`✅ Created ${assignments.length} course assignments`);

            // Show result
            const [result] = await connection.query(`
        SELECT ca.periods_per_week, s.code, s.name as subject_name, t.name as teacher_name
        FROM CourseAssignments ca
        JOIN Subjects s ON ca.subject_id = s.id
        JOIN Teachers t ON ca.teacher_id = t.id
        WHERE ca.class_id = ?
      `, [classes[0].id]);

            console.log('\n📊 Course Assignments for ป.1/1:');
            console.table(result);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

setupCourseAssignments();
