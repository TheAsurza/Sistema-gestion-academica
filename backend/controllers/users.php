<?php

declare(strict_types=1);

// ============================================================================
// HANDLERS DE USUARIOS, PROFESORES, ALUMNOS Y ADMINISTRATIVOS
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

function generateUniqueUserCode(PDO $pdo, string $role): string
{
    $prefixMap = [
        'admin'      => 'ADM',
        'profesor'   => 'DOC',
        'estudiante' => 'ALU',
    ];
    $tag = $prefixMap[$role] ?? 'USR';
    $year = date('Y');
    $likePattern = "{$tag}-{$year}-%";

    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(user_code, '-', -1) AS UNSIGNED)), 0) AS max_seq
         FROM users
         WHERE user_code LIKE :pattern"
    );
    $stmt->execute(['pattern' => $likePattern]);
    $nextSeq = ((int) $stmt->fetchColumn()) + 1;

    do {
        $candidate = sprintf('%s-%s-%04d', $tag, $year, $nextSeq);
        $existsStmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE user_code = :code');
        $existsStmt->execute(['code' => $candidate]);
        $exists = ((int) $existsStmt->fetchColumn()) > 0;
        if ($exists) {
            $nextSeq++;
        }
    } while ($exists);

    return $candidate;
}

function handleGetUsers(PDO $pdo): never
{
    requireRole(['admin']);
    $roleFilter = isset($_GET['role']) ? trim((string) $_GET['role']) : '';

    if ($roleFilter !== '' && in_array($roleFilter, ['admin', 'profesor', 'estudiante'], true)) {
        $stmt = $pdo->prepare('SELECT id, user_code, name, email, role, career, phone, address, created_at FROM users WHERE role = :role ORDER BY id DESC');
        $stmt->execute(['role' => $roleFilter]);
    } else {
        $stmt = $pdo->query('SELECT id, user_code, name, email, role, career, phone, address, created_at FROM users ORDER BY id DESC');
    }

    $users = array_map(static fn(array $u): array => [
        'id'         => (int) $u['id'],
        'user_code'  => $u['user_code'],
        'name'       => $u['name'],
        'email'      => $u['email'],
        'role'       => $u['role'],
        'career'     => $u['career'],
        'phone'      => $u['phone'],
        'address'    => $u['address'],
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
    $career = trim((string) ($body['career'] ?? '')) ?: null;
    $phone = trim((string) ($body['phone'] ?? '')) ?: null;
    $address = trim((string) ($body['address'] ?? '')) ?: null;

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

    $userCode = generateUniqueUserCode($pdo, $role);

    $stmt = $pdo->prepare(
        'INSERT INTO users (user_code, name, email, password_hash, role, career, phone, address)
         VALUES (:user_code, :name, :email, :password_hash, :role, :career, :phone, :address)'
    );
    $stmt->execute([
        'user_code'     => $userCode,
        'name'          => $name,
        'email'         => $email,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role'          => $role,
        'career'        => $role === 'estudiante' ? $career : null,
        'phone'         => $phone,
        'address'       => $address,
    ]);

    $id = (int) $pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT id, user_code, name, email, role, career, phone, address, created_at FROM users WHERE id = :id');
    $fetch->execute(['id' => $id]);
    $created = $fetch->fetch();

    jsonResponse([
        'id'         => (int) $created['id'],
        'user_code'  => $created['user_code'],
        'name'       => $created['name'],
        'email'      => $created['email'],
        'role'       => $created['role'],
        'career'     => $created['career'],
        'phone'      => $created['phone'],
        'address'    => $created['address'],
        'created_at' => $created['created_at'],
    ], 201);
}

function handleUpdateUser(PDO $pdo, int $userId): never
{
    requireRole(['admin']);
    $existingStmt = $pdo->prepare('SELECT id, role, user_code FROM users WHERE id = :id LIMIT 1');
    $existingStmt->execute(['id' => $userId]);
    $existingUser = $existingStmt->fetch();
    if (!$existingUser) {
        jsonResponse(['error' => 'Usuario no encontrado.'], 404);
    }

    $body = getJsonBody();
    $name = trim((string) ($body['name'] ?? ''));
    $email = trim((string) ($body['email'] ?? ''));
    $role = (string) ($body['role'] ?? 'estudiante');
    $password = (string) ($body['password'] ?? '');
    $career = trim((string) ($body['career'] ?? '')) ?: null;
    $phone = trim((string) ($body['phone'] ?? '')) ?: null;
    $address = trim((string) ($body['address'] ?? '')) ?: null;

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

    $userCode = ($existingUser['role'] !== $role || empty($existingUser['user_code']))
        ? generateUniqueUserCode($pdo, $role)
        : (string) $existingUser['user_code'];

    if ($password !== '') {
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'La nueva contraseña debe tener al menos 6 caracteres.'], 400);
        }
        $stmt = $pdo->prepare(
            'UPDATE users SET user_code = :user_code, name = :name, email = :email, role = :role, career = :career, phone = :phone, address = :address, password_hash = :password_hash WHERE id = :id'
        );
        $stmt->execute([
            'user_code'     => $userCode,
            'name'          => $name,
            'email'         => $email,
            'role'          => $role,
            'career'        => $role === 'estudiante' ? $career : null,
            'phone'         => $phone,
            'address'       => $address,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'id'            => $userId,
        ]);
    } else {
        $stmt = $pdo->prepare('UPDATE users SET user_code = :user_code, name = :name, email = :email, role = :role, career = :career, phone = :phone, address = :address WHERE id = :id');
        $stmt->execute([
            'user_code' => $userCode,
            'name'      => $name,
            'email'     => $email,
            'role'      => $role,
            'career'    => $role === 'estudiante' ? $career : null,
            'phone'     => $phone,
            'address'   => $address,
            'id'        => $userId,
        ]);
    }

    $fetch = $pdo->prepare('SELECT id, user_code, name, email, role, career, phone, address, created_at FROM users WHERE id = :id');
    $fetch->execute(['id' => $userId]);
    $updated = $fetch->fetch();

    jsonResponse([
        'id'         => (int) $updated['id'],
        'user_code'  => $updated['user_code'],
        'name'       => $updated['name'],
        'email'      => $updated['email'],
        'role'       => $updated['role'],
        'career'     => $updated['career'],
        'phone'      => $updated['phone'],
        'address'    => $updated['address'],
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

function handleGetTeachers(PDO $pdo): never
{
    requireRole(['admin']);

    $sql = "SELECT u.id, u.user_code, u.name, u.email, u.phone, u.address, u.created_at,
                   GROUP_CONCAT(DISTINCT CONCAT(c.code, ' - ', c.title) ORDER BY c.code SEPARATOR ', ') AS courses_summary,
                   COUNT(DISTINCT cm.id) AS assigned_classes
            FROM users u
            LEFT JOIN courses c ON c.teacher_id = u.id
            LEFT JOIN course_modules cm ON cm.course_id = c.id
            WHERE u.role = 'profesor'
            GROUP BY u.id, u.user_code, u.name, u.email, u.phone, u.address, u.created_at
            ORDER BY u.id DESC";

    $rows = $pdo->query($sql)->fetchAll();
    $teachers = array_map(static fn(array $r): array => [
        'id'               => (int) $r['id'],
        'user_code'        => $r['user_code'],
        'name'             => $r['name'],
        'email'            => $r['email'],
        'phone'            => $r['phone'],
        'address'          => $r['address'],
        'courses_summary'  => $r['courses_summary'] ?: 'Sin cursos asignados',
        'assigned_classes' => (int) $r['assigned_classes'],
        'created_at'       => $r['created_at'],
    ], $rows);

    jsonResponse($teachers);
}

function handleGetStudents(PDO $pdo): never
{
    requireRole(['admin']);

    $studentsRows = $pdo->query(
        "SELECT id, user_code, name, email, career, phone, address, created_at
         FROM users
         WHERE role = 'estudiante'
         ORDER BY id DESC"
    )->fetchAll();

    $enrollRows = $pdo->query(
        "SELECT e.id AS enrollment_id, e.student_id, e.course_id, e.cycle,
                c.code, c.title, c.credits, t.name AS teacher_name
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         LEFT JOIN users t ON t.id = c.teacher_id
         WHERE e.status = 'enrolled' AND c.status = 'active'
         ORDER BY c.code ASC"
    )->fetchAll();

    $activeByStudent = [];
    foreach ($enrollRows as $er) {
        $sid = (int) $er['student_id'];
        $activeByStudent[$sid][] = [
            'enrollment_id' => (int) $er['enrollment_id'],
            'course_id'     => (int) $er['course_id'],
            'code'          => $er['code'],
            'title'         => $er['title'],
            'cycle'         => $er['cycle'],
            'credits'       => (int) $er['credits'],
            'teacher_name'  => $er['teacher_name'],
        ];
    }

    $students = array_map(static function (array $s) use ($activeByStudent): array {
        $sid = (int) $s['id'];
        return [
            'id'             => $sid,
            'user_code'      => $s['user_code'],
            'name'           => $s['name'],
            'email'          => $s['email'],
            'career'         => $s['career'],
            'phone'          => $s['phone'],
            'address'        => $s['address'],
            'created_at'     => $s['created_at'],
            'active_courses' => $activeByStudent[$sid] ?? [],
        ];
    }, $studentsRows);

    jsonResponse($students);
}

function handleGetStaff(PDO $pdo): never
{
    requireRole(['admin']);

    $rows = $pdo->query(
        "SELECT id, user_code, name, email, phone, address, created_at
         FROM users
         WHERE role = 'admin'
         ORDER BY id DESC"
    )->fetchAll();

    $staff = array_map(static fn(array $r): array => [
        'id'         => (int) $r['id'],
        'user_code'  => $r['user_code'],
        'name'       => $r['name'],
        'email'      => $r['email'],
        'phone'      => $r['phone'],
        'address'    => $r['address'],
        'created_at' => $r['created_at'],
    ], $rows);

    jsonResponse($staff);
}
