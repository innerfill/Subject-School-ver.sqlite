const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceP4Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.4
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.4"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.4 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.4", 4)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ป.4
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ป.4.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท14101', name: 'ภาษาไทย', hours: 4, credits: 4.0, type: 'Fundamental' },
            { code: 'ค14101', name: 'คณิตศาสตร์', hours: 4, credits: 4.0, type: 'Fundamental' },
            { code: 'ว14101', name: 'วิทยาศาสตร์', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ว14102', name: 'วิทยาการคำนวณ', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ส14101', name: 'สังคมศึกษา', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ส14102', name: 'ประวัติศาสตร์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'อ14101', name: 'ภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'พ14101', name: 'สุขศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'พ14102', name: 'พลศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ14101', name: 'ศิลปศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ14102', name: 'ดนตรี - นาฏศิลป์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ง14101', name: 'การงานอาชีพ', hours: 2, credits: 2.0, type: 'Fundamental' },

            // วิชาเพิ่มเติม / ซ่อมเสริม
            { code: 'ท14201', name: 'ภาษาไทยเพิ่มเติม', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'อ14201', name: 'ซ่อมเสริมภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Additional' },
            { code: 'ว14201', name: 'ซ่อมเสริมวิทยาศาสตร์', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'ว14202', name: 'ซ่อมเสริมคอมพิวเตอร์', hours: 1, credits: 1.0, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก14901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก14902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก14903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ป.4.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceP4Subjects();
