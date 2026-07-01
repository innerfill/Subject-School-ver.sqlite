const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceP6Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.6
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.6"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.6 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.6", 6)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ป.6
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ป.6.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท16101', name: 'ภาษาไทย', hours: 5, credits: 5.0, type: 'Fundamental' },
            { code: 'ค16101', name: 'คณิตศาสตร์', hours: 4, credits: 4.0, type: 'Fundamental' },
            { code: 'ว16101', name: 'วิทยาศาสตร์', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ว16102', name: 'วิทยาการคำนวณ', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ส16101', name: 'สังคมศึกษา', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ส16102', name: 'ประวัติศาสตร์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'อ16101', name: 'ภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'พ16101', name: 'สุขศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'พ16102', name: 'พลศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ16102', name: 'ดนตรี - นาฏศิลป์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ง16101', name: 'การงานอาชีพ', hours: 2, credits: 2.0, type: 'Fundamental' },

            // วิชาเพิ่มเติม / ซ่อมเสริม
            { code: 'ท16201', name: 'ภาษาไทยเพิ่มเติม', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'อ16201', name: 'ซ่อมเสริมภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Additional' },
            { code: 'ว16201', name: 'ซ่อมเสริมวิทยาศาสตร์', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'ว16202', name: 'ซ่อมเสริมคอมพิวเตอร์', hours: 1, credits: 1.0, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก16901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก16902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก16903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ป.6.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceP6Subjects();
