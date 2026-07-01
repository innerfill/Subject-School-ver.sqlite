const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function replaceP5Subjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // Get grade level ID for ป.5
        let [grades] = await connection.query('SELECT id FROM GradeLevels WHERE name = "ป.5"');
        let gradeId;
        if (grades.length > 0) {
            gradeId = grades[0].id;
        } else {
            console.log('Grade level ป.5 not found. Creating it...');
            const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES ("ป.5", 5)');
            gradeId = res.insertId;
        }

        // Delete existing subjects for ป.5
        await connection.query('DELETE FROM Subjects WHERE grade_level_id = ?', [gradeId]);
        console.log('Deleted existing subjects for ป.5.');

        const subjectsData = [
            // วิชาพื้นฐาน
            { code: 'ท15101', name: 'ภาษาไทย', hours: 4, credits: 4.0, type: 'Fundamental' },
            { code: 'ค15101', name: 'คณิตศาสตร์', hours: 4, credits: 4.0, type: 'Fundamental' },
            { code: 'ว15101', name: 'วิทยาศาสตร์', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ว15102', name: 'วิทยาการคำนวณ', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ส15101', name: 'สังคมศึกษา', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'ส15102', name: 'ประวัติศาสตร์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'อ15101', name: 'ภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Fundamental' },
            { code: 'พ15101', name: 'สุขศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'พ15102', name: 'พลศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ15101', name: 'ศิลปศึกษา', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ศ15102', name: 'ดนตรี - นาฏศิลป์', hours: 1, credits: 1.0, type: 'Fundamental' },
            { code: 'ง15101', name: 'การงานอาชีพ', hours: 2, credits: 2.0, type: 'Fundamental' },

            // วิชาเพิ่มเติม / ซ่อมเสริม
            { code: 'ท15201', name: 'ภาษาไทยเพิ่มเติม', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'อ15201', name: 'ซ่อมเสริมภาษาอังกฤษ', hours: 2, credits: 2.0, type: 'Additional' },
            { code: 'ว15201', name: 'ซ่อมเสริมวิทยาศาสตร์', hours: 1, credits: 1.0, type: 'Additional' },
            { code: 'ว15202', name: 'ซ่อมเสริมคอมพิวเตอร์', hours: 1, credits: 1.0, type: 'Additional' },

            // กิจกรรมพัฒนาผู้เรียน
            { code: 'ก15901', name: 'แนะแนว', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก15902', name: 'ลูกเสือ', hours: 1, credits: 0, type: 'Activity' },
            { code: 'ก15903', name: 'กิจกรรมชุมนุม', hours: 1, credits: 0, type: 'Activity' }
        ];

        // Insert new subjects
        for (const s of subjectsData) {
            await connection.query(
                'INSERT INTO Subjects (code, name, type, hours_per_week, credits, grade_level_id) VALUES (?, ?, ?, ?, ?, ?)',
                [s.code, s.name, s.type, s.hours, s.credits, gradeId]
            );
            console.log(`Inserted subject: ${s.code} ${s.name}`);
        }

        console.log('Successfully added subjects for ป.5.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

replaceP5Subjects();
