<?php
/**
 * GET    /api/categories.php?account_id=...             → lista categorias personalizadas
 * POST   /api/categories.php  { account_id, ...category } → cria
 * DELETE /api/categories.php  { account_id, name }         → apaga pelo nome
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = $payload['sub'];

function row_to_category(array $row): array
{
    return [
        'name' => $row['name'],
        'parent' => $row['parent'],
        'icon' => $row['icon'],
        'type' => $row['type'],
        'custom' => true,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE account_id = ? ORDER BY created_at ASC');
    $stmt->execute([$accountId]);
    json_response(['categories' => array_map('row_to_category', $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id', 'name']);
    $accountId = (string) $body['account_id'];
    require_account_member($userId, $accountId);

    $id = uuid();
    try {
        $pdo->prepare(
            'INSERT INTO categories (id, account_id, name, parent, icon, type) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, $accountId, $body['name'], $body['parent'] ?? null, $body['icon'] ?? null, $body['type'] ?? 'expense',
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            json_error('Já existe uma categoria com esse nome nesta conta.', 409);
        }
        throw $e;
    }

    json_response(['id' => $id], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id', 'name']);
    require_account_member($userId, (string) $body['account_id']);

    $stmt = $pdo->prepare('DELETE FROM categories WHERE name = ? AND account_id = ?');
    $stmt->execute([$body['name'], $body['account_id']]);
    if ($stmt->rowCount() === 0) {
        json_error('Categoria não encontrada.', 404);
    }
    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
