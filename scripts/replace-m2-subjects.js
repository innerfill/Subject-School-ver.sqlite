const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceM2Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ม.2
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ม.2"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ม.2 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ม.2", 8)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ม.2
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ม.2.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท22101', name: 'ภาษาไทย', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ว22101', name: 'วิทยาศาสตร์', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ส22101', name: 'สังคมศึกษา', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'อ22101', name: 'ภาษาอังกฤษ', hours: 3, credits: 1.5, type: 'Fundamental' },
            { code: 'ค22101', name: 'คณิตศาสตร์', hours: 2, credits: 1.0, type: 'Fundamental' },
            { code: 'ง22101', name: 'การงานอาชีพ', hours: 2, credits: 1.0, type: 'Fundamental' },
            { code: 'ส22102', name: 'ประวัติศาสตร์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'พ22101', name: 'สุขศึกษา', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'พ22102', name: 'พลศึกษา', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ศ22101', name: 'ทัศนศิลป์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ศ22102', name: 'ดนตรี - นาฏศิลป์', hours: 1, credits: 0.5, type: 'Fundamental' },
            { code: 'ว22102', name: 'วิทยาการคำนวณ', hours: 1, credits: 0.5, type: 'Fundamental' },

            // วิชาเพิ่มเติม
            { code: 'ค22201', name: 'คณิตศาสตร์เพิ่มเติม', hours: 3, credits: 1.5, type: 'Additional' },
            { code: 'ว22201', name: 'คอมพิวเตอร์เพิ่มเติม', hours: 1, credits: 0.5, type: 'Additional' },
            { code: 'ง22201', name: 'การปลูกผัก', hours: 1, credits: 0.5, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก22901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก22902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก22903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ม.2.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceM2Subjects();
