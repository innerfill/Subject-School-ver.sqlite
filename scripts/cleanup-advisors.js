const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        await connection.query('UPDATE Classes SET advisor_id = NULL, advisor2_id = NULL WHERE name = "ม.1/1"');
        await connection.query('DELETE FROM Teachers WHERE name LIKE "Teacher %"');
        console.log('Cleaned up test data.');
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}
run();
