<?php

declare(strict_types=1);

/**
 * Codifica una cadena en formato Base64URL (RFC 7515).
 */
function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Decodifica una cadena Base64URL.
 */
function base64UrlDecode(string $data): string|false
{
    $remainder = strlen($data) % 4;
    if ($remainder !== 0) {
        $data .= str_repeat('=', 4 - $remainder);
    }

    return base64_decode(strtr($data, '-_', '+/'), true);
}

/**
 * Genera un JWT firmado con HMAC-SHA256 (HS256).
 */
function jwtEncode(array $payload, string $secret): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];

    $headerEncoded  = base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
    $payloadEncoded = base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));

    $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
    $signatureEncoded = base64UrlEncode($signature);

    return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
}

/**
 * Valida la firma HS256 y la expiración (exp) de un JWT.
 * Retorna el payload decodificado o null si es inválido o expiró.
 */
function jwtDecode(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

    $headerJson = base64UrlDecode($headerEncoded);
    $payloadJson = base64UrlDecode($payloadEncoded);
    $signature = base64UrlDecode($signatureEncoded);

    if ($headerJson === false || $payloadJson === false || $signature === false) {
        return null;
    }

    $header = json_decode($headerJson, true);
    $payload = json_decode($payloadJson, true);

    if (!is_array($header) || !is_array($payload)) {
        return null;
    }

    if (($header['alg'] ?? '') !== 'HS256') {
        return null;
    }

    $expectedSignature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
    if (!hash_equals($expectedSignature, $signature)) {
        return null;
    }

    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        return null;
    }

    return $payload;
}
