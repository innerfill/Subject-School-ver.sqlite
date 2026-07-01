const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule',
    });

    try {
        // 1. Add column
        console.log("Adding prefix column...");
        try {
            await conn.query('ALTER TABLE Teachers ADD COLUMN prefix VARCHAR(100) NULL AFTER name');
            console.log("Column added.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column already exists.");
            } else {
                throw e;
            }
        }

        // 2. Fetch all teachers
        const [teachers] = await conn.query('SELECT id, name FROM Teachers');
        
        for (const t of teachers) {
            let originalName = t.name.trim();
            let newPrefix = null;
            let newName = originalName;

            // Strip "ครู"
            if (newName.startsWith('ครู')) {
                newName = newName.replace(/^ครู\s*/, '');
            }

            // Extract standard prefixes if present
            const prefixes = ['นางสาว', 'นาย', 'นาง', 'ว่าที่ร้อยตรี', 'ว่าที่ร้อยโท', 'ว่าที่ร้อยเอก'];
            for (const p of prefixes) {
                if (newName.startsWith(p)) {
                    newPrefix = p;
                    newName = newName.substring(p.length).trim();
                    break;
                }
            }

            console.log(`Updating ${originalName} -> Prefix: ${newPrefix}, Name: ${newName}`);
            await conn.query('UPDATE Teachers SET name = ?, prefix = ? WHERE id = ?', [newName, newPrefix, t.id]);
        }
        
        console.log("Migration complete.");
    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

migrate();
