const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function seedData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        console.log('Connected to database.');

        // 1. Ensure Active Academic Term
        const [terms] = await connection.query("SELECT * FROM AcademicTerms WHERE status = 'Active'");
        let termId;
        if (terms.length === 0) {
            const [res] = await connection.query(
                "INSERT INTO AcademicTerms (year, term, status, start_date, end_date) VALUES (?, ?, 'Active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 4 MONTH))",
                [2567, 1]
            );
            termId = res.insertId;
            console.log('Created active Academic Term: 2567/1');
        } else {
            termId = terms[0].id;
            console.log(`Using existing active Academic Term ID: ${termId}`);
        }

        // 2. Grade Levels (P.1 - M.3)
        const grades = [
            { name: 'ป.1', order: 1 }, { name: 'ป.2', order: 2 }, { name: 'ป.3', order: 3 },
            { name: 'ป.4', order: 4 }, { name: 'ป.5', order: 5 }, { name: 'ป.6', order: 6 },
            { name: 'ม.1', order: 7 }, { name: 'ม.2', order: 8 }, { name: 'ม.3', order: 9 }
        ];

        const gradeMap = {}; // name -> id

        for (const g of grades) {
            const [rows] = await connection.query('SELECT id FROM GradeLevels WHERE name = ?', [g.name]);
            if (rows.length === 0) {
                const [res] = await connection.query('INSERT INTO GradeLevels (name, order_index) VALUES (?, ?)', [g.name, g.order]);
                gradeMap[g.name] = res.insertId;
                console.log(`Created Grade Level: ${g.name}`);
            } else {
                gradeMap[g.name] = rows[0].id;
            }
        }

        // 3. Subjects (Basic + Activities)
        // We will create these subjects for ALL grade levels for simplicity in testing
        const subjects = [
            { code: 'TH101', name: 'ภาษาไทย', type: 'Fundamental' },
            { code: 'MA101', name: 'คณิตศาสตร์', type: 'Fundamental' },
            { code: 'SC101', name: 'วิทยาศาสตร์', type: 'Fundamental' },
            { code: 'SO101', name: 'สังคมศึกษา', type: 'Fundamental' },
            { code: 'EN101', name: 'ภาษาอังกฤษ', type: 'Fundamental' },
            { code: 'PE101', name: 'สุขศึกษาและพละ', type: 'Fundamental' },
            { code: 'AR101', name: 'ศิลปะ', type: 'Fundamental' },
            { code: 'CA101', name: 'การงานอาชีพ', type: 'Fundamental' },
            { code: 'CO101', name: 'วิทยาการคำนวณ', type: 'Fundamental' },
            { code: 'ACT01', name: 'ลูกเสือ-เนตรนารี', type: 'Activity' },
            { code: 'ACT02', name: 'ชุมนุม', type: 'Activity' },
            { code: 'ACT03', name: 'แนะแนว', type: 'Activity' },
        ];

        for (const gName of Object.keys(gradeMap)) {
            const gradeId = gradeMap[gName];
            for (const s of subjects) {
                // Unique code per grade to avoid confusion? Or same code? 
                // Usually codes differ (TH101, TH201), but for testing let's append grade index if needed or just keep simple.
                // Let's keep simple but ensure uniqueness in DB if code is unique? 
                // Schema doesn't say code is unique, but it usually is. 
                // Let's append grade to code e.g. TH101-P1

                const suffix = gName.replace('.', '');
                const code = `${s.code}-${suffix}`;

                const [rows] = await connection.query('SELECT id FROM Subjects WHERE code = ?', [code]);
                if (rows.length === 0) {
                    await connection.query(
                        'INSERT INTO Subjects (code, name, credits, type, grade_level_id) VALUES (?, ?, ?, ?, ?)',
                        [code, `${s.name} (${gName})`, 1.0, s.type, gradeId]
                    );
                    console.log(`Created Subject: ${code}`);
                }
            }
        }

        // 4. Classes (One per grade)
        for (const gName of Object.keys(gradeMap)) {
            const gradeId = gradeMap[gName];
            const className = `${gName}/1`;

            const [rows] = await connection.query('SELECT id FROM Classes WHERE name = ? AND academic_term_id = ?', [className, termId]);
            if (rows.length === 0) {
                await connection.query(
                    'INSERT INTO Classes (name, grade_level_id, academic_term_id) VALUES (?, ?, ?)',
                    [className, gradeId, termId]
                );
                console.log(`Created Class: ${className}`);
            }
        }

        console.log('Seeding completed successfully.');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await connection.end();
    }
}

seedData();
