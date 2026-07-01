const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function listSlots() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [rows] = await connection.query('SELECT * FROM TimeSlots');
        console.log('Time Slots:', rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

listSlots();
