const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrateActivityGroups() {
    console.log('Migrating activity groups data...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // Update SCOUT (ACT01)
        await connection.query("UPDATE Subjects SET activity_group = 'SCOUT' WHERE code LIKE 'ACT01%'");
        console.log('Updated SCOUT subjects.');

        // Update CLUB (ACT02)
        await connection.query("UPDATE Subjects SET activity_group = 'CLUB' WHERE code LIKE 'ACT02%'");
        console.log('Updated CLUB subjects.');

        // Update GUIDANCE (ACT03)
        await connection.query("UPDATE Subjects SET activity_group = 'GUIDANCE' WHERE code LIKE 'ACT03%'");
        console.log('Updated GUIDANCE subjects.');

    } catch (error) {
        console.error('Error migrating data:', error);
    } finally {
        await connection.end();
    }
}

migrateActivityGroups();
