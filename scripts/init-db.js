const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const dbName = process.env.DB_NAME || 'school_schedule';

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.changeUser({ database: dbName });

    // Drop tables in reverse order of dependencies
    // Removed CourseAssignments from the list
    const tables = ['Schedules', 'FixedActivities', 'CourseAssignments', 'TimeSlots', 'Classes', 'Rooms', 'Subjects', 'Teachers', 'Buildings', 'Departments', 'GradeLevels', 'AcademicTerms'];
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
    }
    console.log('Old tables dropped.');

    // 1. AcademicTerms
    await connection.query(`
      CREATE TABLE AcademicTerms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        year INT NOT NULL,
        term INT NOT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Inactive',
        start_date DATE,
        end_date DATE
      )
    `);
    console.log('AcademicTerms table created.');

    // 2. Master Data
    await connection.query(`
      CREATE TABLE GradeLevels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        order_index INT DEFAULT 0
      )
    `);
    console.log('GradeLevels table created.');

    await connection.query(`
      CREATE TABLE Departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      )
    `);
    console.log('Departments table created.');

    await connection.query(`
      CREATE TABLE Buildings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        zone VARCHAR(50)
      )
    `);
    console.log('Buildings table created.');

    // 3. Teachers
    await connection.query(`
      CREATE TABLE Teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        color VARCHAR(50) DEFAULT '#3b82f6',
        department_id INT,
        FOREIGN KEY (department_id) REFERENCES Departments(id) ON DELETE SET NULL
      )
    `);
    console.log('Teachers table created.');

    // 4. Subjects
    await connection.query(`
      CREATE TABLE Subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        credits FLOAT DEFAULT 1.0,
        max_credits FLOAT,
        hours_per_week INT DEFAULT 1,
        type ENUM('Fundamental', 'Additional', 'Activity') DEFAULT 'Fundamental',
        grade_level_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (grade_level_id) REFERENCES GradeLevels(id) ON DELETE SET NULL
      )
    `);
    console.log('Subjects table created.');

    // 5. Rooms
    await connection.query(`
      CREATE TABLE Rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        type VARCHAR(50) DEFAULT 'Lecture',
        capacity INT DEFAULT 40,
        building_id INT,
        FOREIGN KEY (building_id) REFERENCES Buildings(id) ON DELETE SET NULL
      )
    `);
    console.log('Rooms table created.');

    // 6. Classes
    await connection.query(`
      CREATE TABLE Classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        grade_level_id INT,
        academic_term_id INT,
        advisor_id INT,
        home_room_id INT,
        FOREIGN KEY (grade_level_id) REFERENCES GradeLevels(id) ON DELETE SET NULL,
        FOREIGN KEY (academic_term_id) REFERENCES AcademicTerms(id) ON DELETE CASCADE,
        FOREIGN KEY (advisor_id) REFERENCES Teachers(id) ON DELETE SET NULL,
        FOREIGN KEY (home_room_id) REFERENCES Rooms(id) ON DELETE SET NULL
      )
    `);
    console.log('Classes table created.');

    // 7. TimeSlots
    await connection.query(`
      CREATE TABLE TimeSlots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_index INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        type ENUM('Study', 'Break', 'Assembly', 'Homeroom') DEFAULT 'Study'
      )
    `);
    console.log('TimeSlots table created.');

    // 8. FixedActivities (Global Fixed Schedule)
    await connection.query(`
      CREATE TABLE FixedActivities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT,
        academic_term_id INT,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        target_grade_level_ids JSON, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_term_id) REFERENCES AcademicTerms(id) ON DELETE CASCADE
      )
    `);
    console.log('FixedActivities table created.');

    // 9. Schedules (Updated)
    await connection.query(`
      CREATE TABLE Schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT,
        subject_id INT,
        room_id INT,
        class_id INT,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        academic_term_id INT,
        is_locked BOOLEAN DEFAULT FALSE,
        fixed_activity_id INT,
        FOREIGN KEY (teacher_id) REFERENCES Teachers(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_term_id) REFERENCES AcademicTerms(id) ON DELETE CASCADE,
        FOREIGN KEY (fixed_activity_id) REFERENCES FixedActivities(id) ON DELETE CASCADE
      )
    `);
    console.log('Schedules table created.');

    console.log('Database initialized with new schema.');

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await connection.end();
  }
}

initDb();
