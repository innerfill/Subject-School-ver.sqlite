const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixSchema() {
    console.log('Connecting to DB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Creating SchoolSettings table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS SchoolSettings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                school_name VARCHAR(255) NOT NULL,
                affiliation VARCHAR(255),
                logo_url VARCHAR(255)
            )
        `);

        const [settings] = await connection.query('SELECT * FROM SchoolSettings');
        if (settings.length === 0) {
            await connection.query(`
                INSERT INTO SchoolSettings (school_name, affiliation) 
                VALUES ('โรงเรียนบ้านห้วยตาด', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเลยเขต 1')
            `);
            console.log('Seeded default SchoolSettings.');
        }

        console.log('Creating Signatories table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Signatories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                role_key VARCHAR(50) NOT NULL UNIQUE,
                position_name VARCHAR(255),
                person_name VARCHAR(255)
            )
        `);

        const [signatories] = await connection.query('SELECT * FROM Signatories');
        if (signatories.length === 0) {
            await connection.query(`
                INSERT INTO Signatories (role_key, position_name, person_name) VALUES 
                ('ISSUER', 'ครูผู้สอน', ''),
                ('ACADEMIC', 'หัวหน้าวิชาการ', 'นางสาวสุภัทรา ศรีเจริญ'),
                ('DIRECTOR', 'รักษาการในตำแหน่งผู้อำนวยการโรงเรียน', 'นายอำนาจ ยศมุงคุณ')
            `);
            console.log('Seeded default Signatories.');
        }

        console.log('Schema fix completed.');

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await connection.end();
    }
}

fixSchema();
