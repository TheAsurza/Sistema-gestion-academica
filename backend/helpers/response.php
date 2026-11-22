<?php

declare(strict_types=1);

/**
 * Envía cabeceras CORS y responde 204 inmediatamente ante peticiones OPTIONS preflight.
 */
function sendCorsHeaders(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Envía una respuesta JSON con código HTTP y finaliza la ejecución.
 */
function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Lee y decodifica el cuerpo JSON de la petición actual.
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Extrae el token Bearer del encabezado Authorization.
 */
function getBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;

    if ($header === null && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strcasecmp((string) $key, 'Authorization') === 0) {
                $header = (string) $value;
                break;
            }
        }
    }

    if (!is_string($header) || !preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
        return null;
    }

    return trim($matches[1]);
}

/**
 * Valida que la petición incluya un JWT vigente. Retorna el payload o responde 401.
 */
function requireAuth(): array
{
    $token = getBearerToken();
    if ($token === null) {
        jsonResponse(['error' => 'No autorizado. Token no proporcionado.'], 401);
    }

    $payload = jwtDecode($token, JWT_SECRET);
    if ($payload === null) {
        jsonResponse(['error' => 'No autorizado. Token inválido o expirado.'], 401);
    }

    return $payload;
}

/**
 * Valida autenticación JWT y verifica que el rol del usuario esté permitido (403 si no).
 *
 * @param string[] $roles
 */
function requireRole(array $roles): array
{
    $payload = requireAuth();
    $role = (string) ($payload['role'] ?? '');

    if (!in_array($role, $roles, true)) {
        jsonResponse(['error' => 'Acceso denegado. No tiene permisos para esta acción.'], 403);
    }

    return $payload;
}
