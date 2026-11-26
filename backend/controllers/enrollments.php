<?php

declare(strict_types=1);

// ============================================================================
// HANDLERS DE MATRÍCULAS, HISTORIAL Y CALIFICACIONES
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

function handleCreateEnrollment(PDO $pdo): never
{
    requireRole(['admin']);
    $input = getJsonBody();

    $studentId = (int) ($input['student_id'] ?? 0);
    $courseId  = (int) ($input['course_id'] ?? 0);
    $cycle     = trim((string) ($input['cycle'] ?? '2026-II'));
    if ($cycle === '') {
        $cycle = '2026-II';
    }

    if ($studentId <= 0 || $courseId <= 0) {
        jsonResponse(['error' => 'Debes seleccionar un alumno y un curso válidos.'], 422);
    }

    $studentStmt = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role = 'estudiante'");
    $studentStmt->execute(['id' => $studentId]);
    if (!$studentStmt->fetch()) {
        jsonResponse(['error' => 'Alumno no encontrado.'], 404);
    }

    $courseStmt = $pdo->prepare(
        "SELECT c.id, c.code, c.title, c.credits, t.name AS teacher_name
         FROM courses c
         LEFT JOIN users t ON t.id = c.teacher_id
         WHERE c.id = :id AND c.status = 'active'"
    );
    $courseStmt->execute(['id' => $courseId]);
    $course = $courseStmt->fetch();
    if (!$course) {
        jsonResponse(['error' => 'Curso activo no encontrado.'], 404);
    }

    $dupStmt = $pdo->prepare(
        'SELECT id FROM enrollments
         WHERE student_id = :studentId AND course_id = :courseId AND cycle = :cycle'
    );
    $dupStmt->execute([
        'studentId' => $studentId,
        'courseId'  => $courseId,
        'cycle'     => $cycle,
    ]);
    if ($dupStmt->fetch()) {
        jsonResponse(['error' => 'El alumno ya se encuentra matriculado en ese curso para el ciclo seleccionado.'], 409);
    }

    $insertStmt = $pdo->prepare(
        "INSERT INTO enrollments (student_id, course_id, cycle, status, final_grade)
         VALUES (:studentId, :courseId, :cycle, 'enrolled', NULL)"
    );
    $insertStmt->execute([
        'studentId' => $studentId,
        'courseId'  => $courseId,
        'cycle'     => $cycle,
    ]);

    jsonResponse([
        'enrollment_id' => (int) $pdo->lastInsertId(),
        'course_id'     => (int) $course['id'],
        'code'          => $course['code'],
        'title'         => $course['title'],
        'cycle'         => $cycle,
        'credits'       => (int) $course['credits'],
        'teacher_name'  => $course['teacher_name'],
    ], 201);
}

function handleDeleteEnrollment(PDO $pdo, int $enrollmentId): never
{
    requireRole(['admin']);

    $stmt = $pdo->prepare("DELETE FROM enrollments WHERE id = :id AND status = 'enrolled'");
    $stmt->execute(['id' => $enrollmentId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Matrícula activa no encontrada.'], 404);
    }

    http_response_code(204);
    exit;
}

function handleUpdateEnrollmentGrade(PDO $pdo, int $enrollmentId): never
{
    $auth = requireRole(['admin', 'profesor']);
    $body = getJsonBody();

    $stmt = $pdo->prepare(
        'SELECT e.id, e.course_id, c.teacher_id
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         WHERE e.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $enrollmentId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(['error' => 'Matrícula no encontrada.'], 404);
    }

    if ($auth['role'] === 'profesor' && (int) $row['teacher_id'] !== (int) $auth['sub']) {
        jsonResponse(['error' => 'No tienes permiso para calificar en este curso.'], 403);
    }

    $rawGrade = $body['final_grade'] ?? null;
    $grade = ($rawGrade === null || $rawGrade === '') ? null : (float) $rawGrade;
    if ($grade !== null && ($grade < 0.0 || $grade > 20.0)) {
        jsonResponse(['error' => 'La nota debe estar entre 0 y 20.'], 400);
    }

    $status = trim((string) ($body['status'] ?? ($grade !== null ? 'completed' : 'enrolled')));
    if (!in_array($status, ['enrolled', 'completed'], true)) {
        jsonResponse(['error' => 'Estado de matrícula inválido.'], 400);
    }

    $upd = $pdo->prepare(
        'UPDATE enrollments
         SET final_grade = :grade, status = :status
         WHERE id = :id'
    );
    $upd->execute([
        'grade'  => $grade,
        'status' => $status,
        'id'     => $enrollmentId,
    ]);

    jsonResponse([
        'enrollment_id' => $enrollmentId,
        'final_grade'   => $grade,
        'status'        => $status,
    ]);
}
