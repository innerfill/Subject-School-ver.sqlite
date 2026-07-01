const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function updateSchema() {
    console.log('Updating schema...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // Check if is_active column exists in Subjects
        const [columns] = await connection.query("SHOW COLUMNS FROM Subjects LIKE 'is_active'");

        if (columns.length === 0) {
            console.log('Adding is_active column to Subjects table...');
            await connection.query("ALTER TABLE Subjects ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
            console.log('Column added successfully.');
        } else {
            console.log('is_active column already exists.');
        }

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await connection.end();
    }
}

updateSchema();
