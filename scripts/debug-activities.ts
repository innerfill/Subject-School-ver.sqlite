
import { pool } from '../lib/db';

async function check() {
    try {
        console.log('Checking FixedActivities...');
        const [activities] = await pool.query(`
            SELECT * FROM FixedActivities
        `);
        console.table(activities);
        const scout = (subjects as any[])[0];

        if (scout) {
            console.log(`\nChecking CourseAssignments for Subject ID ${scout.id}...`);
            const [assignments] = await pool.query(`
                SELECT ca.*, t.name as teacher_name, c.name as class_name
                FROM CourseAssignments ca
                LEFT JOIN Teachers t ON ca.teacher_id = t.id
                LEFT JOIN Classes c ON ca.class_id = c.id
                WHERE ca.subject_id = ?
            `, [scout.id]);
            console.table(assignments);

            console.log(`\nChecking Schedules for Subject ID ${scout.id}...`);
            const [schedules] = await pool.query(`
                SELECT s.*, t.name as teacher_name
                FROM Schedules s
                LEFT JOIN Teachers t ON s.teacher_id = t.id
                WHERE s.subject_id = ?
            `, [scout.id]);
            console.table(schedules);
        }

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

check();
