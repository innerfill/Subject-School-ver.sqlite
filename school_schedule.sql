
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `academicterms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `academicterms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` int(11) NOT NULL,
  `term` int(11) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Inactive',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `buildings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buildings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `zone` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `grade_level_id` int(11) DEFAULT NULL,
  `academic_term_id` int(11) DEFAULT NULL,
  `advisor_id` int(11) DEFAULT NULL,
  `advisor2_id` int(11) DEFAULT NULL,
  `home_room_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_name_term` (`name`,`academic_term_id`),
  KEY `grade_level_id` (`grade_level_id`),
  KEY `academic_term_id` (`academic_term_id`),
  KEY `advisor_id` (`advisor_id`),
  KEY `home_room_id` (`home_room_id`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`grade_level_id`) REFERENCES `gradelevels` (`id`) ON DELETE SET NULL,
  CONSTRAINT `classes_ibfk_2` FOREIGN KEY (`academic_term_id`) REFERENCES `academicterms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `classes_ibfk_3` FOREIGN KEY (`advisor_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `classes_ibfk_4` FOREIGN KEY (`home_room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `courseassignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `courseassignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_term_id` int(11) NOT NULL,
  `periods_per_week` int(11) NOT NULL DEFAULT 1,
  `room_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_assignment` (`subject_id`,`class_id`,`academic_term_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_term_id` (`academic_term_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `courseassignments_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `courseassignments_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `courseassignments_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `courseassignments_ibfk_4` FOREIGN KEY (`academic_term_id`) REFERENCES `academicterms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `courseassignments_ibfk_5` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=178 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fixedactivities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fixedactivities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_id` int(11) DEFAULT NULL,
  `academic_term_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `target_grade_level_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_grade_level_ids`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `activity_group` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `academic_term_id` (`academic_term_id`),
  CONSTRAINT `fixedactivities_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fixedactivities_ibfk_2` FOREIGN KEY (`academic_term_id`) REFERENCES `academicterms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gradelevels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gradelevels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `order_index` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `type` varchar(50) DEFAULT 'Lecture',
  `capacity` int(11) DEFAULT 40,
  `building_id` int(11) DEFAULT NULL,
  `allow_overlap` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `building_id` (`building_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `room_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `academic_term_id` int(11) DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT 0,
  `fixed_activity_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `subject_id` (`subject_id`),
  KEY `room_id` (`room_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_term_id` (`academic_term_id`),
  KEY `fixed_activity_id` (`fixed_activity_id`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedules_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedules_ibfk_4` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedules_ibfk_5` FOREIGN KEY (`academic_term_id`) REFERENCES `academicterms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedules_ibfk_6` FOREIGN KEY (`fixed_activity_id`) REFERENCES `fixedactivities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2500 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schoolsettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schoolsettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_name` varchar(255) NOT NULL,
  `affiliation` varchar(255) DEFAULT NULL,
  `logo_url` longtext DEFAULT NULL,
  `table_theme` varchar(20) NOT NULL DEFAULT 'blue',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `signatories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `signatories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_key` varchar(50) NOT NULL,
  `rank_title` varchar(255) DEFAULT NULL,
  `position_name` varchar(255) DEFAULT NULL,
  `person_prefix` varchar(50) DEFAULT NULL,
  `person_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_key` (`role_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `credits` float DEFAULT 1,
  `max_credits` float DEFAULT NULL,
  `hours_per_week` int(11) DEFAULT 1,
  `type` enum('Fundamental','Additional','Activity') DEFAULT 'Fundamental',
  `grade_level_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `activity_group` varchar(50) DEFAULT NULL,
  `is_countable` tinyint(1) DEFAULT 1,
  `color_code` varchar(20) DEFAULT NULL,
  `semester` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `grade_level_id` (`grade_level_id`),
  CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`grade_level_id`) REFERENCES `gradelevels` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=392 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subrequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subrequests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `log_id` varchar(20) DEFAULT NULL,
  `date` date NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `absent_teacher_id` int(11) NOT NULL,
  `timeslot_id` int(11) NOT NULL,
  `class_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `sub_teacher_id` int(11) DEFAULT NULL,
  `notify_status` enum('Pending','Sent','Failed','Expired') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `academic_term_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `log_id` (`log_id`),
  KEY `absent_teacher_id` (`absent_teacher_id`),
  KEY `timeslot_id` (`timeslot_id`),
  KEY `class_id` (`class_id`),
  KEY `subject_id` (`subject_id`),
  KEY `sub_teacher_id` (`sub_teacher_id`),
  KEY `academic_term_id` (`academic_term_id`),
  CONSTRAINT `subrequests_ibfk_1` FOREIGN KEY (`absent_teacher_id`) REFERENCES `teachers` (`id`),
  CONSTRAINT `subrequests_ibfk_2` FOREIGN KEY (`timeslot_id`) REFERENCES `timeslots` (`id`),
  CONSTRAINT `subrequests_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `subrequests_ibfk_4` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `subrequests_ibfk_5` FOREIGN KEY (`sub_teacher_id`) REFERENCES `teachers` (`id`),
  CONSTRAINT `subrequests_ibfk_6` FOREIGN KEY (`academic_term_id`) REFERENCES `academicterms` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `systemconfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `systemconfig` (
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacherleave`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teacherleave` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `type` varchar(50) NOT NULL,
  `scope` enum('all','morning','afternoon','specific') NOT NULL DEFAULT 'all',
  `specific_timeslot_ids` text DEFAULT NULL COMMENT 'comma-separated timeslot ids when scope=specific',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `teacherleave_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `prefix` varchar(100) DEFAULT NULL,
  `rank` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `color` varchar(50) DEFAULT '#3b82f6',
  `department_id` int(11) DEFAULT NULL,
  `line_user_id` varchar(100) DEFAULT NULL,
  `leave_count` int(11) NOT NULL DEFAULT 0,
  `sub_count` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `timeslots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timeslots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_index` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `type` enum('Study','Break','Assembly','Homeroom') DEFAULT 'Study',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `provider` varchar(50) DEFAULT 'credentials',
  `avatar_url` text DEFAULT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

