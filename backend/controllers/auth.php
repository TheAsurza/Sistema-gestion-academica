<?php

declare(strict_types=1);

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

    $stmt = $pdo->prepare(
        'SELECT id, user_code, name, email, password_hash, role, career
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        jsonResponse(['error' => 'Credenciales inválidas.'], 401);
    }

    $now = time();
    $payload = [
        'sub'       => (int) $user['id'],
        'user_code' => $user['user_code'],
        'name'      => $user['name'],
        'email'     => $user['email'],
        'role'      => $user['role'],
        'career'    => $user['career'],
        'iat'       => $now,
        'exp'       => $now + JWT_TTL_SECONDS,
    ];

    $token = jwtEncode($payload, JWT_SECRET);

    jsonResponse([
        'token' => $token,
        'user'  => [
            'id'        => (int) $user['id'],
            'user_code' => $user['user_code'],
            'name'      => $user['name'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'career'    => $user['career'],
        ],
    ]);
}
