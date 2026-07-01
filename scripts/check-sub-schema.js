const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'school_schedule' });
  const [t1] = await pool.query("SHOW TABLES LIKE 'TeacherLeave'");
  const [t2] = await pool.query("SHOW TABLES LIKE 'SubRequests'");
  const [c1] = await pool.query("SHOW COLUMNS FROM teachers LIKE 'line_user_id'");
  const [c2] = await pool.query("SHOW COLUMNS FROM teachers LIKE 'leave_count'");
  const [c3] = await pool.query("SHOW COLUMNS FROM teachers LIKE 'sub_count'");
  console.log('TeacherLeave exists:', t1.length > 0);
  console.log('SubRequests exists:', t2.length > 0);
  console.log('teachers.line_user_id exists:', c1.length > 0);
  console.log('teachers.leave_count exists:', c2.length > 0);
  console.log('teachers.sub_count exists:', c3.length > 0);
  await pool.end();
})();
