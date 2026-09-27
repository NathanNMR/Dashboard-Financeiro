<?php
/**
 * GET    /api/transactions.php?account_id=...                → lista todas as transações da conta
 * POST   /api/transactions.php  { account_id, ...transaction } → cria (aceita um objeto OU um array em "items" para lançar parcelas/recorrências de uma vez)
 * PUT    /api/transactions.php  { account_id, id, ...fields }  → atualiza uma transação
 * DELETE /api/transactions.php  { account_id, id }              → apaga uma transação
 *        /api/transactions.php  { account_id, group_id }        → apaga toda uma série (recorrência ou parcelamento)
 *        /api/transactions.php  { account_id, all: true }       → apaga TODAS as transações da conta
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

function row_to_transaction(array $row): array
{
    return [
        'id' => $row['id'],
        'date' => $row['date'],
        'description' => $row['description'],
        'amount' => (float) $row['amount'],
        'category' => $row['category'],
        'subcategory' => $row['subcategory'],
        'type' => $row['type'],
        'recurrence' => $row['recurrence'],
        'recurrenceGroupId' => $row['recurrence_group_id'],
        'cardId' => $row['card_id'],
        'installmentGroupId' => $row['installment_group_id'],
        'installmentNumber' => $row['installment_number'] !== null ? (int) $row['installment_number'] : null,
        'installmentTotal' => $row['installment_total'] !== null ? (int) $row['installment_total'] : null,
    ];
}

function insert_transaction(PDO $pdo, string $accountId, ?string $userId, array $t): string
{
    $id = $t['id'] ?? uuid();
    $pdo->prepare(
        'INSERT INTO transactions
         (id, account_id, created_by, date, description, amount, category, subcategory, type,
          recurrence, recurrence_group_id, card_id, installment_group_id, installment_number, installment_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $accountId, $userId,
        $t['date'], $t['description'], $t['amount'], $t['category'], $t['subcategory'] ?? null, $t['type'],
        $t['recurrence'] ?? 'none', $t['recurrenceGroupId'] ?? null, $t['cardId'] ?? null,
        $t['installmentGroupId'] ?? null, $t['installmentNumber'] ?? null, $t['installmentTotal'] ?? null,
    ]);
    return $id;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC');
    $stmt->execute([$accountId]);
    json_response(['transactions' => array_map('row_to_transaction', $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    // Suporta criar várias de uma vez (ex: as N parcelas de uma compra
    // parcelada, ou as ocorrências de uma recorrência) via { items: [...] }.
    $items = isset($body['items']) && is_array($body['items']) ? $body['items'] : [$body];

    $createdIds = [];
    $pdo->beginTransaction();
    try {
        foreach ($items as $item) {
            require_fields($item, ['date', 'description', 'amount', 'category', 'type']);
            $createdIds[] = insert_transaction($pdo, $accountId, $userId, $item);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    json_response(['ids' => $createdIds], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = request_body();
    require_fields($body, ['account_id', 'id']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $stmt = $pdo->prepare(
        'UPDATE transactions SET date = ?, description = ?, amount = ?, category = ?, subcategory = ?,
         type = ?, card_id = ?
         WHERE id = ? AND account_id = ?'
    );
    $stmt->execute([
        $body['date'], $body['description'], $body['amount'], $body['category'], $body['subcategory'] ?? null,
        $body['type'], $body['cardId'] ?? null,
        $body['id'], $accountId,
    ]);

    if ($stmt->rowCount() === 0) {
        json_error('Transação não encontrada nesta conta.', 404);
    }
    json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    if (!empty($body['all'])) {
        $pdo->prepare('DELETE FROM transactions WHERE account_id = ?')->execute([$accountId]);
        json_response(['success' => true]);
    }

    if (!empty($body['group_id'])) {
        $stmt = $pdo->prepare(
            'DELETE FROM transactions WHERE account_id = ? AND (recurrence_group_id = ? OR installment_group_id = ?)'
        );
        $stmt->execute([$accountId, $body['group_id'], $body['group_id']]);
        json_response(['success' => true, 'deleted' => $stmt->rowCount()]);
    }

    require_fields($body, ['id']);
    $stmt = $pdo->prepare('DELETE FROM transactions WHERE id = ? AND account_id = ?');
    $stmt->execute([$body['id'], $accountId]);
    if ($stmt->rowCount() === 0) {
        json_error('Transação não encontrada nesta conta.', 404);
    }
    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
