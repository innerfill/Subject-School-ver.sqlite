const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceM1Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ม.1
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ม.1"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ม.1 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ม.1", 7)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ม.1
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ม.1.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท21101', name: 'ภาษาไทย', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ค21101', name: 'คณิตศาสตร์', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ว21101', name: 'วิทยาศาสตร์', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ส21101', name: 'สังคมศึกษา', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'อ21101', name: 'ภาษาอังกฤษ', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ง21101', name: 'การงานอาชีพ', hours: 2, credits: 1.0, type: 'Fundamental' },
            { code: 'ส21102', name: 'ประวัติศาสตร์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'พ21101', name: 'สุขศึกษา', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'พ21102', name: 'พลศึกษา', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ศ21101', name: 'ทัศนศิลป์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ศ21102', name: 'ดนตรี-นาฏศิลป์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ว21102', name: 'วิทยาการคำนวณ', hours: 1, credits: 0.5, type: 'Fundamental' },

            // วิชาเพิ่มเติม
            { code: 'ค21201', name: 'คณิตศาสตร์เพิ่มเติม', hours: 2, credits: 1.0, type: 'Additional' },
            { code: 'ว21201', name: 'คอมพิวเตอร์เพิ่มเติม', hours: 1, credits: 0.5, type: 'Additional' },
            { code: 'ง21201', name: 'การปลูกผัก', hours: 1, credits: 0.5, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก21901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก21902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก21903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ม.1.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceM1Subjects();
