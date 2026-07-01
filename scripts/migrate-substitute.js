const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'school_schedule' });

  const steps = [
    {
      name: 'teachers.line_user_id',
      sql: "ALTER TABLE teachers ADD COLUMN line_user_id VARCHAR(100) NULL AFTER department_id",
    },
    {
      name: 'teachers.leave_count',
      sql: "ALTER TABLE teachers ADD COLUMN leave_count INT NOT NULL DEFAULT 0 AFTER line_user_id",
    },
    {
      name: 'teachers.sub_count',
      sql: "ALTER TABLE teachers ADD COLUMN sub_count INT NOT NULL DEFAULT 0 AFTER leave_count",
    },
    {
      name: 'TeacherLeave table',
      sql: `CREATE TABLE TeacherLeave (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id  INT NOT NULL,
  date        DATE NOT NULL,
  type        VARCHAR(50) NOT NULL,
  scope       ENUM('all','morning','afternoon','specific') NOT NULL DEFAULT 'all',
  specific_timeslot_ids TEXT NULL COMMENT 'comma-separated timeslot ids when scope=specific',
  notes       TEXT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
)`,
    },
    {
      name: 'SubRequests table',
      sql: `CREATE TABLE SubRequests (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  log_id              VARCHAR(20) UNIQUE,
  date                DATE NOT NULL,
  day_of_week         ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  leave_type          VARCHAR(50) NOT NULL,
  absent_teacher_id   INT NOT NULL,
  timeslot_id         INT NOT NULL,
  class_id            INT NULL,
  subject_id          INT NULL,
  sub_teacher_id      INT NULL,
  notify_status       ENUM('Pending','Sent','Failed','Expired') NOT NULL DEFAULT 'Pending',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  academic_term_id    INT NULL,
  FOREIGN KEY (absent_teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (timeslot_id)       REFERENCES timeslots(id),
  FOREIGN KEY (class_id)          REFERENCES classes(id),
  FOREIGN KEY (subject_id)        REFERENCES subjects(id),
  FOREIGN KEY (sub_teacher_id)    REFERENCES teachers(id),
  FOREIGN KEY (academic_term_id)  REFERENCES academicterms(id)
)`,
    },
  ];

  for (const step of steps) {
    try {
      await pool.query(step.sql);
      console.log('✓', step.name);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠ skip (already exists):', step.name);
      } else {
        console.error('✗', step.name, '—', e.message);
        process.exit(1);
      }
    }
  }

  console.log('\nDone.');
  await pool.end();
})();
