CREATE TABLE IF NOT EXISTS AcademicTerms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Inactive' CHECK(status IN ('Active','Inactive')),
  start_date TEXT DEFAULT NULL,
  end_date TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS Buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  zone TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS GradeLevels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  prefix TEXT DEFAULT NULL,
  rank TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  color TEXT DEFAULT '#3b82f6',
  department_id INTEGER DEFAULT NULL REFERENCES Departments(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Lecture',
  capacity INTEGER DEFAULT 40,
  building_id INTEGER DEFAULT NULL REFERENCES Buildings(id) ON DELETE SET NULL,
  allow_overlap INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade_level_id INTEGER DEFAULT NULL REFERENCES GradeLevels(id) ON DELETE SET NULL,
  academic_term_id INTEGER DEFAULT NULL REFERENCES AcademicTerms(id) ON DELETE CASCADE,
  advisor_id INTEGER DEFAULT NULL REFERENCES Teachers(id) ON DELETE SET NULL,
  advisor2_id INTEGER DEFAULT NULL,
  home_room_id INTEGER DEFAULT NULL REFERENCES Rooms(id) ON DELETE SET NULL,
  UNIQUE(name, academic_term_id)
);

CREATE TABLE IF NOT EXISTS Subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  credits REAL DEFAULT 1,
  max_credits REAL DEFAULT NULL,
  hours_per_week INTEGER DEFAULT 1,
  type TEXT DEFAULT 'Fundamental' CHECK(type IN ('Fundamental','Additional','Activity')),
  grade_level_id INTEGER DEFAULT NULL REFERENCES GradeLevels(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  activity_group TEXT DEFAULT NULL,
  is_countable INTEGER DEFAULT 1,
  color_code TEXT DEFAULT NULL,
  semester INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS TimeSlots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_index INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT DEFAULT 'Study' CHECK(type IN ('Study','Break','Assembly','Homeroom'))
);

CREATE TABLE IF NOT EXISTS CourseAssignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES Teachers(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES Subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE,
  academic_term_id INTEGER NOT NULL REFERENCES AcademicTerms(id) ON DELETE CASCADE,
  periods_per_week INTEGER NOT NULL DEFAULT 1,
  room_id INTEGER DEFAULT NULL REFERENCES Rooms(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subject_id, class_id, academic_term_id)
);

CREATE TABLE IF NOT EXISTS FixedActivities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER DEFAULT NULL REFERENCES Subjects(id) ON DELETE CASCADE,
  academic_term_id INTEGER DEFAULT NULL REFERENCES AcademicTerms(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  target_grade_level_ids TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  activity_group TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS Schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER DEFAULT NULL REFERENCES Teachers(id) ON DELETE SET NULL,
  subject_id INTEGER DEFAULT NULL REFERENCES Subjects(id) ON DELETE CASCADE,
  room_id INTEGER DEFAULT NULL REFERENCES Rooms(id) ON DELETE SET NULL,
  class_id INTEGER DEFAULT NULL REFERENCES Classes(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  academic_term_id INTEGER DEFAULT NULL REFERENCES AcademicTerms(id) ON DELETE CASCADE,
  is_locked INTEGER DEFAULT 0,
  fixed_activity_id INTEGER DEFAULT NULL REFERENCES FixedActivities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SchoolSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_name TEXT NOT NULL,
  affiliation TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  table_theme TEXT NOT NULL DEFAULT 'blue'
);

CREATE TABLE IF NOT EXISTS Signatories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_key TEXT NOT NULL UNIQUE,
  rank_title TEXT DEFAULT NULL,
  position_name TEXT DEFAULT NULL,
  person_prefix TEXT DEFAULT NULL,
  person_name TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS SystemConfig (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT NULL,
  username TEXT DEFAULT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT DEFAULT NULL,
  provider TEXT DEFAULT 'credentials',
  avatar_url TEXT DEFAULT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_dept ON Teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON Rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON Classes(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_classes_term ON Classes(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON Subjects(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_ca_teacher ON CourseAssignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ca_class ON CourseAssignments(class_id);
CREATE INDEX IF NOT EXISTS idx_ca_term ON CourseAssignments(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON Schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON Schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_term ON Schedules(academic_term_id);
