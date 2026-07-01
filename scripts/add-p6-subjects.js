const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addP6Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.6
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.6"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.6 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.6", 6)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท16101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค16101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว16101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส16101', name: 'สังคมศึกษา', type: 'Fundamental' },
            { code: 'ส16102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ16101', name: 'สุขศึกษาและพลศึกษา', type: 'Fundamental' },
            { code: 'ศ16101', name: 'ศิลปะ', type: 'Fundamental' },
            { code: 'ง16101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ16101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            { code: 'ท16201', name: 'การอ่านและการเขียน', type: 'Additional' },
            { code: 'ว16201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ก16901', name: 'ลูกเสือ', type: 'Activity' }
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

        console.log('Successfully added subjects for ป.6.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

addP6Subjects();
