const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addP4Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.4
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.4"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.4 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.4", 4)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท14101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค14101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว14101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส14101', name: 'สังคมศึกษา', type: 'Fundamental' },
            { code: 'ส14102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ14101', name: 'สุขศึกษาและพลศึกษา', type: 'Fundamental' },
            { code: 'ศ14101', name: 'ศิลปะ', type: 'Fundamental' },
            { code: 'ง14101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ14101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            { code: 'ท14201', name: 'การอ่านและการเขียน', type: 'Additional' },
            { code: 'ว14201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ก14202', name: 'ลูกเสือ', type: 'Activity' }
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

        console.log('Successfully added subjects for ป.4.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

addP4Subjects();
