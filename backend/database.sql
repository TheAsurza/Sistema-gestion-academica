-- Zegel - Desarrollo de Interfaces III (Entregable Final)
-- Esquema de Base de Datos MySQL y Datos Semilla Ampliados
CREATE DATABASE IF NOT EXISTS zegel_cursos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zegel_cursos_db;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS course_attendance;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS attendance_stats;
DROP TABLE IF EXISTS agenda_events;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS course_modules;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabla de Usuarios
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'profesor', 'estudiante') NOT NULL DEFAULT 'estudiante',
  career VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Tabla de Cursos
CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  career VARCHAR(120) NOT NULL DEFAULT 'Desarrollo de Sistemas de Información',
  description TEXT NULL,
  credits TINYINT UNSIGNED NOT NULL DEFAULT 3,
  status ENUM('active', 'draft', 'inactive') NOT NULL DEFAULT 'draft',
  teacher_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Tabla de Módulos del Curso (Sílabo / Temario)
CREATE TABLE course_modules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  hours SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. Tabla de Matrículas e Historial Académico
CREATE TABLE enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  cycle VARCHAR(20) NOT NULL,
  status ENUM('enrolled', 'completed') NOT NULL DEFAULT 'enrolled',
  final_grade DECIMAL(4, 2) NULL,
  UNIQUE KEY uq_enrollment_student_course_cycle (student_id, course_id, cycle),
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5. Tabla de Agenda / Actividades próximas
CREATE TABLE agenda_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_date DATE NOT NULL,
  event_time VARCHAR(20) NOT NULL,
  title VARCHAR(160) NOT NULL,
  tag VARCHAR(60) NOT NULL,
  tone ENUM('violet', 'amber', 'mint') NOT NULL DEFAULT 'violet'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 6. Tabla de Asistencia semanal de alumnos (resumen dashboard)
CREATE TABLE attendance_stats (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_label VARCHAR(10) NOT NULL,
  day_order TINYINT UNSIGNED NOT NULL,
  present_pct TINYINT UNSIGNED NOT NULL,
  absent_pct TINYINT UNSIGNED NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 7. Tabla de Noticias y Publicaciones Institucionales
CREATE TABLE notices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  summary VARCHAR(255) NOT NULL,
  author VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  published_at DATE NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 8. Tabla de Asistencia por Curso y Sesión
CREATE TABLE course_attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  status ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
  UNIQUE KEY uq_attendance_course_student_date (course_id, student_id, session_date),
  CONSTRAINT fk_attendance_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- DATOS SEMILLA (Contraseña de prueba para todos los usuarios: password)
-- ============================================================================
INSERT INTO users (id, user_code, name, email, password_hash, role, career, phone, address)
VALUES
  -- Personal Administrativo (6)
  (1,  'ADM-2026-0001', 'Administrador Zegel', 'admin@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '999-100-200', 'Av. Arequipa 1250, Lima'),
  (2,  'ADM-2026-0002', 'Valeria Rojas', 'valeria.rojas@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '998-210-345', 'Av. Petit Thouars 2450, Lince'),
  (3,  'ADM-2026-0003', 'Diego Fernández', 'diego.fernandez@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '997-334-512', 'Jr. Camaná 615, Cercado de Lima'),
  (4,  'ADM-2026-0004', 'Carla Bustamante', 'carla.bustamante@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '996-412-890', 'Av. Salaverry 1840, Jesús María'),
  (5,  'ADM-2026-0005', 'Renzo Alarcón', 'renzo.alarcon@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '995-774-102', 'Calle Schell 319, Miraflores'),
  (6,  'ADM-2026-0006', 'Patricia León', 'patricia.leon@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, '994-582-331', 'Av. San Luis 2110, San Borja'),

  -- Profesores (10)
  (7,  'DOC-2026-0001', 'Prof. Carlos Mendoza', 'carlos.mendoza@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '987-654-321', 'Jr. Los Sauces 412, Miraflores'),
  (8,  'DOC-2026-0002', 'Prof. Lucía Paredes', 'lucia.paredes@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '965-432-198', 'Av. Javier Prado Este 2890, San Borja'),
  (9,  'DOC-2026-0003', 'Prof. Javier Castillo', 'javier.castillo@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '954-112-890', 'Av. Benavides 1980, Surco'),
  (10, 'DOC-2026-0004', 'Prof. Mariana Vega', 'mariana.vega@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '943-876-210', 'Calle Las Begonias 475, San Isidro'),
  (11, 'DOC-2026-0005', 'Prof. Ricardo Torres', 'ricardo.torres@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '932-654-098', 'Av. La Marina 2100, Pueblo Libre'),
  (12, 'DOC-2026-0006', 'Prof. Claudia Herrera', 'claudia.herrera@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '988-341-720', 'Av. Pardo y Aliaga 640, San Isidro'),
  (13, 'DOC-2026-0007', 'Prof. Fernando Ríos', 'fernando.rios@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '981-225-609', 'Jr. Junín 890, Magdalena'),
  (14, 'DOC-2026-0008', 'Prof. Andrea Soto', 'andrea.soto@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '976-508-114', 'Av. Aviación 3420, San Borja'),
  (15, 'DOC-2026-0009', 'Prof. Gonzalo Silva', 'gonzalo.silva@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '972-990-415', 'Av. Velasco Astete 1420, Surco'),
  (16, 'DOC-2026-0010', 'Prof. Ximena Delgado', 'ximena.delgado@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'profesor', NULL, '969-118-230', 'Calle Dos de Mayo 515, Miraflores'),

  -- Alumnos (24)
  (17, 'ALU-2026-0001', 'Anthony Quispe', 'anthony.quispe@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '944-321-876', 'Av. Universitaria 840, San Miguel'),
  (18, 'ALU-2026-0002', 'Sofía Huamán', 'sofia.huaman@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '941-552-104', 'Av. Brasil 1620, Jesús María'),
  (19, 'ALU-2026-0003', 'Mateo Salazar', 'mateo.salazar@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '938-741-229', 'Jr. Huiracocha 1485, Jesús María'),
  (20, 'ALU-2026-0004', 'Camila Navarro', 'camila.navarro@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '927-613-885', 'Av. Larco 720, Miraflores'),
  (21, 'ALU-2026-0005', 'Sebastián Flores', 'sebastian.flores@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '919-402-773', 'Av. Angamos Oeste 540, Miraflores'),
  (22, 'ALU-2026-0006', 'Valentina Castro', 'valentina.castro@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Administración de Negocios Digitales', '912-890-334', 'Av. Primavera 1120, San Borja'),
  (23, 'ALU-2026-0007', 'Gabriel Chávez', 'gabriel.chavez@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Administración de Negocios Digitales', '908-123-456', 'Av. Caminos del Inca 910, Surco'),
  (24, 'ALU-2026-0008', 'Luciana Morales', 'luciana.morales@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '901-776-540', 'Av. Bolívar 430, Pueblo Libre'),
  (25, 'ALU-2026-0009', 'Joaquín Vargas', 'joaquin.vargas@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '951-230-441', 'Jr. Cusco 312, Magdalena'),
  (26, 'ALU-2026-0010', 'Antonella Ramos', 'antonella.ramos@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '952-419-808', 'Calle Grimaldo del Solar 290, Miraflores'),
  (27, 'ALU-2026-0011', 'Nicolás Medina', 'nicolas.medina@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Gestión de Tecnologías de Información', '953-680-112', 'Av. Tomás Marsano 2450, Surco'),
  (28, 'ALU-2026-0012', 'Isabella Cruz', 'isabella.cruz@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Gestión de Tecnologías de Información', '955-120-904', 'Av. Canadá 1750, San Luis'),
  (29, 'ALU-2026-0013', 'Bruno Espinoza', 'bruno.espinoza@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '956-884-320', 'Av. Colonial 1410, Cercado'),
  (30, 'ALU-2026-0014', 'Mariana Aguilar', 'mariana.aguilar@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Administración de Negocios Digitales', '957-331-765', 'Av. El Polo 405, Surco'),
  (31, 'ALU-2026-0015', 'Thiago Cabrera', 'thiago.cabrera@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '958-492-119', 'Jr. Ancash 940, Barrios Altos'),
  (32, 'ALU-2026-0016', 'Daniela Ortiz', 'daniela.ortiz@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '959-710-284', 'Av. Sucre 780, Pueblo Libre'),
  (33, 'ALU-2026-0017', 'Emilio Guzmán', 'emilio.guzman@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Gestión de Tecnologías de Información', '960-845-123', 'Av. La Molina 1120, La Molina'),
  (34, 'ALU-2026-0018', 'Paula Cárdenas', 'paula.cardenas@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Administración de Negocios Digitales', '961-932-447', 'Calle Berlín 620, Miraflores'),
  (35, 'ALU-2026-0019', 'Rodrigo Peña', 'rodrigo.pena@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '962-118-654', 'Av. Elmer Faucett 1890, Callao'),
  (36, 'ALU-2026-0020', 'Mía Benítez', 'mia.benitez@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '963-447-891', 'Av. Pardo 950, Miraflores'),
  (37, 'ALU-2026-0021', 'Andrés Lozano', 'andres.lozano@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Gestión de Tecnologías de Información', '964-559-203', 'Av. Arenales 2140, Lince'),
  (38, 'ALU-2026-0022', 'Zoe Miranda', 'zoe.miranda@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Administración de Negocios Digitales', '966-701-338', 'Av. San Borja Norte 480, San Borja'),
  (39, 'ALU-2026-0023', 'Lucas Palacios', 'lucas.palacios@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Desarrollo de Sistemas de Información', '967-823-990', 'Av. Mariano Cornejo 1320, Pueblo Libre'),
  (40, 'ALU-2026-0024', 'Abril Montoya', 'abril.montoya@zegel.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 'Diseño de Experiencia Digital', '968-940-512', 'Calle Alcanfores 345, Miraflores');

INSERT INTO courses (id, code, title, career, description, credits, status, teacher_id)
VALUES
  (1,  'DI3-401', 'Desarrollo de Interfaces III', 'Desarrollo de Sistemas de Información', 'Arquitectura SPA en Angular Standalone, rutas protegidas, interceptores JWT y consumo de APIs REST.', 4, 'active', 7),
  (2,  'BD2-302', 'Base de Datos Avanzadas', 'Desarrollo de Sistemas de Información', 'Modelamiento relacional, transacciones ACID, optimización de consultas e integración con PHP PDO.', 4, 'active', 8),
  (3,  'WEB-403', 'Desarrollo Web Full Stack', 'Desarrollo de Sistemas de Información', 'Integración de APIs RESTful, autenticación segura, despliegue y pruebas end-to-end.', 4, 'active', 9),
  (4,  'MOV-405', 'Desarrollo de Aplicaciones Móviles', 'Desarrollo de Sistemas de Información', 'Interfaces móviles multiplataforma, consumo de servicios y almacenamiento local.', 4, 'active', 7),
  (5,  'ARQ-406', 'Arquitectura de Microservicios', 'Desarrollo de Sistemas de Información', 'Contenedores, API Gateways, mensajería asíncrona y observabilidad en sistemas distribuidos.', 4, 'active', 13),
  (6,  'QA1-304', 'Calidad y Pruebas de Software', 'Desarrollo de Sistemas de Información', 'Pirámide de pruebas, testing automatizado en frontend/backend e integración continua.', 3, 'active', 12),
  (7,  'UX1-205', 'Diseño de Experiencia de Usuario', 'Diseño de Experiencia Digital', 'Prototipado centrado en el usuario, sistemas de diseño y pruebas de usabilidad.', 3, 'active', 10),
  (8,  'UI2-301', 'Sistemas de Diseño y Prototipado', 'Diseño de Experiencia Digital', 'Tokens visuales, bibliotecas de componentes accesibles y flujos interactivos en Figma.', 3, 'active', 10),
  (9,  'UXR-208', 'Investigación y Accesibilidad Digital', 'Diseño de Experiencia Digital', 'Entrevistas con usuarios, pruebas A/B y cumplimiento de estándares WCAG 2.2 AA.', 3, 'active', 14),
  (10, 'MKT-204', 'Estrategia y Analítica Digital', 'Administración de Negocios Digitales', 'Métricas de adquisición, embudos de conversión y toma de decisiones basada en datos.', 3, 'active', 11),
  (11, 'E-C-302', 'Comercio Electrónico y Omnicanalidad', 'Administración de Negocios Digitales', 'Modelos B2C/B2B, pasarelas de pago, logística digital y retención de clientes.', 3, 'active', 16),
  (12, 'CLD-305', 'Infraestructura Cloud y DevOps', 'Gestión de Tecnologías de Información', 'Despliegue en la nube, automatización CI/CD, monitoreo y seguridad perimetral.', 4, 'active', 15),
  (13, 'SEG-309', 'Ciberseguridad Aplicada', 'Gestión de Tecnologías de Información', 'Gestión de vulnerabilidades OWASP Top 10, endurecimiento de servidores y respuesta a incidentes.', 4, 'active', 13),
  (14, 'IA1-410', 'Inteligencia Artificial Aplicada', 'Desarrollo de Sistemas de Información', 'Integración de modelos generativos, embeddings y automatización inteligente en productos web.', 3, 'draft', NULL),
  (15, 'PRO-210', 'Gestión Ágil de Proyectos', 'Administración de Negocios Digitales', 'Scrum, Kanban, estimación por puntos de historia y tableros de seguimiento.', 3, 'inactive', 11),
  (16, 'ALG-101', 'Fundamentos de Programación', 'Fundamentos Tecnológicos', 'Lógica algorítmica, estructuras de control, funciones y programación orientada a objetos.', 3, 'inactive', 8);

INSERT INTO course_modules (course_id, title, hours, sort_order)
VALUES
  (1,  'Arquitectura Angular Standalone y Lazy Loading', 8, 1),
  (1,  'Guards, Interceptores HTTP y Autenticación JWT', 10, 2),
  (1,  'Formularios Reactivos Avanzados y Validadores Asíncronos', 8, 3),
  (2,  'Normalización y Diseño Relacional en MySQL', 8, 1),
  (2,  'Transacciones PDO y Seguridad SQL', 8, 2),
  (2,  'Índices, Vistas y Optimización de Consultas', 6, 3),
  (3,  'Diseño de Endpoints REST y Contratos JSON', 8, 1),
  (3,  'Integración Frontend-Backend y Manejo de Errores', 10, 2),
  (4,  'Navegación Móvil y Gestión de Estado', 8, 1),
  (4,  'Consumo de APIs y Almacenamiento Offline', 8, 2),
  (5,  'Contenedores Docker y Orquestación Básica', 8, 1),
  (5,  'Patrones de Resiliencia y API Gateway', 8, 2),
  (6,  'Pruebas Unitarias y de Integración', 6, 1),
  (6,  'Automatización E2E y Pipelines CI', 8, 2),
  (7,  'Investigación de Usuarios y Arquitectura de Información', 6, 1),
  (7,  'Pruebas de Usabilidad y Heurísticas', 8, 2),
  (8,  'Tokens de Diseño y Tipografía Escalar', 6, 1),
  (8,  'Componentes Accesibles y Handoff', 8, 2),
  (9,  'Mapeo de Experiencia y Benchmarking', 6, 1),
  (9,  'Auditoría WCAG 2.2 AA', 6, 2),
  (10, 'KPIs Digitales y Modelos de Atribución', 6, 1),
  (10, 'Dashboards Ejecutivos y Optimización de Conversión', 8, 2),
  (11, 'Arquitectura de Tiendas Online y Checkout', 6, 1),
  (11, 'Fidelización y CRM Omnicanal', 6, 2),
  (12, 'Redes Cloud, Balanceadores y Terraform', 8, 1),
  (12, 'Observabilidad, Logs y Alertas', 8, 2),
  (13, 'Análisis OWASP Top 10 en APIs', 8, 1),
  (13, 'Hardening y Gestión de Secretos', 8, 2),
  (14, 'Prompt Engineering y Consumo de APIs Generativas', 6, 1),
  (15, 'Marco Scrum y Ceremonias Ágiles', 6, 1),
  (16, 'Estructuras de Control y Arreglos', 6, 1),
  (16, 'Introducción a la Programación Orientada a Objetos', 8, 2);

-- Matrículas activas (ciclo actual 2026-II) y completadas (ciclos pasados)
INSERT INTO enrollments (student_id, course_id, cycle, status, final_grade)
VALUES
  -- DI3-401 (Curso 1, Prof. Carlos Mendoza)
  (17, 1, '2026-II', 'enrolled', NULL),
  (18, 1, '2026-II', 'enrolled', NULL),
  (19, 1, '2026-II', 'enrolled', NULL),
  (24, 1, '2026-II', 'enrolled', NULL),
  (25, 1, '2026-II', 'enrolled', NULL),
  (29, 1, '2026-II', 'enrolled', NULL),
  (31, 1, '2026-II', 'enrolled', NULL),
  -- BD2-302 (Curso 2, Prof. Lucía Paredes)
  (17, 2, '2026-II', 'enrolled', NULL),
  (18, 2, '2026-II', 'enrolled', NULL),
  (25, 2, '2026-II', 'enrolled', NULL),
  (35, 2, '2026-II', 'enrolled', NULL),
  (39, 2, '2026-II', 'enrolled', NULL),
  -- WEB-403 (Curso 3, Prof. Javier Castillo)
  (17, 3, '2026-II', 'enrolled', NULL),
  (24, 3, '2026-II', 'enrolled', NULL),
  (29, 3, '2026-II', 'enrolled', NULL),
  (35, 3, '2026-II', 'enrolled', NULL),
  -- MOV-405 (Curso 4, Prof. Carlos Mendoza)
  (19, 4, '2026-II', 'enrolled', NULL),
  (31, 4, '2026-II', 'enrolled', NULL),
  (35, 4, '2026-II', 'enrolled', NULL),
  (39, 4, '2026-II', 'enrolled', NULL),
  -- ARQ-406 & QA1-304
  (18, 5, '2026-II', 'enrolled', NULL),
  (29, 5, '2026-II', 'enrolled', NULL),
  (25, 6, '2026-II', 'enrolled', NULL),
  (39, 6, '2026-II', 'enrolled', NULL),
  -- Diseño UX/UI (Cursos 7, 8, 9)
  (20, 7, '2026-II', 'enrolled', NULL),
  (21, 7, '2026-II', 'enrolled', NULL),
  (26, 7, '2026-II', 'enrolled', NULL),
  (32, 7, '2026-II', 'enrolled', NULL),
  (36, 8, '2026-II', 'enrolled', NULL),
  (40, 8, '2026-II', 'enrolled', NULL),
  (20, 9, '2026-II', 'enrolled', NULL),
  (26, 9, '2026-II', 'enrolled', NULL),
  -- Negocios Digitales (Cursos 10, 11)
  (22, 10, '2026-II', 'enrolled', NULL),
  (23, 10, '2026-II', 'enrolled', NULL),
  (30, 10, '2026-II', 'enrolled', NULL),
  (34, 11, '2026-II', 'enrolled', NULL),
  (38, 11, '2026-II', 'enrolled', NULL),
  -- Gestión TI (Cursos 12, 13)
  (27, 12, '2026-II', 'enrolled', NULL),
  (28, 12, '2026-II', 'enrolled', NULL),
  (33, 12, '2026-II', 'enrolled', NULL),
  (37, 13, '2026-II', 'enrolled', NULL),
  (27, 13, '2026-II', 'enrolled', NULL),

  -- Historial completado (ciclos 2025-II y 2026-I)
  (17, 16, '2025-II', 'completed', 18.50),
  (17, 7,  '2026-I',  'completed', 16.00),
  (17, 6,  '2026-I',  'completed', 17.00),
  (18, 16, '2025-II', 'completed', 17.50),
  (18, 3,  '2026-I',  'completed', 15.50),
  (19, 2,  '2026-I',  'completed', 14.50),
  (19, 16, '2025-II', 'completed', 11.50),
  (20, 16, '2025-II', 'completed', 16.00),
  (21, 8,  '2026-I',  'completed', 15.00),
  (22, 15, '2026-I',  'completed', 16.50),
  (23, 15, '2026-I',  'completed', 12.00),
  (24, 2,  '2026-I',  'completed', 18.00),
  (25, 16, '2025-II', 'completed', 15.00),
  (26, 8,  '2026-I',  'completed', 17.50),
  (27, 16, '2025-II', 'completed', 14.00),
  (28, 13, '2026-I',  'completed', 16.00),
  (29, 6,  '2026-I',  'completed', 13.50),
  (30, 11, '2026-I',  'completed', 17.00),
  (31, 3,  '2026-I',  'completed', 12.50),
  (32, 8,  '2026-I',  'completed', 18.00),
  (33, 13, '2026-I',  'completed', 15.50),
  (34, 10, '2026-I',  'completed', 16.50),
  (35, 16, '2025-II', 'completed', 14.50);

INSERT INTO agenda_events (event_date, event_time, title, tag, tone)
VALUES
  (CURDATE(), '09:00 am', 'Revisión de entregables Angular SPA', 'DI3-401', 'violet'),
  (CURDATE(), '06:30 pm', 'Asesoría de proyectos móviles', 'MOV-405', 'amber'),
  (DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:30 am', 'Taller práctico de transacciones PDO', 'BD2-302', 'amber'),
  (DATE_ADD(CURDATE(), INTERVAL 2 DAY), '04:00 pm', 'Comité académico de cierre de ciclo', 'General', 'mint'),
  (DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00 am', 'Evaluación de prototipos en Figma', 'UX1-205', 'violet'),
  (DATE_ADD(CURDATE(), INTERVAL 4 DAY), '06:00 pm', 'Sustentación de proyectos finales', 'Escuela Tech', 'violet'),
  (DATE_ADD(CURDATE(), INTERVAL 5 DAY), '09:30 am', 'Simulacro de auditoría OWASP', 'SEG-309', 'amber');

INSERT INTO attendance_stats (day_label, day_order, present_pct, absent_pct)
VALUES
  ('Lun', 1, 90, 10),
  ('Mar', 2, 84, 16),
  ('Mié', 3, 95, 5),
  ('Jue', 4, 88, 12),
  ('Vie', 5, 92, 8);

INSERT INTO notices (title, summary, author, category, published_at)
VALUES
  ('Inicio de evaluaciones finales del ciclo 2026-II', 'Revisa las fechas de sustentación y sube tu entregable PDF a la plataforma EVA.', 'Dirección Académica', 'Académico', CURDATE()),
  ('Actualización de laboratorios de Desarrollo Web', 'Se habilitaron nuevas estaciones con Node.js 24, Angular CLI y MySQL Server.', 'Soporte TI Zegel', 'Infraestructura', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
  ('Convocatoria a Hackathon Inter-Sedes 2026', 'Inscribe a tu equipo de 3 integrantes hasta el viernes para participar por becas.', 'Escuela de Tecnología', 'Eventos', DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
  ('Cierre de registro de notas parciales', 'Se recuerda a los docentes registrar las calificaciones y asistencias antes del viernes.', 'Coordinación Docente', 'Académico', DATE_SUB(CURDATE(), INTERVAL 7 DAY));

INSERT INTO course_attendance (course_id, student_id, session_date, status)
VALUES
  -- DI3-401 (3 sesiones)
  (1, 17, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'present'),
  (1, 18, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'present'),
  (1, 19, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'late'),
  (1, 24, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'present'),
  (1, 25, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'absent'),
  (1, 29, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'present'),
  (1, 31, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'present'),
  (1, 17, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'present'),
  (1, 18, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'present'),
  (1, 19, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'present'),
  (1, 24, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'late'),
  (1, 25, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'present'),
  (1, 29, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'present'),
  (1, 31, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'absent'),
  (1, 17, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (1, 18, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'absent'),
  (1, 19, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (1, 24, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (1, 25, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (1, 29, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'late'),
  (1, 31, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  -- BD2-302 (2 sesiones)
  (2, 17, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'present'),
  (2, 18, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'present'),
  (2, 25, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'present'),
  (2, 35, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'late'),
  (2, 39, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'present'),
  (2, 17, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (2, 18, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (2, 25, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'absent'),
  (2, 35, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  (2, 39, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'present'),
  -- MOV-405
  (4, 19, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'present'),
  (4, 31, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'present'),
  (4, 35, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'absent'),
  (4, 39, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'present');
