const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addM3T1Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ม.3
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ม.3"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ม.3 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ม.3", 9)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท23101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค23101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว23101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส23101', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', type: 'Fundamental' },
            { code: 'ส23102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ23101', name: 'สุขศึกษา', type: 'Fundamental' },
            { code: 'พ23102', name: 'พลศึกษา', type: 'Fundamental' },
            { code: 'ศ23101', name: 'ทัศนศิลป์', type: 'Fundamental' },
            { code: 'ศ23102', name: 'ดนตรี', type: 'Fundamental' },
            { code: 'ง23101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ23101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            { code: 'ว23201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ค23201', name: 'คณิตศาสตร์', type: 'Additional' },
            { code: 'ว23202', name: 'คอมพิวเตอร์', type: 'Additional' },
            { code: 'ก23903', name: 'ลูกเสือ', type: 'Activity' }
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

        console.log('Successfully added subjects for ม.3 ภาคเรียนที่ 1.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

addM3T1Subjects();
