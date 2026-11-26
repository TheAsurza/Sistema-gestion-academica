<?php

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/jwt.php';
require_once __DIR__ . '/helpers/response.php';

require_once __DIR__ . '/controllers/auth.php';
require_once __DIR__ . '/controllers/courses.php';
require_once __DIR__ . '/controllers/users.php';
require_once __DIR__ . '/controllers/enrollments.php';
require_once __DIR__ . '/controllers/attendance.php';
require_once __DIR__ . '/controllers/reports.php';
require_once __DIR__ . '/controllers/dashboard.php';

sendCorsHeaders();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Normaliza la ruta para funcionar tanto con `php -S localhost:8000` como bajo subdirectorios Apache
$apiPos = strpos($rawPath, '/api/');
if ($apiPos !== false) {
    $path = substr($rawPath, $apiPos);
} elseif (str_ends_with($rawPath, '/api')) {
    $path = '/api';
} else {
    $path = $rawPath;
}
$path = rtrim($path, '/') ?: '/';

try {
    $pdo = getDbConnection();

    // POST /api/auth/login
    if ($method === 'POST' && $path === '/api/auth/login') {
        handleLogin($pdo);
    }

    // GET /api/courses/check-code
    if ($method === 'GET' && $path === '/api/courses/check-code') {
        handleCheckCourseCode($pdo);
    }

    // GET /api/courses | POST /api/courses
    if ($path === '/api/courses') {
        if ($method === 'GET') {
            handleGetCourses($pdo);
        }
        if ($method === 'POST') {
            handleCreateCourse($pdo);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/courses/{id} | PUT /api/courses/{id} | DELETE /api/courses/{id}
    if (preg_match('#^/api/courses/(\d+)$#', $path, $matches)) {
        $courseId = (int) $matches[1];
        if ($method === 'GET') {
            handleGetCourseDetail($pdo, $courseId);
        }
        if ($method === 'PUT') {
            handleUpdateCourse($pdo, $courseId);
        }
        if ($method === 'DELETE') {
            handleDeleteCourse($pdo, $courseId);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/courses/{id}/my-view
    if ($method === 'GET' && preg_match('#^/api/courses/(\d+)/my-view$#', $path, $matches)) {
        handleGetStudentCourseView($pdo, (int) $matches[1]);
    }

    // GET /api/courses/{id}/attendance | PUT /api/courses/{id}/attendance
    if (preg_match('#^/api/courses/(\d+)/attendance$#', $path, $matches)) {
        $courseId = (int) $matches[1];
        if ($method === 'GET') {
            handleGetCourseAttendance($pdo, $courseId);
        }
        if ($method === 'PUT') {
            handleSaveCourseAttendance($pdo, $courseId);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/enrollments/history
    if ($method === 'GET' && $path === '/api/enrollments/history') {
        handleGetEnrollmentHistory($pdo);
    }

    // POST /api/enrollments
    if ($method === 'POST' && $path === '/api/enrollments') {
        handleCreateEnrollment($pdo);
    }

    // PUT /api/enrollments/{id}/grade
    if ($method === 'PUT' && preg_match('#^/api/enrollments/(\d+)/grade$#', $path, $matches)) {
        handleUpdateEnrollmentGrade($pdo, (int) $matches[1]);
    }

    // DELETE /api/enrollments/{id}
    if (preg_match('#^/api/enrollments/(\d+)$#', $path, $matches)) {
        $enrollmentId = (int) $matches[1];
        if ($method === 'DELETE') {
            handleDeleteEnrollment($pdo, $enrollmentId);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/users/check-email
    if ($method === 'GET' && $path === '/api/users/check-email') {
        handleCheckUserEmail($pdo);
    }

    // GET /api/users | POST /api/users
    if ($path === '/api/users') {
        if ($method === 'GET') {
            handleGetUsers($pdo);
        }
        if ($method === 'POST') {
            handleCreateUser($pdo);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // PUT /api/users/{id} | DELETE /api/users/{id}
    if (preg_match('#^/api/users/(\d+)$#', $path, $matches)) {
        $userId = (int) $matches[1];
        if ($method === 'PUT') {
            handleUpdateUser($pdo, $userId);
        }
        if ($method === 'DELETE') {
            handleDeleteUser($pdo, $userId);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/reports/summary
    if ($method === 'GET' && $path === '/api/reports/summary') {
        handleGetReportsSummary($pdo);
    }

    // GET /api/teachers | /api/students | /api/staff
    if ($method === 'GET' && $path === '/api/teachers') {
        handleGetTeachers($pdo);
    }
    if ($method === 'GET' && $path === '/api/students') {
        handleGetStudents($pdo);
    }
    if ($method === 'GET' && $path === '/api/staff') {
        handleGetStaff($pdo);
    }

    // GET /api/agenda | POST /api/agenda
    if ($path === '/api/agenda') {
        if ($method === 'GET') {
            handleGetAgenda($pdo);
        }
        if ($method === 'POST') {
            handleCreateAgendaEvent($pdo);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // DELETE /api/agenda/{id}
    if ($method === 'DELETE' && preg_match('#^/api/agenda/(\d+)$#', $path, $matches)) {
        handleDeleteAgendaEvent($pdo, (int) $matches[1]);
    }

    // GET /api/attendance/weekly
    if ($method === 'GET' && $path === '/api/attendance/weekly') {
        handleGetWeeklyAttendance($pdo);
    }

    // GET /api/notices
    if ($method === 'GET' && $path === '/api/notices') {
        handleGetNotices($pdo);
    }

    jsonResponse(['error' => 'Endpoint no encontrado.'], 404);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        jsonResponse(['error' => 'Conflicto de integridad o registro duplicado.'], 409);
    }
    jsonResponse(['error' => 'Error interno de base de datos.'], 500);
} catch (Throwable $e) {
    jsonResponse(['error' => 'Error interno del servidor.'], 500);
}
