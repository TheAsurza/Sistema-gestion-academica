-- Zegel - Desarrollo de Interfaces III (Entregable Final)
-- Esquema de Base de Datos MySQL y Datos Semilla

CREATE DATABASE IF NOT EXISTS zegel_cursos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zegel_cursos_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS course_modules;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabla de Usuarios
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'profesor', 'estudiante') NOT NULL DEFAULT 'estudiante',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Cursos
CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  credits TINYINT UNSIGNED NOT NULL DEFAULT 3,
  status ENUM('active', 'draft', 'inactive') NOT NULL DEFAULT 'draft',
  teacher_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Módulos del Curso (Sílabo / Temario)
CREATE TABLE course_modules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  hours SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_modules_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Matrículas e Historial Académico
CREATE TABLE enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  cycle VARCHAR(20) NOT NULL,
  status ENUM('enrolled', 'completed') NOT NULL DEFAULT 'enrolled',
  final_grade DECIMAL(4,2) NULL,
  UNIQUE KEY uq_enrollment_student_course_cycle (student_id, course_id, cycle),
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATOS SEMILLA (Contraseña de prueba para todos los usuarios: password)
-- Hash bcrypt estándar generado con password_hash('password', PASSWORD_BCRYPT)
-- ============================================================================

INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Administrador Zegel', 'admin@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  (2, 'Prof. Carlos Mendoza', 'carlos.mendoza@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor'),
  (3, 'Prof. Lucía Paredes', 'lucia.paredes@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor'),
  (4, 'Anthony Quispe', 'anthony.quispe@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante');

INSERT INTO courses (id, code, title, description, credits, status, teacher_id) VALUES
  (1, 'DI3-401', 'Desarrollo de Interfaces III', 'Arquitectura SPA en Angular Standalone, rutas protegidas, interceptores JWT y consumo de APIs REST.', 4, 'active', 2),
  (2, 'BD2-302', 'Base de Datos Avanzadas', 'Modelamiento relacional, transacciones ACID, optimización de consultas e integración con PHP PDO.', 4, 'active', 3),
  (3, 'UX1-205', 'Diseño de Experiencia de Usuario', 'Prototipado centrado en el usuario, sistemas de diseño con Angular Material y pruebas de usabilidad.', 3, 'draft', 2),
  (4, 'ALG-101', 'Fundamentos de Programación', 'Lógica algorítmica, estructuras de control, funciones y programación orientada a objetos.', 3, 'inactive', 3);

INSERT INTO course_modules (course_id, title, hours, sort_order) VALUES
  (1, 'Arquitectura Angular Standalone y Lazy Loading', 8, 1),
  (1, 'Guards, Interceptores HTTP y Autenticación JWT', 10, 2),
  (1, 'Formularios Reactivos Avanzados y Validadores Asíncronos', 8, 3),
  (2, 'Normalización y Diseño Relacional en MySQL', 8, 1),
  (2, 'Transacciones PDO y Seguridad SQL', 8, 2),
  (3, 'Investigación de Usuarios y Arquitectura de Información', 6, 1),
  (3, 'Componentes Accesibles con Material Design', 8, 2),
  (4, 'Estructuras de Control y Arreglos', 6, 1),
  (4, 'Introducción a la Programación Orientada a Objetos', 8, 2);

-- Matrículas activas (ciclo actual 2026-II) y completadas (ciclos pasados)
INSERT INTO enrollments (student_id, course_id, cycle, status, final_grade) VALUES
  (4, 1, '2026-II', 'enrolled', NULL),
  (4, 2, '2026-II', 'enrolled', NULL),
  (4, 4, '2025-II', 'completed', 18.50),
  (4, 3, '2026-I',  'completed', 16.00),
  (4, 2, '2026-I',  'completed', 12.00);
