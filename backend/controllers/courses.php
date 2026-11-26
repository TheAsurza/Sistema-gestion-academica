<?php

declare(strict_types=1);

// ============================================================================
// HANDLERS DE CURSOS, MÓDULOS Y VISTAS DE CURSO
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
            'SELECT c.id, c.code, c.title, c.career, c.description, c.credits, c.status, c.teacher_id,
                    u.name AS teacher_name, c.created_at
             FROM courses c
             LEFT JOIN users u ON u.id = c.teacher_id
             ORDER BY c.id DESC'
        );
    } elseif ($role === 'profesor') {
        $stmt = $pdo->prepare(
            'SELECT c.id, c.code, c.title, c.career, c.description, c.credits, c.status, c.teacher_id,
                    u.name AS teacher_name, c.created_at
             FROM courses c
             LEFT JOIN users u ON u.id = c.teacher_id
             WHERE c.teacher_id = :teacherId
             ORDER BY c.id DESC'
        );
        $stmt->execute(['teacherId' => $userId]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT c.id, c.code, c.title, c.career, c.description, c.credits, c.status, c.teacher_id,
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
            'INSERT INTO courses (code, title, career, description, credits, status, teacher_id)
             VALUES (:code, :title, :career, :description, :credits, :status, :teacher_id)'
        );
        $stmt->execute([
            'code'        => $validated['code'],
            'title'       => $validated['title'],
            'career'      => $validated['career'],
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
             SET code = :code, title = :title, career = :career, description = :description,
                 credits = :credits, status = :status, teacher_id = :teacher_id
             WHERE id = :id'
        );
        $stmt->execute([
            'code'        => $validated['code'],
            'title'       => $validated['title'],
            'career'      => $validated['career'],
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
    $career = trim((string) ($body['career'] ?? '')) ?: 'Desarrollo de Sistemas de Información';
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
        'career'      => $career,
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
        'SELECT c.id, c.code, c.title, c.career, c.description, c.credits, c.status, c.teacher_id,
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
            'career'       => $course['career'] ?? 'Desarrollo de Sistemas de Información',
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

function assertCourseManageAccess(PDO $pdo, int $courseId): array
{
    $auth = requireRole(['admin', 'profesor']);
    $course = fetchCourseRow($pdo, $courseId);

    if (!$course) {
        jsonResponse(['error' => 'Curso no encontrado.'], 404);
    }

    if ($auth['role'] === 'profesor' && (int) $course['teacher_id'] !== (int) $auth['sub']) {
        jsonResponse(['error' => 'No tienes permiso para gestionar este curso.'], 403);
    }

    return $course;
}

function handleGetCourseDetail(PDO $pdo, int $courseId): never
{
    $course = assertCourseManageAccess($pdo, $courseId);

    $modStmt = $pdo->prepare(
        'SELECT id, course_id, title, hours, sort_order
         FROM course_modules
         WHERE course_id = :cid
         ORDER BY sort_order ASC, id ASC'
    );
    $modStmt->execute(['cid' => $courseId]);
    $modules = array_map(static fn(array $m): array => [
        'id'         => (int) $m['id'],
        'course_id'  => (int) $m['course_id'],
        'title'      => $m['title'],
        'hours'      => (int) $m['hours'],
        'sort_order' => (int) $m['sort_order'],
    ], $modStmt->fetchAll());

    $attStmt = $pdo->prepare(
        "SELECT student_id,
                COUNT(*) AS total_sessions,
                SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended_sessions
         FROM course_attendance
         WHERE course_id = :cid
         GROUP BY student_id"
    );
    $attStmt->execute(['cid' => $courseId]);
    $attByStudent = [];
    foreach ($attStmt->fetchAll() as $ar) {
        $total = (int) $ar['total_sessions'];
        $attended = (int) $ar['attended_sessions'];
        $attByStudent[(int) $ar['student_id']] = $total > 0 ? round(($attended / $total) * 100, 1) : 100.0;
    }

    $stuStmt = $pdo->prepare(
        'SELECT e.id AS enrollment_id, e.student_id, u.user_code, u.name, u.email, u.career,
                e.cycle, e.status, e.final_grade
         FROM enrollments e
         INNER JOIN users u ON u.id = e.student_id
         WHERE e.course_id = :cid
         ORDER BY e.status ASC, u.name ASC'
    );
    $stuStmt->execute(['cid' => $courseId]);
    $students = array_map(static function (array $s) use ($attByStudent): array {
        $sid = (int) $s['student_id'];
        return [
            'enrollment_id'  => (int) $s['enrollment_id'],
            'student_id'     => $sid,
            'user_code'      => $s['user_code'],
            'name'           => $s['name'],
            'email'          => $s['email'],
            'career'         => $s['career'],
            'cycle'          => $s['cycle'],
            'status'         => $s['status'],
            'final_grade'    => $s['final_grade'] !== null ? (float) $s['final_grade'] : null,
            'attendance_pct' => $attByStudent[$sid] ?? 100.0,
        ];
    }, $stuStmt->fetchAll());

    jsonResponse([
        'id'           => (int) $course['id'],
        'code'         => $course['code'],
        'title'        => $course['title'],
        'career'       => $course['career'],
        'description'  => $course['description'],
        'credits'      => (int) $course['credits'],
        'status'       => $course['status'],
        'teacher_id'   => $course['teacher_id'] !== null ? (int) $course['teacher_id'] : null,
        'teacher_name' => $course['teacher_name'],
        'created_at'   => $course['created_at'],
        'modules'      => $modules,
        'students'     => $students,
    ]);
}

function handleGetStudentCourseView(PDO $pdo, int $courseId): never
{
    $auth = requireRole(['estudiante']);
    $studentId = (int) $auth['sub'];

    $stmt = $pdo->prepare(
        'SELECT c.id, c.code, c.title, c.career, c.description, c.credits, c.status,
                u.name AS teacher_name, e.cycle, e.status AS enrollment_status, e.final_grade
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE e.course_id = :cid AND e.student_id = :sid
         ORDER BY e.id DESC
         LIMIT 1'
    );
    $stmt->execute(['cid' => $courseId, 'sid' => $studentId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(['error' => 'No estás matriculado en este curso.'], 403);
    }

    $modStmt = $pdo->prepare(
        'SELECT id, title, hours, sort_order
         FROM course_modules
         WHERE course_id = :cid
         ORDER BY sort_order ASC, id ASC'
    );
    $modStmt->execute(['cid' => $courseId]);
    $modules = array_map(static fn(array $m): array => [
        'id'         => (int) $m['id'],
        'title'      => $m['title'],
        'hours'      => (int) $m['hours'],
        'sort_order' => (int) $m['sort_order'],
    ], $modStmt->fetchAll());

    $attStmt = $pdo->prepare(
        'SELECT session_date, status
         FROM course_attendance
         WHERE course_id = :cid AND student_id = :sid
         ORDER BY session_date DESC'
    );
    $attStmt->execute(['cid' => $courseId, 'sid' => $studentId]);
    $attRows = $attStmt->fetchAll();

    $presentCount = 0;
    $lateCount = 0;
    $absentCount = 0;
    $records = array_map(static function (array $r) use (&$presentCount, &$lateCount, &$absentCount): array {
        $st = (string) $r['status'];
        if ($st === 'present') {
            $presentCount++;
        } elseif ($st === 'late') {
            $lateCount++;
        } else {
            $absentCount++;
        }
        return [
            'session_date' => $r['session_date'],
            'status'       => $st,
        ];
    }, $attRows);

    $totalSessions = count($records);
    $attendancePct = $totalSessions > 0
        ? round((($presentCount + $lateCount) / $totalSessions) * 100, 1)
        : 100.0;

    $evStmt = $pdo->prepare(
        'SELECT id, event_date, event_time, title, tag, tone
         FROM agenda_events
         WHERE event_date >= CURDATE() AND tag = :code
         ORDER BY event_date ASC, id ASC
         LIMIT 10'
    );
    $evStmt->execute(['code' => $row['code']]);
    $events = array_map(static fn(array $e): array => [
        'id'         => (int) $e['id'],
        'event_date' => $e['event_date'],
        'event_time' => $e['event_time'],
        'title'      => $e['title'],
        'tag'        => $e['tag'],
        'tone'       => $e['tone'],
    ], $evStmt->fetchAll());

    jsonResponse([
        'id'              => (int) $row['id'],
        'code'            => $row['code'],
        'title'           => $row['title'],
        'career'          => $row['career'],
        'description'     => $row['description'],
        'credits'         => (int) $row['credits'],
        'status'          => $row['status'],
        'teacher_name'    => $row['teacher_name'],
        'enrollment'      => [
            'cycle'       => $row['cycle'],
            'status'      => $row['enrollment_status'],
            'final_grade' => $row['final_grade'] !== null ? (float) $row['final_grade'] : null,
        ],
        'modules'         => $modules,
        'attendance'      => [
            'attendance_pct' => $attendancePct,
            'total_sessions' => $totalSessions,
            'present_count'  => $presentCount,
            'late_count'     => $lateCount,
            'absent_count'   => $absentCount,
            'records'        => $records,
        ],
        'upcoming_events' => $events,
    ]);
}
