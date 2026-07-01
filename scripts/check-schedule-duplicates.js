const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkDuplicates() {
    console.log('Checking for duplicate schedules...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [rows] = await connection.query(`
      SELECT class_id, day_of_week, start_time, COUNT(*) as count
      FROM Schedules
      GROUP BY class_id, day_of_week, start_time
      HAVING count > 1
    `);

        if (rows.length > 0) {
            console.log('Found duplicates:', rows);

            // Detail of first duplicate
            const first = rows[0];
            const [details] = await connection.query(`
            SELECT * FROM Schedules 
            WHERE class_id = ? AND day_of_week = ? AND start_time = ?
        `, [first.class_id, first.day_of_week, first.start_time]);
            console.log('Details of first duplicate set:', details);
        } else {
            console.log('No duplicates found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkDuplicates();
