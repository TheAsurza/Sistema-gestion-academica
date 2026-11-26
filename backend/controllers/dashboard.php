<?php

declare(strict_types=1);

// ============================================================================
// HANDLERS DE AGENDA Y AVISOS DEL DASHBOARD
// ============================================================================

function handleGetAgenda(PDO $pdo): never
{
    requireAuth();

    $showAll = isset($_GET['all']) && $_GET['all'] === '1';
    $sql = $showAll
        ? 'SELECT id, event_date, event_time, title, tag, tone
           FROM agenda_events
           ORDER BY event_date ASC, id ASC
           LIMIT 50'
        : 'SELECT id, event_date, event_time, title, tag, tone
           FROM agenda_events
           WHERE event_date >= CURDATE()
           ORDER BY event_date ASC, id ASC
           LIMIT 3';

    $stmt = $pdo->query($sql);

    $events = array_map(static fn(array $e): array => [
        'id'         => (int) $e['id'],
        'event_date' => $e['event_date'],
        'event_time' => $e['event_time'],
        'title'      => $e['title'],
        'tag'        => $e['tag'],
        'tone'       => $e['tone'],
    ], $stmt->fetchAll());

    jsonResponse($events);
}

function handleCreateAgendaEvent(PDO $pdo): never
{
    requireRole(['admin', 'profesor']);
    $body = getJsonBody();

    $eventDate = trim((string) ($body['event_date'] ?? ''));
    $eventTime = trim((string) ($body['event_time'] ?? ''));
    $title = trim((string) ($body['title'] ?? ''));
    $tag = trim((string) ($body['tag'] ?? 'General'));
    $tone = trim((string) ($body['tone'] ?? 'violet'));

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate) || $eventTime === '' || $title === '') {
        jsonResponse(['error' => 'Fecha, hora y título de la actividad son obligatorios.'], 400);
    }

    if (!in_array($tone, ['violet', 'amber', 'mint'], true)) {
        $tone = 'violet';
    }

    $stmt = $pdo->prepare(
        'INSERT INTO agenda_events (event_date, event_time, title, tag, tone)
         VALUES (:event_date, :event_time, :title, :tag, :tone)'
    );
    $stmt->execute([
        'event_date' => $eventDate,
        'event_time' => $eventTime,
        'title'      => $title,
        'tag'        => $tag !== '' ? $tag : 'General',
        'tone'       => $tone,
    ]);

    jsonResponse([
        'id'         => (int) $pdo->lastInsertId(),
        'event_date' => $eventDate,
        'event_time' => $eventTime,
        'title'      => $title,
        'tag'        => $tag !== '' ? $tag : 'General',
        'tone'       => $tone,
    ], 201);
}

function handleDeleteAgendaEvent(PDO $pdo, int $eventId): never
{
    requireRole(['admin', 'profesor']);

    $stmt = $pdo->prepare('DELETE FROM agenda_events WHERE id = :id');
    $stmt->execute(['id' => $eventId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Actividad no encontrada.'], 404);
    }

    http_response_code(204);
    exit;
}

function handleGetNotices(PDO $pdo): never
{
    requireAuth();

    $stmt = $pdo->query(
        'SELECT id, title, summary, author, category, published_at
         FROM notices
         ORDER BY published_at DESC, id DESC
         LIMIT 5'
    );

    $notices = array_map(static fn(array $n): array => [
        'id'           => (int) $n['id'],
        'title'        => $n['title'],
        'summary'      => $n['summary'],
        'author'       => $n['author'],
        'category'     => $n['category'],
        'published_at' => $n['published_at'],
    ], $stmt->fetchAll());

    jsonResponse($notices);
}
