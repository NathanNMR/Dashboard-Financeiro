<?php
/**
 * GET /api/budgets.php?account_id=...                            → { "Alimentação": 800, ... }
 * PUT /api/budgets.php  { account_id, budgets: { categoria: valor } } → substitui o orçamento inteiro
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT category, limit_amount FROM budgets WHERE account_id = ?');
    $stmt->execute([$accountId]);

    $budgets = [];
    foreach ($stmt->fetchAll() as $row) {
        $budgets[$row['category']] = (float) $row['limit_amount'];
    }
    json_response(['budgets' => $budgets]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = request_body();
    require_fields($body, ['account_id', 'budgets']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    if (!is_array($body['budgets'])) {
        json_error('budgets deve ser um objeto { categoria: valor }.', 422);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM budgets WHERE account_id = ?')->execute([$accountId]);
        $insert = $pdo->prepare('INSERT INTO budgets (account_id, category, limit_amount) VALUES (?, ?, ?)');
        foreach ($body['budgets'] as $category => $limit) {
            $insert->execute([$accountId, $category, (float) $limit]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
