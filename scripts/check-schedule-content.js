const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkSchedule() {
    console.log('Checking Schedule for Class 1 (P.1/1)...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [rows] = await connection.query(`
      SELECT s.id, s.day_of_week, s.start_time, s.end_time, s.is_locked, sub.name as subject_name, sub.activity_group
      FROM Schedules s
      LEFT JOIN Subjects sub ON s.subject_id = sub.id
      WHERE s.class_id = 1 AND s.academic_term_id = 1
      ORDER BY s.day_of_week, s.start_time
    `);

        console.log('Schedule Entries:', rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSchedule();
