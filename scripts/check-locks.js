const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkLocks() {
    console.log('Checking MySQL Process List...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [rows] = await connection.query('SHOW PROCESSLIST');
        console.log('Process List:', rows);
    } catch (error) {
        console.error('Error checking locks:', error);
    } finally {
        await connection.end();
    }
}

checkLocks();
