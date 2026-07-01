const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkCourseAssignments() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // Check if table exists
        const [tables] = await connection.query(`SHOW TABLES LIKE 'CourseAssignments'`);
        if (tables.length === 0) {
            console.log('❌ CourseAssignments table does NOT exist');
            return;
        }

        console.log('✅ CourseAssignments table exists\n');

        // Show table structure
        const [structure] = await connection.query('DESCRIBE CourseAssignments');
        console.log('Table Structure:');
        console.table(structure);

        // Show sample data
        const [data] = await connection.query('SELECT * FROM CourseAssignments LIMIT 5');
        console.log('\nSample Data:');
        console.table(data);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkCourseAssignments();
