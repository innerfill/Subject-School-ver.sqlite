const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createCourseAssignmentsTable() {
    console.log('Creating CourseAssignments table...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        await connection.query(`
      CREATE TABLE IF NOT EXISTS CourseAssignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        subject_id INT NOT NULL,
        class_id INT NOT NULL,
        academic_term_id INT NOT NULL,
        periods_per_week INT NOT NULL DEFAULT 1,
        room_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES Teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_term_id) REFERENCES AcademicTerms(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE SET NULL,
        UNIQUE KEY unique_assignment (subject_id, class_id, academic_term_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

        console.log('✅ CourseAssignments table created successfully');

        // Add sample data for testing (ป.1/1 subjects)
        console.log('\nAdding sample course assignments for ป.1/1...');

        const sampleAssignments = [
            // Get IDs from existing data
            { subject_code: 'TH01-ป1', periods: 5, teacher_name: 'ครูสมชาย' },
            { subject_code: 'MA01-ป1', periods: 5, teacher_name: 'ครูสมหญิง' },
            { subject_code: 'SC01-ป1', periods: 2, teacher_name: 'ครูสมชาย' },
            { subject_code: 'EN01-ป1', periods: 3, teacher_name: 'ครูสมหญิง' },
            { subject_code: 'SO01-ป1', periods: 2, teacher_name: 'ครูสมชาย' },
        ];

        for (const assignment of sampleAssignments) {
            try {
                // Get subject ID
                const [subjects] = await connection.query(
                    'SELECT id FROM Subjects WHERE code = ?',
                    [assignment.subject_code]
                );

                if (subjects.length === 0) {
                    console.log(`⚠️  Subject ${assignment.subject_code} not found, skipping...`);
                    continue;
                }

                // Get teacher ID
                const [teachers] = await connection.query(
                    'SELECT id FROM Teachers WHERE name = ?',
                    [assignment.teacher_name]
                );

                if (teachers.length === 0) {
                    console.log(`⚠️  Teacher ${assignment.teacher_name} not found, skipping...`);
                    continue;
                }

                // Get class ID for ป.1/1
                const [classes] = await connection.query(
                    'SELECT id FROM Classes WHERE name = ? LIMIT 1',
                    ['ป.1/1']
                );

                if (classes.length === 0) {
                    console.log('⚠️  Class ป.1/1 not found, skipping...');
                    continue;
                }

                // Insert assignment
                await connection.query(`
          INSERT IGNORE INTO CourseAssignments 
          (teacher_id, subject_id, class_id, academic_term_id, periods_per_week)
          VALUES (?, ?, ?, 1, ?)
        `, [
                    teachers[0].id,
                    subjects[0].id,
                    classes[0].id,
                    assignment.periods
                ]);

                console.log(`✅ Added: ${assignment.subject_code} (${assignment.periods} periods)`);
            } catch (err) {
                console.log(`❌ Error adding ${assignment.subject_code}:`, err.message);
            }
        }

        console.log('\n📊 Final check:');
        const [count] = await connection.query('SELECT COUNT(*) as count FROM CourseAssignments');
        console.log(`Total assignments: ${count[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createCourseAssignmentsTable();
