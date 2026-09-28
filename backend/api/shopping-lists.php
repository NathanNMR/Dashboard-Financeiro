<?php
/** Listas de compras da conta: GET e PUT atômico do conjunto de listas. */
require __DIR__ . '/../bootstrap.php';

$userId = (string) require_auth()['sub'];
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    $stmt = $pdo->prepare('SELECT * FROM shopping_lists WHERE account_id = ? ORDER BY created_at DESC, id DESC');
    $stmt->execute([$accountId]);
    $lists = array_map(static function ($row) {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'budget' => $row['budget'] !== null ? (float) $row['budget'] : null,
            'paidAmount' => $row['paid_amount'] !== null ? (float) $row['paid_amount'] : null,
            'completedAt' => $row['completed_at'],
            'recordedTransactionId' => $row['recorded_transaction_id'],
            'items' => json_decode($row['items_json'], true, 512, JSON_THROW_ON_ERROR),
        ];
    }, $stmt->fetchAll());
    json_response(['lists' => $lists]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') json_error('Método não permitido.', 405);

$body = request_body();
require_fields($body, ['account_id', 'lists']);
$accountId = (string) $body['account_id'];
require_account_member($userId, $accountId);
$lists = $body['lists'];
if (!is_array($lists) || !array_is_list($lists) || count($lists) > 100) {
    json_error('Envie no máximo 100 listas.', 422);
}

// Valide tudo antes de excluir linhas existentes.
$validated = [];
$seenLists = [];
foreach ($lists as $list) {
    if (!is_array($list)) json_error('Lista inválida.', 422);
    $id = (string) ($list['id'] ?? '');
    $title = trim((string) ($list['title'] ?? ''));
    if ($id === '' || strlen($id) > 36 || isset($seenLists[$id]) || $title === '' || mb_strlen($title) > 150) {
        json_error('Identificador ou título inválido na lista.', 422);
    }
    $seenLists[$id] = true;
    $items = $list['items'] ?? null;
    if (!is_array($items) || !array_is_list($items) || count($items) > 200) {
        json_error('Envie no máximo 200 itens por lista.', 422);
    }
    $seenItems = [];
    $cleanItems = [];
    foreach ($items as $item) {
        if (!is_array($item)) json_error('Item inválido.', 422);
        $itemId = (string) ($item['id'] ?? '');
        $name = trim((string) ($item['name'] ?? ''));
        $quantity = $item['quantity'] ?? null;
        if ($itemId === '' || strlen($itemId) > 50 || isset($seenItems[$itemId]) ||
            $name === '' || mb_strlen($name) > 150 || !is_numeric($quantity) ||
            (float) $quantity <= 0 || (float) $quantity > 9999) {
            json_error('Nome, quantidade ou identificador inválido no item.', 422);
        }
        $seenItems[$itemId] = true;
        $price = $item['unitPrice'] ?? null;
        $cleanItems[] = [
            'id' => $itemId,
            'name' => $name,
            'quantity' => (float) $quantity,
            'unitPrice' => $price === null ? null : shopping_money($price),
            'checked' => $item['checked'] === true,
        ];
    }
    $paid = $list['paidAmount'] ?? null;
    $budget = $list['budget'] ?? null;
    $date = $list['completedAt'] ?? null;
    $transactionId = $list['recordedTransactionId'] ?? null;
    if ($date !== null && (!is_string($date) || !DateTime::createFromFormat('!Y-m-d', $date) ||
        DateTime::createFromFormat('!Y-m-d', $date)->format('Y-m-d') !== $date)) {
        json_error('Data de compra inválida.', 422);
    }
    if ($transactionId !== null && (!is_string($transactionId) || strlen($transactionId) > 36)) {
        json_error('Referência de transação inválida.', 422);
    }
    $validated[] = [
        $id, $accountId, $title,
        $budget === null ? null : shopping_money($budget),
        $paid === null ? null : shopping_money($paid),
        $date, $transactionId,
        json_encode($cleanItems, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
    ];
}

$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM shopping_lists WHERE account_id = ?')->execute([$accountId]);
    $insert = $pdo->prepare('INSERT INTO shopping_lists
        (id, account_id, title, budget, paid_amount, completed_at, recorded_transaction_id, items_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($validated as $row) $insert->execute($row);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
json_response(['success' => true]);

function shopping_money($value): float
{
    if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < 0 || (float) $value > 999999999999.99) {
        json_error('Valor monetário inválido na lista de compras.', 422);
    }
    return round((float) $value, 2);
}
