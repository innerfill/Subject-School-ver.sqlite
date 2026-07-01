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
        const [classes] = await connection.query('SELECT id, name FROM Classes WHERE name LIKE "ม.1/1" LIMIT 1');
        if (classes.length === 0) {
            console.log('No M.1/1 class found.');
            return;
        }
        const classId = classes[0].id;
        console.log(`Using class: ${classes[0].name} (ID: ${classId})`);

        // Insert Teacher 1
        const [res1] = await connection.query('INSERT INTO Teachers (name, color) VALUES ("Teacher 1", "#FF0000")');
        const t1 = res1.insertId;

        // Assign Teacher 1 to class via PUT equivalent logic
        await connection.query('UPDATE Classes SET advisor_id = ? WHERE id = ?', [t1, classId]);
        console.log(`Assigned Teacher 1 (ID: ${t1}) to advisor_id`);

        // Insert Teacher 2
        const [res2] = await connection.query('INSERT INTO Teachers (name, color) VALUES ("Teacher 2", "#00FF00")');
        const t2 = res2.insertId;

        // Simulate API logic to assign Teacher 2
        const [classRows] = await connection.query('SELECT advisor_id, advisor2_id FROM Classes WHERE id = ?', [classId]);
        const cls = classRows[0];
        
        if (!cls.advisor_id || cls.advisor_id === t2) {
            await connection.query('UPDATE Classes SET advisor_id = ? WHERE id = ?', [t2, classId]);
            console.log('Assigned Teacher 2 to advisor_id (Should not happen)');
        } else if (!cls.advisor2_id || cls.advisor2_id === t2) {
            await connection.query('UPDATE Classes SET advisor2_id = ? WHERE id = ?', [t2, classId]);
            console.log(`Assigned Teacher 2 (ID: ${t2}) to advisor2_id (Success)`);
        } else {
            console.log('Class already has 2 advisors');
        }

        const [final] = await connection.query('SELECT advisor_id, advisor2_id FROM Classes WHERE id = ?', [classId]);
        console.log('Final state of class:', final[0]);

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}
run();
