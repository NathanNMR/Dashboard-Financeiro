<?php
/**
 * GET    /api/credit-cards.php?account_id=...             → lista cartões
 * POST   /api/credit-cards.php  { account_id, ...card }   → cria
 * DELETE /api/credit-cards.php  { account_id, id }         → apaga
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

function row_to_card(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'limit' => (float) $row['credit_limit'],
        'closingDay' => (int) $row['closing_day'],
        'dueDay' => (int) $row['due_day'],
        'color' => $row['color'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM credit_cards WHERE account_id = ? ORDER BY created_at DESC');
    $stmt->execute([$accountId]);
    json_response(['cards' => array_map('row_to_card', $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id', 'name', 'limit', 'closingDay', 'dueDay']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $id = $body['id'] ?? uuid();
    $pdo->prepare(
        'INSERT INTO credit_cards (id, account_id, name, credit_limit, closing_day, due_day, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$id, $accountId, $body['name'], $body['limit'], $body['closingDay'], $body['dueDay'], $body['color'] ?? null]);

    json_response(['id' => $id], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id', 'id']);
    require_account_member($userId, (string) $body['account_id']);

    $stmt = $pdo->prepare('DELETE FROM credit_cards WHERE id = ? AND account_id = ?');
    $stmt->execute([$body['id'], $body['account_id']]);
    if ($stmt->rowCount() === 0) {
        json_error('Cartão não encontrado.', 404);
    }
    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
