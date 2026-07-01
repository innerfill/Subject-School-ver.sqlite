const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceP2Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.2
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.2"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.2 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.2", 2)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ป.2
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ป.2.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท12101', name: 'ภาษาไทย', hours: 5, credits: 5.0, type: 'Fundamental' },
            { code: 'ค12101', name: 'คณิตศาสตร์', hours: 5, credits: 5.0, type: 'Fundamental' },
            { code: 'ว12101', name: 'วิทยาศาสตร์', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ว12102', name: 'วิทยาการคำนวณ', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ส12101', name: 'สังคมศึกษา', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ส12102', name: 'ประวัติศาสตร์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'อ12101', name: 'ภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'พ12101', name: 'สุขศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'พ12102', name: 'พลศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ12101', name: 'ศิลปศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ12102', name: 'ดนตรี - นาฏศิลป์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ง12101', name: 'การงานอาชีพ', hours: 1, credits: 1.0, type: 'Fundamental' },

            // วิชาเพิ่มเติม
            { code: 'อ12201', name: 'ภาษาอังกฤษเพิ่มเติม', hours: 3, credits: 3.0, type: 'Additional' },
            { code: 'ว12201', name: 'ซ่อมเสริมวิทยาศาสตร์', hours: 1, credits: 1.0, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก12901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก12902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก12903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ป.2.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceP2Subjects();
