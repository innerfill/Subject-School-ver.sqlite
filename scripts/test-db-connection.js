const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    console.log('Testing database connection...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'school_schedule'
        });
        console.log('Successfully connected to database.');

        // Check if Subjects table exists and show columns
        const [columns] = await connection.query('SHOW COLUMNS FROM Subjects');
        console.log('Subjects table columns:', columns.map(c => c.Field).join(', '));

        await connection.end();
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
}

testConnection();
