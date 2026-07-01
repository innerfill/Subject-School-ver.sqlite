const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceSubjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Disable foreign key checks to easily clear related records
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Delete existing data to start fresh
        await connection.query('TRUNCATE TABLE Schedules');
        await connection.query('TRUNCATE TABLE CourseAssignments');
        await connection.query('DELETE FROM Subjects');
        console.log('Cleared all existing Schedules, CourseAssignments, and Subjects.');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // Get grade level ID for ป.1
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.1"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.1 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.1", 1)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท11101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค11101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว11101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส11101', name: 'สังคมศึกษา', type: 'Fundamental' },
            { code: 'ส11102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ11101', name: 'สุขศึกษาและพลศึกษา', type: 'Fundamental' },
            { code: 'ศ11101', name: 'ศิลปะ', type: 'Fundamental' },
            { code: 'ง11101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ11101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            { code: 'อ11201', name: 'ภาษาอังกฤษเพิ่มเติม', type: 'Additional' },
            { code: 'ว11201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ก11901', name: 'ลูกเสือ', type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, grade_level_id) VALUES (?, ?, ?, ?)',
                [s.code, s.name, s.type, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully replaced subjects.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceSubjects();
