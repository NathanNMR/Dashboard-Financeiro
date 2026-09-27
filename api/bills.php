<?php
/**
 * GET    /api/bills.php?account_id=...              → lista contas/compromissos
 * POST   /api/bills.php  { account_id, ...bill }     → cria
 * PUT    /api/bills.php  { account_id, id, ...bill }  → atualiza (ex: marcar como paga)
 * DELETE /api/bills.php  { account_id, id }            → apaga
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

function row_to_bill(array $row): array
{
    return [
        'id' => $row['id'],
        'description' => $row['description'],
        'dueDate' => $row['due_date'],
        'originalAmount' => (float) $row['original_amount'],
        'dailyInterestRate' => (float) $row['daily_interest_rate'],
        'penaltyRate' => (float) $row['penalty_rate'],
        'category' => $row['category'],
        'type' => $row['type'],
        'isPaid' => (bool) $row['is_paid'],
        'paidDate' => $row['paid_date'],
        'paidAmount' => $row['paid_amount'] !== null ? (float) $row['paid_amount'] : null,
        'isRecurringMonthly' => (bool) $row['is_recurring_monthly'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM bills WHERE account_id = ? ORDER BY due_date ASC');
    $stmt->execute([$accountId]);
    json_response(['bills' => array_map('row_to_bill', $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id', 'description', 'dueDate', 'originalAmount', 'category', 'type']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $id = $body['id'] ?? uuid();
    $pdo->prepare(
        'INSERT INTO bills (id, account_id, description, due_date, original_amount, daily_interest_rate,
         penalty_rate, category, type, is_paid, is_recurring_monthly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $accountId, $body['description'], $body['dueDate'], $body['originalAmount'],
        $body['dailyInterestRate'] ?? 0, $body['penaltyRate'] ?? 0, $body['category'], $body['type'],
        !empty($body['isPaid']) ? 1 : 0, !empty($body['isRecurringMonthly']) ? 1 : 0,
    ]);

    json_response(['id' => $id], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = request_body();
    require_fields($body, ['account_id', 'id']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $stmt = $pdo->prepare(
        'UPDATE bills SET description = ?, due_date = ?, original_amount = ?, daily_interest_rate = ?,
         penalty_rate = ?, category = ?, type = ?, is_paid = ?, paid_date = ?, paid_amount = ?,
         is_recurring_monthly = ?
         WHERE id = ? AND account_id = ?'
    );
    $stmt->execute([
        $body['description'], $body['dueDate'], $body['originalAmount'], $body['dailyInterestRate'] ?? 0,
        $body['penaltyRate'] ?? 0, $body['category'], $body['type'], !empty($body['isPaid']) ? 1 : 0,
        $body['paidDate'] ?? null, $body['paidAmount'] ?? null, !empty($body['isRecurringMonthly']) ? 1 : 0,
        $body['id'], $accountId,
    ]);

    if ($stmt->rowCount() === 0) {
        json_error('Conta não encontrada nesta conta financeira.', 404);
    }
    json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id', 'id']);
    require_account_member($userId, (string) $body['account_id']);

    $stmt = $pdo->prepare('DELETE FROM bills WHERE id = ? AND account_id = ?');
    $stmt->execute([$body['id'], $body['account_id']]);
    if ($stmt->rowCount() === 0) {
        json_error('Conta não encontrada.', 404);
    }
    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
