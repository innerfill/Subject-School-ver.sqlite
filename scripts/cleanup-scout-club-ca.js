const mysql = require('mysql2/promise');

(async () => {
    const pool = await mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'school_schedule' });

    const [preview] = await pool.query(`
        SELECT ca.id, t.name AS teacher, s.name AS subject, s.activity_group, c.name AS class_name
        FROM CourseAssignments ca
        JOIN Subjects s ON s.id = ca.subject_id
        LEFT JOIN Teachers t ON t.id = ca.teacher_id
        LEFT JOIN Classes c ON c.id = ca.class_id
        WHERE s.activity_group IN ('SCOUT', 'CLUB')
    `);

    if (preview.length === 0) {
        console.log('ไม่มี CourseAssignments ของ SCOUT/CLUB — ไม่ต้องลบอะไร');
        await pool.end();
        return;
    }

    console.log(`พบ ${preview.length} rows ที่จะลบ:`);
    preview.forEach(r => console.log(`  ID=${r.id} | ${r.subject} (${r.activity_group}) | ครู: ${r.teacher || '-'} | ชั้น: ${r.class_name}`));

    const [result] = await pool.query(`
        DELETE ca FROM CourseAssignments ca
        JOIN Subjects s ON s.id = ca.subject_id
        WHERE s.activity_group IN ('SCOUT', 'CLUB')
    `);

    console.log(`\nลบแล้ว ${result.affectedRows} rows`);
    await pool.end();
})();
