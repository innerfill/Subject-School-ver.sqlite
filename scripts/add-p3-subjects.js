const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addP3Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.3
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.3"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.3 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.3", 3)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท13101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค13101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว13101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส13101', name: 'สังคมศึกษา', type: 'Fundamental' },
            { code: 'ส13102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ13101', name: 'สุขศึกษาและพลศึกษา', type: 'Fundamental' },
            { code: 'ศ13101', name: 'ศิลปะ', type: 'Fundamental' },
            { code: 'ง13101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ13101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            // Noted typo in image (ท13201 for English), auto-correcting to อ13201
            { code: 'อ13201', name: 'ภาษาอังกฤษเพิ่มเติม', type: 'Additional' },
            { code: 'ว13201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ก13202', name: 'ลูกเสือ', type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            // check if subject already exists to be safe
            const [existing] = await connection.query('SELECT id FROM Subjects WHERE code = ? AND grade_level_id = ?', [s.code, gradeId]);
            if (existing.length === 0) {
                await connection.query(
                    'INSERT INTO Subjects (code, name, type, grade_level_id) VALUES (?, ?, ?, ?)',
                    [s.code, s.name, s.type, gradeId]
                );
                console.log(`Inserted subject: ${s.code} ${s.name}`);
            } else {
                console.log(`Subject already exists: ${s.code} ${s.name}`);
            }
        }

        console.log('Successfully added subjects for ป.3.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

addP3Subjects();
