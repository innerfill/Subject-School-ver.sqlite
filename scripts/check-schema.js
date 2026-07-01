const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    console.log('Checking Subjects schema...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [columns] = await connection.query("SHOW COLUMNS FROM Subjects");
        console.log('Columns:', columns.map(c => c.Field).join(', '));

        const [rows] = await connection.query("SELECT id, code, activity_group FROM Subjects WHERE activity_group IS NOT NULL LIMIT 5");
        console.log('Sample Data with activity_group:', rows);

    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        await connection.end();
    }
}

checkSchema();
