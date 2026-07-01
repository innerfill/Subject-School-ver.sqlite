const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addM1T1Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ม.1
        const [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ม.1"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ม.1 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ม.1", 7)');
            gradeId = res.insertId;
        }

        // Define the new subjects based on the provided image and user request
        const subjectsData = [
            { code: 'ท21101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'ค21101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'ว21101', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'Fundamental' },
            { code: 'ส21101', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', type: 'Fundamental' },
            { code: 'ส21102', name: 'ประวัติศาสตร์', type: 'Fundamental' },
            { code: 'พ21101', name: 'สุขศึกษา', type: 'Fundamental' },
            { code: 'พ21102', name: 'พลศึกษา', type: 'Fundamental' },
            { code: 'ศ21101', name: 'ทัศนศิลป์', type: 'Fundamental' },
            { code: 'ศ21102', name: 'ดนตรี', type: 'Fundamental' },
            { code: 'ง21101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'อ21101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            // Subjects with code x212xx are typically "Additional" (รายวิชาเพิ่มเติม)
            { code: 'ว21201', name: 'วิทยาการคำนวณ', type: 'Additional' },
            { code: 'ค21201', name: 'คณิตศาสตร์', type: 'Additional' },
            { code: 'ว21202', name: 'คอมพิวเตอร์', type: 'Additional' },
            { code: 'ก21903', name: 'ลูกเสือ', type: 'Activity' }
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

        console.log('Successfully added subjects for ม.1 ภาคเรียนที่ 1.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

addM1T1Subjects();
