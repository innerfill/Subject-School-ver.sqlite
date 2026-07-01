const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    const subjects = [
        { code: 'ก11901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 1, activity_group: 'CLUB' },
        { code: 'ก12901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 2, activity_group: 'CLUB' },
        { code: 'ก13901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 3, activity_group: 'CLUB' },
        { code: 'ก14901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 4, activity_group: 'CLUB' },
        { code: 'ก15901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 5, activity_group: 'CLUB' },
        { code: 'ก16901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 6, activity_group: 'CLUB' },
        { code: 'ก21901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 7, activity_group: 'CLUB' },
        { code: 'ก21902', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 7, activity_group: 'CLUB' },
        { code: 'ก22901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 8, activity_group: 'CLUB' },
        { code: 'ก22902', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 8, activity_group: 'CLUB' },
        { code: 'ก23901', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 9, activity_group: 'CLUB' },
        { code: 'ก23902', name: 'ชุมนุม', credits: 1, hours_per_week: 1, type: 'Activity', grade_level_id: 9, activity_group: 'CLUB' },
    ];

    for (const sub of subjects) {
        // Check if exists
        const [existing] = await connection.query('SELECT id FROM Subjects WHERE code = ? AND grade_level_id = ? AND name = ?', [sub.code, sub.grade_level_id, sub.name]);
        if (existing.length === 0) {
            await connection.query(
                'INSERT INTO Subjects (code, name, credits, hours_per_week, type, grade_level_id, activity_group, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
                [sub.code, sub.name, sub.credits, sub.hours_per_week, sub.type, sub.grade_level_id, sub.activity_group]
            );
            console.log(`Inserted: ${sub.code} - ${sub.name}`);
        } else {
            console.log(`Skipped existing: ${sub.code} - ${sub.name}`);
        }
    }

    await connection.end();
}
run();
