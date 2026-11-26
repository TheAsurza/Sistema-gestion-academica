<?php

declare(strict_types=1);

// ============================================================================
// HANDLER DE REPORTES (ADMIN Y PROFESOR)
// ============================================================================

function handleGetReportsSummary(PDO $pdo): never
{
    $auth = requireRole(['admin', 'profesor']);
    $isTeacher = $auth['role'] === 'profesor';
    $teacherId = (int) $auth['sub'];

    $usersByRole = ['admin' => 0, 'profesor' => 0, 'estudiante' => 0, 'total' => 0];
    if (!$isTeacher) {
        foreach ($pdo->query('SELECT role, COUNT(*) AS total FROM users GROUP BY role')->fetchAll() as $row) {
            $role = (string) $row['role'];
            $count = (int) $row['total'];
            if (array_key_exists($role, $usersByRole)) {
                $usersByRole[$role] = $count;
            }
            $usersByRole['total'] += $count;
        }
    }

    $coursesByStatus = ['active' => 0, 'draft' => 0, 'inactive' => 0, 'total' => 0];
    $courseStatusStmt = $isTeacher
        ? $pdo->prepare('SELECT status, COUNT(*) AS total FROM courses WHERE teacher_id = :tid GROUP BY status')
        : $pdo->query('SELECT status, COUNT(*) AS total FROM courses GROUP BY status');
    if ($isTeacher) {
        $courseStatusStmt->execute(['tid' => $teacherId]);
    }
    foreach ($courseStatusStmt->fetchAll() as $row) {
        $status = (string) $row['status'];
        $count = (int) $row['total'];
        if (array_key_exists($status, $coursesByStatus)) {
            $coursesByStatus[$status] = $count;
        }
        $coursesByStatus['total'] += $count;
    }

    $enrollments = ['enrolled' => 0, 'completed' => 0, 'total' => 0];
    $enrollStmt = $isTeacher
        ? $pdo->prepare(
            'SELECT e.status, COUNT(*) AS total
             FROM enrollments e
             INNER JOIN courses c ON c.id = e.course_id
             WHERE c.teacher_id = :tid
             GROUP BY e.status'
        )
        : $pdo->query('SELECT status, COUNT(*) AS total FROM enrollments GROUP BY status');
    if ($isTeacher) {
        $enrollStmt->execute(['tid' => $teacherId]);
    }
    foreach ($enrollStmt->fetchAll() as $row) {
        $status = (string) $row['status'];
        $count = (int) $row['total'];
        if (array_key_exists($status, $enrollments)) {
            $enrollments[$status] = $count;
        }
        $enrollments['total'] += $count;
    }

    if ($isTeacher) {
        $hoursStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(cm.hours), 0)
             FROM course_modules cm
             INNER JOIN courses c ON c.id = cm.course_id
             WHERE c.teacher_id = :tid'
        );
        $hoursStmt->execute(['tid' => $teacherId]);
        $totalPlannedHours = (int) ($hoursStmt->fetchColumn() ?: 0);
        $unassignedCourses = 0;

        $gradeStmt = $pdo->prepare(
            "SELECT COUNT(*) AS completed_total,
                    SUM(CASE WHEN e.final_grade >= 13.0 THEN 1 ELSE 0 END) AS passed_total,
                    AVG(e.final_grade) AS avg_grade
             FROM enrollments e
             INNER JOIN courses c ON c.id = e.course_id
             WHERE c.teacher_id = :tid AND e.status = 'completed' AND e.final_grade IS NOT NULL"
        );
        $gradeStmt->execute(['tid' => $teacherId]);
        $gradeRow = $gradeStmt->fetch();
    } else {
        $totalPlannedHours = (int) ($pdo->query('SELECT COALESCE(SUM(hours), 0) FROM course_modules')->fetchColumn() ?: 0);
        $unassignedCourses = (int) ($pdo->query('SELECT COUNT(*) FROM courses WHERE teacher_id IS NULL')->fetchColumn() ?: 0);

        $gradeRow = $pdo->query(
            "SELECT COUNT(*) AS completed_total,
                    SUM(CASE WHEN final_grade >= 13.0 THEN 1 ELSE 0 END) AS passed_total,
                    AVG(final_grade) AS avg_grade
             FROM enrollments
             WHERE status = 'completed' AND final_grade IS NOT NULL"
        )->fetch();
    }

    $completedTotal = (int) ($gradeRow['completed_total'] ?? 0);
    $passedTotal = (int) ($gradeRow['passed_total'] ?? 0);
    $approvalRate = $completedTotal > 0 ? round(($passedTotal / $completedTotal) * 100, 1) : 0.0;
    $averageGrade = $gradeRow['avg_grade'] !== null ? round((float) $gradeRow['avg_grade'], 2) : null;

    $perfSql = "SELECT c.id, c.code, c.title, c.career, u.name AS teacher_name,
                       COUNT(DISTINCT CASE WHEN e.status = 'enrolled' THEN e.id END) AS enrolled_count,
                       COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS completed_count,
                       AVG(CASE WHEN e.status = 'completed' THEN e.final_grade END) AS avg_grade,
                       SUM(CASE WHEN e.status = 'completed' AND e.final_grade >= 13.0 THEN 1 ELSE 0 END) AS passed_count
                FROM courses c
                LEFT JOIN users u ON u.id = c.teacher_id
                LEFT JOIN enrollments e ON e.course_id = c.id "
        . ($isTeacher ? 'WHERE c.teacher_id = :tid ' : '')
        . 'GROUP BY c.id, c.code, c.title, c.career, u.name
           ORDER BY c.code ASC';

    if ($isTeacher) {
        $perfStmt = $pdo->prepare($perfSql);
        $perfStmt->execute(['tid' => $teacherId]);
        $perfRows = $perfStmt->fetchAll();
    } else {
        $perfRows = $pdo->query($perfSql)->fetchAll();
    }

    $coursePerformance = array_map(static function (array $r): array {
        $comp = (int) $r['completed_count'];
        $passed = (int) $r['passed_count'];
        return [
            'id'              => (int) $r['id'],
            'code'            => $r['code'],
            'title'           => $r['title'],
            'career'          => $r['career'],
            'teacher_name'    => $r['teacher_name'] ?: 'Sin asignar',
            'enrolled_count'  => (int) $r['enrolled_count'],
            'completed_count' => $comp,
            'average_grade'   => $r['avg_grade'] !== null ? round((float) $r['avg_grade'], 2) : null,
            'approval_rate'   => $comp > 0 ? round(($passed / $comp) * 100, 1) : null,
        ];
    }, $perfRows);

    $workloadRows = $pdo->query(
        "SELECT u.id, u.name,
                COUNT(DISTINCT c.id) AS courses_count,
                COUNT(DISTINCT cm.id) AS modules_count,
                COALESCE(SUM(cm.hours), 0) AS total_hours
         FROM users u
         LEFT JOIN courses c ON c.teacher_id = u.id
         LEFT JOIN course_modules cm ON cm.course_id = c.id
         WHERE u.role = 'profesor'
         GROUP BY u.id, u.name
         ORDER BY total_hours DESC, u.name ASC"
    )->fetchAll();

    $teacherWorkload = array_map(static fn(array $w): array => [
        'id'            => (int) $w['id'],
        'name'          => $w['name'],
        'courses_count' => (int) $w['courses_count'],
        'modules_count' => (int) $w['modules_count'],
        'total_hours'   => (int) $w['total_hours'],
    ], $workloadRows);

    jsonResponse([
        'users_by_role'      => $usersByRole,
        'courses_by_status'  => $coursesByStatus,
        'enrollments'        => $enrollments,
        'total_users'        => $usersByRole['total'],
        'total_courses'      => $coursesByStatus['total'],
        'total_enrollments'  => $enrollments['total'],
        'academic_kpis'      => [
            'approval_rate'       => $approvalRate,
            'average_grade'       => $averageGrade,
            'total_planned_hours' => $totalPlannedHours,
            'unassigned_courses'  => $unassignedCourses,
        ],
        'course_performance' => $coursePerformance,
        'teacher_workload'   => $teacherWorkload,
    ]);
}
