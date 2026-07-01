const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function seedCourseAssignments() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // Find subjects for grade level 1 (ป.1)
        const [subjects] = await connection.query(`
      SELECT id, code, name FROM Subjects 
      WHERE grade_level_id = 1 
      AND activity_group IS NULL
      ORDER BY code
      LIMIT 10
    `);

        console.log('Available subjects for ป.1:');
        console.table(subjects);

        // Find teachers
        const [teachers] = await connection.query('SELECT id, name FROM Teachers LIMIT 5');
        console.log('\nAvailable teachers:');
        console.table(teachers);

        // Find class ป.1/1
        const [classes] = await connection.query(`SELECT id, name FROM Classes WHERE name LIKE'ป.1/%' LIMIT 3`);
        console.log('\nAvailable ป.1 classes:');
        console.table(classes);

        if (subjects.length > 0 && teachers.length > 0 && classes.length > 0) {
            console.log('\n📝 Creating sample assignments...');

            // Create assignments for first class with rotating teachers
            const classId = classes[0].id;
            const assignments = subjects.slice(0, 5).map((subject, index) => ({
                subject_id: subject.id,
                teacher_id: teachers[index % teachers.length].id,
                class_id: classId,
                periods: index < 2 ? 5 : (index < 4 ? 3 : 2) // First 2 get 5, next 2 get 3, rest get 2
            }));

            for (const assignment of assignments) {
                await connection.query(`
          INSERT INTO CourseAssignments 
          (teacher_id, subject_id, class_id, academic_term_id, periods_per_week)
          VALUES (?, ?, ?, 1, ?)
        `, [
                    assignment.teacher_id,
                    assignment.subject_id,
                    assignment.class_id,
                    assignment.periods
                ]);
            }

            console.log(`✅ Created ${assignments.length} course assignments`);

            // Show result
            const [result] = await connection.query(`
        SELECT ca.*, s.code, s.name as subject_name, t.name as teacher_name, c.name as class_name
        FROM CourseAssignments ca
        JOIN Subjects s ON ca.subject_id = s.id
        JOIN Teachers t ON ca.teacher_id = t.id
        JOIN Classes c ON ca.class_id = c.id
      `);
            console.log('\n📊 Course Assignments:');
            console.table(result);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

seedCourseAssignments();
