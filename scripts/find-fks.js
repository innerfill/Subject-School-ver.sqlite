const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function findForeignKeys() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const [rows] = await connection.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE 
        REFERENCED_TABLE_SCHEMA = ? AND
        REFERENCED_TABLE_NAME = 'TimeSlots';
    `, [process.env.DB_NAME || 'school_schedule']);

        console.log('Foreign Keys referencing TimeSlots:', rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

findForeignKeys();
