<?php

declare(strict_types=1);

// ============================================================================
// HANDLERS DE ASISTENCIA SEMANAL Y POR CURSO
// ============================================================================

function handleGetWeeklyAttendance(PDO $pdo): never
{
    requireRole(['admin', 'profesor']);

    $stmt = $pdo->query(
        'SELECT id, day_label, day_order, present_pct, absent_pct
         FROM attendance_stats
         ORDER BY day_order ASC'
    );

    $stats = array_map(static fn(array $s): array => [
        'id'          => (int) $s['id'],
        'day_label'   => $s['day_label'],
        'day_order'   => (int) $s['day_order'],
        'present_pct' => (int) $s['present_pct'],
        'absent_pct'  => (int) $s['absent_pct'],
    ], $stmt->fetchAll());

    jsonResponse($stats);
}

function handleGetCourseAttendance(PDO $pdo, int $courseId): never
{
    assertCourseManageAccess($pdo, $courseId);

    $date = trim((string) ($_GET['date'] ?? date('Y-m-d')));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $date = date('Y-m-d');
    }

    $stuStmt = $pdo->prepare(
        "SELECT DISTINCT u.id AS student_id, u.user_code, u.name
         FROM enrollments e
         INNER JOIN users u ON u.id = e.student_id
         WHERE e.course_id = :cid AND e.status = 'enrolled'
         ORDER BY u.name ASC"
    );
    $stuStmt->execute(['cid' => $courseId]);
    $enrolledStudents = $stuStmt->fetchAll();

    $dayStmt = $pdo->prepare(
        'SELECT student_id, status
         FROM course_attendance
         WHERE course_id = :cid AND session_date = :session_date'
    );
    $dayStmt->execute(['cid' => $courseId, 'session_date' => $date]);
    $statusByStudent = [];
    foreach ($dayStmt->fetchAll() as $dr) {
        $statusByStudent[(int) $dr['student_id']] = $dr['status'];
    }

    $pctStmt = $pdo->prepare(
        "SELECT student_id,
                COUNT(*) AS total_sessions,
                SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended_sessions
         FROM course_attendance
         WHERE course_id = :cid
         GROUP BY student_id"
    );
    $pctStmt->execute(['cid' => $courseId]);
    $pctByStudent = [];
    foreach ($pctStmt->fetchAll() as $pr) {
        $total = (int) $pr['total_sessions'];
        $attended = (int) $pr['attended_sessions'];
        $pctByStudent[(int) $pr['student_id']] = $total > 0 ? round(($attended / $total) * 100, 1) : 100.0;
    }

    $sessionsStmt = $pdo->prepare(
        'SELECT DISTINCT session_date
         FROM course_attendance
         WHERE course_id = :cid
         ORDER BY session_date DESC
         LIMIT 15'
    );
    $sessionsStmt->execute(['cid' => $courseId]);
    $sessions = array_map(static fn(array $s): string => (string) $s['session_date'], $sessionsStmt->fetchAll());

    $records = array_map(static function (array $s) use ($statusByStudent, $pctByStudent): array {
        $sid = (int) $s['student_id'];
        return [
            'student_id'     => $sid,
            'user_code'      => $s['user_code'],
            'name'           => $s['name'],
            'status'         => $statusByStudent[$sid] ?? 'present',
            'attendance_pct' => $pctByStudent[$sid] ?? 100.0,
        ];
    }, $enrolledStudents);

    jsonResponse([
        'date'     => $date,
        'sessions' => $sessions,
        'records'  => $records,
    ]);
}

function handleSaveCourseAttendance(PDO $pdo, int $courseId): never
{
    assertCourseManageAccess($pdo, $courseId);
    $body = getJsonBody();

    $date = trim((string) ($body['date'] ?? date('Y-m-d')));
    $records = $body['records'] ?? [];

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !is_array($records)) {
        jsonResponse(['error' => 'Fecha o lista de asistencia inválida.'], 400);
    }

    $upsert = $pdo->prepare(
        'INSERT INTO course_attendance (course_id, student_id, session_date, status)
         VALUES (:cid, :sid, :sdate, :status)
         ON DUPLICATE KEY UPDATE status = VALUES(status)'
    );

    foreach ($records as $rec) {
        $sid = (int) ($rec['student_id'] ?? 0);
        $status = (string) ($rec['status'] ?? 'present');
        if ($sid <= 0 || !in_array($status, ['present', 'late', 'absent'], true)) {
            continue;
        }
        $upsert->execute([
            'cid'    => $courseId,
            'sid'    => $sid,
            'sdate'  => $date,
            'status' => $status,
        ]);
    }

    jsonResponse(['message' => 'Asistencia guardada correctamente.', 'date' => $date]);
}
