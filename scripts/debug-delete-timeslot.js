const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function debugDelete() {
    console.log('Debugging Time Slot Deletion...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // 1. Get a time slot to delete (the last one)
        const [rows] = await connection.query('SELECT * FROM TimeSlots ORDER BY id DESC LIMIT 1');
        if (rows.length === 0) {
            console.log('No time slots found.');
            return;
        }
        const slot = rows[0];
        console.log('Attempting to delete slot:', slot);

        // 2. Try to delete
        await connection.query('DELETE FROM TimeSlots WHERE id = ?', [slot.id]);
        console.log('Deletion successful!');

    } catch (error) {
        console.error('Deletion failed!');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
    } finally {
        await connection.end();
    }
}

debugDelete();
