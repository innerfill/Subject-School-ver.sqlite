// Quick sanity check — query DB directly with the same logic as the API
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'school_schedule' });

  // 1. ดู active term
  const [terms] = await pool.query("SELECT id, year, term FROM academicterms WHERE status = 'Active' LIMIT 1");
  if (terms.length === 0) { console.log('No active term found'); await pool.end(); return; }
  const term = terms[0];
  console.log('Active term:', term);

  // 2. ดู Study timeslots
  const [slots] = await pool.query("SELECT id, start_time, end_time FROM timeslots WHERE type = 'Study' ORDER BY order_index LIMIT 5");
  console.log('\nStudy timeslots (first 5):');
  slots.forEach(s => console.log(' ', s.id, s.start_time, '-', s.end_time));

  // 3. ดู teachers
  const [teachers] = await pool.query('SELECT id, name, sub_count, leave_count FROM teachers LIMIT 5');
  console.log('\nTeachers (first 5):');
  teachers.forEach(t => console.log(' ', t.id, t.name, '| sub_count:', t.sub_count, '| leave_count:', t.leave_count));

  // 4. ทดสอบ query หาครูว่าง (Monday, timeslot 1, term)
  if (slots.length > 0) {
    const ts = slots[0];
    const [busy] = await pool.query(
      "SELECT DISTINCT teacher_id FROM schedules WHERE day_of_week = 'Monday' AND start_time = ? AND academic_term_id = ?",
      [ts.start_time, term.id]
    );
    console.log('\nBusy teachers on Monday, slot', ts.id, ':', busy.map(b => b.teacher_id));
  }

  // 5. ตรวจ SubRequests table
  const [subCount] = await pool.query('SELECT COUNT(*) AS cnt FROM SubRequests');
  console.log('\nSubRequests rows:', subCount[0].cnt);

  const [leaveCount] = await pool.query('SELECT COUNT(*) AS cnt FROM TeacherLeave');
  console.log('TeacherLeave rows:', leaveCount[0].cnt);

  await pool.end();
  console.log('\nAll checks passed.');
})();
