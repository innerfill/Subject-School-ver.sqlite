const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });
    
    const [rows] = await connection.query('SELECT code, name, grade_level_id FROM Subjects WHERE code IN ("ก11901", "ก15901", "ก16901")');
    console.log(rows);
    
    await connection.end();
}
run();
