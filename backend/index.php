<?php

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/jwt.php';
require_once __DIR__ . '/helpers/response.php';

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

    // PUT /api/courses/{id} | DELETE /api/courses/{id}
    if (preg_match('#^/api/courses/(\d+)$#', $path, $matches)) {
        $courseId = (int) $matches[1];
        if ($method === 'PUT') {
            handleUpdateCourse($pdo, $courseId);
        }
        if ($method === 'DELETE') {
            handleDeleteCourse($pdo, $courseId);
        }
        jsonResponse(['error' => 'Método no permitido.'], 405);
    }

    // GET /api/enrollments/history
    if ($method === 'GET' && $path === '/api/enrollments/history') {
        handleGetEnrollmentHistory($pdo);
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

    jsonResponse(['error' => 'Endpoint no encontrado.'], 404);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        jsonResponse(['error' => 'Conflicto de integridad o registro duplicado.'], 409);
    }
    jsonResponse(['error' => 'Error interno de base de datos.'], 500);
} catch (Throwable $e) {
    jsonResponse(['error' => 'Error interno del servidor.'], 500);
}

// ============================================================================
// HANDLERS DE AUTENTICACIÓN
// ============================================================================

function handleLogin(PDO $pdo): never
{
    $body = getJsonBody();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        jsonResponse(['error' => 'Debe ingresar correo electrónico y contraseña.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        jsonResponse(['error' => 'Credenciales inválidas.'], 401);
    }

    $now = time();
    $payload = [
        'sub'   => (int) $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'iat'   => $now,
        'exp'   => $now + JWT_TTL_SECONDS,
    ];

    $token = jwtEncode($payload, JWT_SECRET);

    jsonResponse([
        'token' => $token,
        'user'  => [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ],
    ]);
}

// ============================================================================
// HANDLERS DE CURSOS Y MÓDULOS
// ============================================================================

function handleCheckCourseCode(PDO $pdo): never
{
    requireAuth();
    $code = trim((string) ($_GET['code'] ?? ''));
    $excludeId = isset($_GET['excludeId']) && $_GET['excludeId'] !== '' ? (int) $_GET['excludeId'] : 0;

    if ($code === '') {
        jsonResponse(['available' => false]);
    }

    if ($excludeId > 0) {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM courses WHERE code = :code AND id != :excludeId');
        $stmt->execute(['code' => $code, 'excludeId' => $excludeId]);
    } else {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM courses WHERE code = :code');
        $stmt->execute(['code' => $code]);
    }

    jsonResponse(['available' => ((int) $stmt->fetchColumn()) === 0]);
}

function handleGetCourses(PDO $pdo): never
{
    $auth = requireAuth();
    $role = (string) $auth['role'];
    $userId = (int) $auth['sub'];

    if ($role === 'admin') {
        $stmt = $pdo->query(
            'SELECT c.id, c.code, c.title, c.description, c.credits, c.status, c.teacher_id,
                    u.name AS teacher_name, c.created_at
             FROM courses c
             LEFT JOIN users u ON u.id = c.teacher_id
             ORDER BY c.id DESC'
        );
    } elseif ($role === 'profesor') {
        $stmt = $pdo->prepare(
            'SELECT c.id, c.code, c.title, c.description, c.credits, c.status, c.teacher_id,
                    u.name AS teacher_name, c.created_at
             FROM courses c
             LEFT JOIN users u ON u.id = c.teacher_id
             WHERE c.teacher_id = :teacherId
             ORDER BY c.id DESC'
        );
        $stmt->execute(['teacherId' => $userId]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT c.id, c.code, c.title, c.description, c.credits, c.status, c.teacher_id,
                    u.name AS teacher_name, c.created_at
             FROM courses c
             INNER JOIN enrollments e ON e.course_id = c.id
             LEFT JOIN users u ON u.id = c.teacher_id
             WHERE e.student_id = :studentId
               AND e.status = 'enrolled'
               AND c.status = 'active'
             ORDER BY c.id DESC"
        );
        $stmt->execute(['studentId' => $userId]);
    }

    $courses = $stmt->fetchAll();
    jsonResponse(attachModulesToCourses($pdo, $courses));
}

function handleCreateCourse(PDO $pdo): never
{
    requireRole(['admin']);
    $body = getJsonBody();

    $validated = validateCoursePayload($body);
    $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM courses WHERE code = :code');
    $checkStmt->execute(['code' => $validated['code']]);
    if ((int) $checkStmt->fetchColumn() > 0) {
        jsonResponse(['error' => 'Ya existe un curso con ese código.'], 409);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO courses (code, title, description, credits, status, teacher_id)
             VALUES (:code, :title, :description, :credits, :status, :teacher_id)'
        );
        $stmt->execute([
            'code'        => $validated['code'],
            'title'       => $validated['title'],
            'description' => $validated['description'],
            'credits'     => $validated['credits'],
            'status'      => $validated['status'],
            'teacher_id'  => $validated['teacher_id'],
        ]);

        $courseId = (int) $pdo->lastInsertId();
        syncCourseModules($pdo, $courseId, $validated['modules']);

        $pdo->commit();
        jsonResponse(fetchCourseById($pdo, $courseId), 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function handleUpdateCourse(PDO $pdo, int $courseId): never
{
    $auth = requireRole(['admin', 'profesor']);
    $existing = fetchCourseRow($pdo, $courseId);

    if ($existing === null) {
        jsonResponse(['error' => 'Curso no encontrado.'], 404);
    }

    $body = getJsonBody();

    if ($auth['role'] === 'profesor') {
        if ((int) ($existing['teacher_id'] ?? 0) !== (int) $auth['sub']) {
            jsonResponse(['error' => 'No tiene permiso para editar un curso que no le pertenece.'], 403);
        }

        if (array_key_exists('teacher_id', $body)) {
            $requestedTeacherId = $body['teacher_id'] !== null && $body['teacher_id'] !== ''
                ? (int) $body['teacher_id']
                : null;
            $currentTeacherId = $existing['teacher_id'] !== null ? (int) $existing['teacher_id'] : null;

            if ($requestedTeacherId !== $currentTeacherId) {
                jsonResponse(['error' => 'Un profesor no puede reasignar el docente del curso.'], 403);
            }
        }

        // Conserva el teacher_id actual asignado
        $body['teacher_id'] = $existing['teacher_id'];
    }

    $validated = validateCoursePayload($body);

    $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM courses WHERE code = :code AND id != :id');
    $checkStmt->execute(['code' => $validated['code'], 'id' => $courseId]);
    if ((int) $checkStmt->fetchColumn() > 0) {
        jsonResponse(['error' => 'Ya existe otro curso con ese código.'], 409);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE courses
             SET code = :code, title = :title, description = :description,
                 credits = :credits, status = :status, teacher_id = :teacher_id
             WHERE id = :id'
        );
        $stmt->execute([
            'code'        => $validated['code'],
            'title'       => $validated['title'],
            'description' => $validated['description'],
            'credits'     => $validated['credits'],
            'status'      => $validated['status'],
            'teacher_id'  => $validated['teacher_id'],
            'id'          => $courseId,
        ]);

        syncCourseModules($pdo, $courseId, $validated['modules']);

        $pdo->commit();
        jsonResponse(fetchCourseById($pdo, $courseId));
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function handleDeleteCourse(PDO $pdo, int $courseId): never
{
    requireRole(['admin']);

    $stmt = $pdo->prepare('DELETE FROM courses WHERE id = :id');
    $stmt->execute(['id' => $courseId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Curso no encontrado.'], 404);
    }

    jsonResponse(['message' => 'Curso eliminado correctamente.']);
}

function validateCoursePayload(array $body): array
{
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $title = trim((string) ($body['title'] ?? ''));
    $description = isset($body['description']) ? trim((string) $body['description']) : null;
    $credits = isset($body['credits']) ? (int) $body['credits'] : 0;
    $status = (string) ($body['status'] ?? 'draft');
    $teacherId = isset($body['teacher_id']) && $body['teacher_id'] !== '' ? (int) $body['teacher_id'] : null;
    $modules = is_array($body['modules'] ?? null) ? $body['modules'] : [];

    if ($code === '' || $title === '' || $credits < 1 || $credits > 20) {
        jsonResponse(['error' => 'Datos del curso inválidos (código, título y créditos entre 1 y 20 son obligatorios).'], 400);
    }

    if (!in_array($status, ['active', 'draft', 'inactive'], true)) {
        jsonResponse(['error' => 'Estado de curso inválido.'], 400);
    }

    $normalizedModules = [];
    foreach ($modules as $index => $mod) {
        if (!is_array($mod)) {
            continue;
        }
        $modTitle = trim((string) ($mod['title'] ?? ''));
        $modHours = isset($mod['hours']) ? (int) $mod['hours'] : 0;
        if ($modTitle === '' || $modHours < 1) {
            jsonResponse(['error' => 'Cada módulo debe tener título y al menos 1 hora.'], 400);
        }
        $normalizedModules[] = [
            'title'      => $modTitle,
            'hours'      => $modHours,
            'sort_order' => isset($mod['sort_order']) ? max(1, (int) $mod['sort_order']) : ($index + 1),
        ];
    }

    return [
        'code'        => $code,
        'title'       => $title,
        'description' => $description,
        'credits'     => $credits,
        'status'      => $status,
        'teacher_id'  => $teacherId,
        'modules'     => $normalizedModules,
    ];
}

function syncCourseModules(PDO $pdo, int $courseId, array $modules): void
{
    $delStmt = $pdo->prepare('DELETE FROM course_modules WHERE course_id = :course_id');
    $delStmt->execute(['course_id' => $courseId]);

    if ($modules === []) {
        return;
    }

    $insStmt = $pdo->prepare(
        'INSERT INTO course_modules (course_id, title, hours, sort_order)
         VALUES (:course_id, :title, :hours, :sort_order)'
    );

    foreach ($modules as $mod) {
        $insStmt->execute([
            'course_id'  => $courseId,
            'title'      => $mod['title'],
            'hours'      => $mod['hours'],
            'sort_order' => $mod['sort_order'],
        ]);
    }
}

function fetchCourseRow(PDO $pdo, int $courseId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT c.id, c.code, c.title, c.description, c.credits, c.status, c.teacher_id,
                u.name AS teacher_name, c.created_at
         FROM courses c
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE c.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $courseId]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function fetchCourseById(PDO $pdo, int $courseId): ?array
{
    $row = fetchCourseRow($pdo, $courseId);
    if ($row === null) {
        return null;
    }

    $withModules = attachModulesToCourses($pdo, [$row]);
    return $withModules[0];
}

function attachModulesToCourses(PDO $pdo, array $courses): array
{
    if ($courses === []) {
        return [];
    }

    $courseIds = array_map(static fn(array $c): int => (int) $c['id'], $courses);
    $placeholders = implode(',', array_fill(0, count($courseIds), '?'));

    $modStmt = $pdo->prepare(
        "SELECT id, course_id, title, hours, sort_order
         FROM course_modules
         WHERE course_id IN ($placeholders)
         ORDER BY sort_order ASC, id ASC"
    );
    $modStmt->execute($courseIds);

    $modulesByCourse = [];
    foreach ($modStmt->fetchAll() as $mod) {
        $cid = (int) $mod['course_id'];
        $modulesByCourse[$cid][] = [
            'id'         => (int) $mod['id'],
            'course_id'  => $cid,
            'title'      => $mod['title'],
            'hours'      => (int) $mod['hours'],
            'sort_order' => (int) $mod['sort_order'],
        ];
    }

    return array_map(static function (array $course) use ($modulesByCourse): array {
        $cid = (int) $course['id'];
        return [
            'id'           => $cid,
            'code'         => $course['code'],
            'title'        => $course['title'],
            'description'  => $course['description'],
            'credits'      => (int) $course['credits'],
            'status'       => $course['status'],
            'teacher_id'   => $course['teacher_id'] !== null ? (int) $course['teacher_id'] : null,
            'teacher_name' => $course['teacher_name'],
            'created_at'   => $course['created_at'],
            'modules'      => $modulesByCourse[$cid] ?? [],
        ];
    }, $courses);
}

// ============================================================================
// HANDLER DE HISTORIAL DE MATRÍCULAS (ESTUDIANTE)
// ============================================================================

function handleGetEnrollmentHistory(PDO $pdo): never
{
    $auth = requireRole(['estudiante']);
    $studentId = (int) $auth['sub'];

    $stmt = $pdo->prepare(
        "SELECT e.id, e.course_id, c.code AS course_code, c.title AS course_title,
                c.credits, u.name AS teacher_name, e.cycle, e.status, e.final_grade
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE e.student_id = :studentId
           AND e.status = 'completed'
         ORDER BY e.cycle DESC, c.code ASC"
    );
    $stmt->execute(['studentId' => $studentId]);

    $history = array_map(static function (array $row): array {
        $grade = $row['final_grade'] !== null ? (float) $row['final_grade'] : null;
        return [
            'id'           => (int) $row['id'],
            'course_id'    => (int) $row['course_id'],
            'course_code'  => $row['course_code'],
            'course_title' => $row['course_title'],
            'credits'      => (int) $row['credits'],
            'teacher_name' => $row['teacher_name'],
            'cycle'        => $row['cycle'],
            'status'       => $row['status'],
            'final_grade'  => $grade,
            'passed'       => $grade !== null && $grade >= 13.0,
        ];
    }, $stmt->fetchAll());

    jsonResponse($history);
}

// ============================================================================
// HANDLERS DE USUARIOS (ADMIN)
// ============================================================================

function handleCheckUserEmail(PDO $pdo): never
{
    requireRole(['admin']);
    $email = trim((string) ($_GET['email'] ?? ''));
    $excludeId = isset($_GET['excludeId']) && $_GET['excludeId'] !== '' ? (int) $_GET['excludeId'] : 0;

    if ($email === '') {
        jsonResponse(['available' => false]);
    }

    if ($excludeId > 0) {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email AND id != :excludeId');
        $stmt->execute(['email' => $email, 'excludeId' => $excludeId]);
    } else {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
    }

    jsonResponse(['available' => ((int) $stmt->fetchColumn()) === 0]);
}

function handleGetUsers(PDO $pdo): never
{
    requireRole(['admin']);
    $roleFilter = isset($_GET['role']) ? trim((string) $_GET['role']) : '';

    if ($roleFilter !== '' && in_array($roleFilter, ['admin', 'profesor', 'estudiante'], true)) {
        $stmt = $pdo->prepare('SELECT id, name, email, role, created_at FROM users WHERE role = :role ORDER BY id DESC');
        $stmt->execute(['role' => $roleFilter]);
    } else {
        $stmt = $pdo->query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
    }

    $users = array_map(static fn(array $u): array => [
        'id'         => (int) $u['id'],
        'name'       => $u['name'],
        'email'      => $u['email'],
        'role'       => $u['role'],
        'created_at' => $u['created_at'],
    ], $stmt->fetchAll());

    jsonResponse($users);
}

function handleCreateUser(PDO $pdo): never
{
    requireRole(['admin']);
    $body = getJsonBody();

    $name = trim((string) ($body['name'] ?? ''));
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $role = (string) ($body['role'] ?? 'estudiante');

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
        jsonResponse(['error' => 'Nombre, correo válido y contraseña (mín. 6 caracteres) son obligatorios.'], 400);
    }

    if (!in_array($role, ['admin', 'profesor', 'estudiante'], true)) {
        jsonResponse(['error' => 'Rol inválido.'], 400);
    }

    $check = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
    $check->execute(['email' => $email]);
    if ((int) $check->fetchColumn() > 0) {
        jsonResponse(['error' => 'El correo electrónico ya está registrado.'], 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, role)
         VALUES (:name, :email, :password_hash, :role)'
    );
    $stmt->execute([
        'name'          => $name,
        'email'         => $email,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role'          => $role,
    ]);

    $id = (int) $pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = :id');
    $fetch->execute(['id' => $id]);
    $created = $fetch->fetch();

    jsonResponse([
        'id'         => (int) $created['id'],
        'name'       => $created['name'],
        'email'      => $created['email'],
        'role'       => $created['role'],
        'created_at' => $created['created_at'],
    ], 201);
}

function handleUpdateUser(PDO $pdo, int $userId): never
{
    requireRole(['admin']);
    $existingStmt = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
    $existingStmt->execute(['id' => $userId]);
    if (!$existingStmt->fetch()) {
        jsonResponse(['error' => 'Usuario no encontrado.'], 404);
    }

    $body = getJsonBody();
    $name = trim((string) ($body['name'] ?? ''));
    $email = trim((string) ($body['email'] ?? ''));
    $role = (string) ($body['role'] ?? 'estudiante');
    $password = (string) ($body['password'] ?? '');

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Nombre y correo electrónico válido son obligatorios.'], 400);
    }

    if (!in_array($role, ['admin', 'profesor', 'estudiante'], true)) {
        jsonResponse(['error' => 'Rol inválido.'], 400);
    }

    $check = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email AND id != :id');
    $check->execute(['email' => $email, 'id' => $userId]);
    if ((int) $check->fetchColumn() > 0) {
        jsonResponse(['error' => 'Otro usuario ya utiliza ese correo electrónico.'], 409);
    }

    if ($password !== '') {
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'La nueva contraseña debe tener al menos 6 caracteres.'], 400);
        }
        $stmt = $pdo->prepare(
            'UPDATE users SET name = :name, email = :email, role = :role, password_hash = :password_hash WHERE id = :id'
        );
        $stmt->execute([
            'name'          => $name,
            'email'         => $email,
            'role'          => $role,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'id'            => $userId,
        ]);
    } else {
        $stmt = $pdo->prepare('UPDATE users SET name = :name, email = :email, role = :role WHERE id = :id');
        $stmt->execute([
            'name'  => $name,
            'email' => $email,
            'role'  => $role,
            'id'    => $userId,
        ]);
    }

    $fetch = $pdo->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = :id');
    $fetch->execute(['id' => $userId]);
    $updated = $fetch->fetch();

    jsonResponse([
        'id'         => (int) $updated['id'],
        'name'       => $updated['name'],
        'email'      => $updated['email'],
        'role'       => $updated['role'],
        'created_at' => $updated['created_at'],
    ]);
}

function handleDeleteUser(PDO $pdo, int $userId): never
{
    $auth = requireRole(['admin']);

    if ($userId === (int) $auth['sub']) {
        jsonResponse(['error' => 'No puedes eliminar tu propia cuenta activa.'], 409);
    }

    $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute(['id' => $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Usuario no encontrado.'], 404);
    }

    jsonResponse(['message' => 'Usuario eliminado correctamente.']);
}

// ============================================================================
// HANDLER DE REPORTES (ADMIN)
// ============================================================================

function handleGetReportsSummary(PDO $pdo): never
{
    requireRole(['admin']);

    $usersByRole = ['admin' => 0, 'profesor' => 0, 'estudiante' => 0, 'total' => 0];
    foreach ($pdo->query('SELECT role, COUNT(*) AS total FROM users GROUP BY role')->fetchAll() as $row) {
        $role = (string) $row['role'];
        $count = (int) $row['total'];
        if (array_key_exists($role, $usersByRole)) {
            $usersByRole[$role] = $count;
        }
        $usersByRole['total'] += $count;
    }

    $coursesByStatus = ['active' => 0, 'draft' => 0, 'inactive' => 0, 'total' => 0];
    foreach ($pdo->query('SELECT status, COUNT(*) AS total FROM courses GROUP BY status')->fetchAll() as $row) {
        $status = (string) $row['status'];
        $count = (int) $row['total'];
        if (array_key_exists($status, $coursesByStatus)) {
            $coursesByStatus[$status] = $count;
        }
        $coursesByStatus['total'] += $count;
    }

    $enrollments = ['enrolled' => 0, 'completed' => 0, 'total' => 0];
    foreach ($pdo->query('SELECT status, COUNT(*) AS total FROM enrollments GROUP BY status')->fetchAll() as $row) {
        $status = (string) $row['status'];
        $count = (int) $row['total'];
        if (array_key_exists($status, $enrollments)) {
            $enrollments[$status] = $count;
        }
        $enrollments['total'] += $count;
    }

    jsonResponse([
        'users_by_role'     => $usersByRole,
        'courses_by_status' => $coursesByStatus,
        'enrollments'       => $enrollments,
        'total_users'       => $usersByRole['total'],
        'total_courses'     => $coursesByStatus['total'],
        'total_enrollments' => $enrollments['total'],
    ]);
}
