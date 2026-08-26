<?php
/**
 * GET    /api/goals.php?account_id=...               → lista metas
 * POST   /api/goals.php  { account_id, ...goal }      → cria
 * PUT    /api/goals.php  { account_id, id, currentAmount } → atualiza aporte
 * DELETE /api/goals.php  { account_id, id }             → apaga
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

function row_to_goal(array $row): array
{
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'icon' => $row['icon'],
        'targetAmount' => (float) $row['target_amount'],
        'currentAmount' => (float) $row['current_amount'],
        'deadline' => $row['deadline'],
        'createdAt' => $row['created_at'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM goals WHERE account_id = ? ORDER BY created_at DESC');
    $stmt->execute([$accountId]);
    json_response(['goals' => array_map('row_to_goal', $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id', 'title', 'targetAmount']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $id = $body['id'] ?? uuid();
    $pdo->prepare(
        'INSERT INTO goals (id, account_id, title, icon, target_amount, current_amount, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $accountId, $body['title'], $body['icon'] ?? null, $body['targetAmount'],
        $body['currentAmount'] ?? 0, $body['deadline'] ?? null,
    ]);

    json_response(['id' => $id], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = request_body();
    require_fields($body, ['account_id', 'id', 'currentAmount']);
    require_account_member($userId, (string) $body['account_id']);

    $stmt = $pdo->prepare('UPDATE goals SET current_amount = ? WHERE id = ? AND account_id = ?');
    $stmt->execute([$body['currentAmount'], $body['id'], $body['account_id']]);
    if ($stmt->rowCount() === 0) {
        json_error('Meta não encontrada.', 404);
    }
    json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id', 'id']);
    require_account_member($userId, (string) $body['account_id']);

    $stmt = $pdo->prepare('DELETE FROM goals WHERE id = ? AND account_id = ?');
    $stmt->execute([$body['id'], $body['account_id']]);
    if ($stmt->rowCount() === 0) {
        json_error('Meta não encontrada.', 404);
    }
    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
