const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function debugCreation() {
    console.log('Debugging Fixed Activity Creation...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_schedule'
    });

    try {
        const activity_group = 'SCOUT';

        // Fetch all grade IDs
        const [allGrades] = await connection.query('SELECT id, name FROM GradeLevels');
        const target_grade_level_ids = allGrades.map(g => g.id);
        console.log('Checking grades:', allGrades.map(g => `${g.name}(${g.id})`).join(', '));

        const academic_term_id = 1;

        // 1. Find Classes
        const [classes] = await connection.query(
            `SELECT id, name, grade_level_id FROM Classes WHERE grade_level_id IN (?) AND academic_term_id = ?`,
            [target_grade_level_ids, academic_term_id]
        );
        console.log(`Found ${classes.length} classes.`);

        // 2. Find Subjects
        const [subjects] = await connection.query(
            `SELECT id, code, name, grade_level_id, activity_group FROM Subjects WHERE activity_group = ? AND grade_level_id IN (?)`,
            [activity_group, target_grade_level_ids]
        );
        console.log(`Found ${subjects.length} subjects matching group '${activity_group}'.`);

        // 3. Simulate Mapping
        let subjectMap = {};
        subjects.forEach(s => subjectMap[s.grade_level_id] = s.id);
        console.log('Subject Map (Grade -> SubjectID):', subjectMap);

        // 4. Check for Missing Mappings
        const missingGrades = target_grade_level_ids.filter(gid => !subjectMap[gid]);
        if (missingGrades.length > 0) {
            console.warn('WARNING: No subject found for Grade IDs:', missingGrades);
            const missingNames = allGrades.filter(g => missingGrades.includes(g.id)).map(g => g.name);
            console.warn('Missing Grades:', missingNames.join(', '));
        } else {
            console.log('SUCCESS: All target grades have a matching subject.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debugCreation();
