const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function updateSchemaV2() {
    console.log('Updating schema v2 (Activity Groups)...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        // 1. Add activity_group to Subjects
        const [subjCols] = await connection.query("SHOW COLUMNS FROM Subjects LIKE 'activity_group'");
        if (subjCols.length === 0) {
            console.log('Adding activity_group to Subjects...');
            await connection.query("ALTER TABLE Subjects ADD COLUMN activity_group VARCHAR(50) DEFAULT NULL");
        } else {
            console.log('activity_group already exists in Subjects.');
        }

        // 2. Add activity_group to FixedActivities
        const [fixedCols] = await connection.query("SHOW COLUMNS FROM FixedActivities LIKE 'activity_group'");
        if (fixedCols.length === 0) {
            console.log('Adding activity_group to FixedActivities...');
            await connection.query("ALTER TABLE FixedActivities ADD COLUMN activity_group VARCHAR(50) DEFAULT NULL");
            // Make subject_id nullable as we might use group instead
            await connection.query("ALTER TABLE FixedActivities MODIFY COLUMN subject_id INT NULL");
        } else {
            console.log('activity_group already exists in FixedActivities.');
        }

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await connection.end();
    }
}

updateSchemaV2();
