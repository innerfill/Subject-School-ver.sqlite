const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });
    
    // Set SCOUT
    const [resScout] = await connection.query('UPDATE Subjects SET activity_group = "SCOUT" WHERE name LIKE "%ลูกเสือ%"');
    console.log('Updated SCOUT:', resScout.affectedRows);
    
    // Set CLUB
    const [resClub] = await connection.query('UPDATE Subjects SET activity_group = "CLUB" WHERE name LIKE "%ชุมนุม%"');
    console.log('Updated CLUB:', resClub.affectedRows);
    
    // Set GUIDANCE
    const [resGuidance] = await connection.query('UPDATE Subjects SET activity_group = "GUIDANCE" WHERE name LIKE "%แนะแนว%"');
    console.log('Updated GUIDANCE:', resGuidance.affectedRows);

    await connection.end();
}
run();
