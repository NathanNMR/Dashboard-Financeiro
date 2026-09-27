<?php
/**
 * Snapshot financeiro da conta atual.
 *
 * GET  /api/snapshot.php?account_id=...
 * PUT  /api/snapshot.php { account_id, snapshot: {...} }
 *
 * O PUT substitui o estado financeiro da account em uma única transação SQL.
 * Isso mantém o frontend simples e, ao mesmo tempo, garante persistência
 * centralizada no MySQL para múltiplos dispositivos.
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();
$userId = (string) $payload['sub'];

function snapshot_require_date($value, string $field): string
{
    $value = (string) $value;
    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        json_error("Data inválida em {$field}. Use AAAA-MM-DD.", 422);
    }
    return $value;
}

function snapshot_require_money($value, string $field): float
{
    if (!is_numeric($value)) {
        json_error("Valor inválido em {$field}.", 422);
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < 0 || $number > 999999999999.99) {
        json_error("Valor fora do intervalo permitido em {$field}.", 422);
    }
    return $number;
}

function snapshot_require_text($value, string $field, int $max): string
{
    $value = trim((string) $value);
    if ($value === '' || mb_strlen($value) > $max) {
        json_error("Texto inválido em {$field}.", 422);
    }
    return $value;
}

function snapshot_limit(array $items, string $field, int $max): void
{
    if (count($items) > $max) {
        json_error("Quantidade máxima excedida em {$field} ({$max}).", 413);
    }
}

function fetch_snapshot(PDO $pdo, string $accountId): array
{
    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, created_at DESC');
    $stmt->execute([$accountId]);
    $transactions = array_map(function ($row) {
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
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT * FROM bills WHERE account_id = ? ORDER BY due_date ASC');
    $stmt->execute([$accountId]);
    $bills = array_map(function ($row) {
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
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT category, limit_amount FROM budgets WHERE account_id = ?');
    $stmt->execute([$accountId]);
    $budgets = [];
    foreach ($stmt->fetchAll() as $row) {
        $budgets[$row['category']] = (float) $row['limit_amount'];
    }

    $stmt = $pdo->prepare('SELECT * FROM credit_cards WHERE account_id = ? ORDER BY created_at DESC, name ASC');
    $stmt->execute([$accountId]);
    $cards = array_map(function ($row) {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'limit' => (float) $row['credit_limit'],
            'closingDay' => (int) $row['closing_day'],
            'dueDay' => (int) $row['due_day'],
            'color' => $row['color'],
        ];
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT * FROM goals WHERE account_id = ? ORDER BY created_at DESC');
    $stmt->execute([$accountId]);
    $goals = array_map(function ($row) {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'icon' => $row['icon'],
            'targetAmount' => (float) $row['target_amount'],
            'currentAmount' => (float) $row['current_amount'],
            'deadline' => $row['deadline'],
            'createdAt' => $row['created_at'],
        ];
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT * FROM categories WHERE account_id = ? ORDER BY created_at ASC');
    $stmt->execute([$accountId]);
    $categories = array_map(function ($row) {
        return [
            'name' => $row['name'],
            'parent' => $row['parent'],
            'icon' => $row['icon'],
            'type' => $row['type'],
            'custom' => true,
        ];
    }, $stmt->fetchAll());

    return compact('transactions', 'bills', 'budgets', 'cards', 'goals', 'categories');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($userId);
    json_response(fetch_snapshot($pdo, $accountId));
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    json_error('Método não permitido.', 405);
}

$body = request_body();
require_fields($body, ['account_id', 'snapshot']);
$accountId = (string) $body['account_id'];
require_account_member($userId, $accountId);

if (!is_array($body['snapshot'])) {
    json_error('snapshot deve ser um objeto JSON.', 422);
}

$snapshot = $body['snapshot'];
$transactions = isset($snapshot['transactions']) && is_array($snapshot['transactions']) ? $snapshot['transactions'] : [];
$bills = isset($snapshot['bills']) && is_array($snapshot['bills']) ? $snapshot['bills'] : [];
$budgets = isset($snapshot['budgets']) && is_array($snapshot['budgets']) ? $snapshot['budgets'] : [];
$cards = isset($snapshot['cards']) && is_array($snapshot['cards']) ? $snapshot['cards'] : [];
$goals = isset($snapshot['goals']) && is_array($snapshot['goals']) ? $snapshot['goals'] : [];
$categories = isset($snapshot['categories']) && is_array($snapshot['categories']) ? $snapshot['categories'] : [];

snapshot_limit($transactions, 'transactions', 10000);
snapshot_limit($bills, 'bills', 2000);
snapshot_limit($cards, 'cards', 100);
snapshot_limit($goals, 'goals', 500);
snapshot_limit($categories, 'categories', 500);
if (count($budgets) > 500) {
    json_error('Quantidade máxima excedida em budgets (500).', 413);
}

$pdo->beginTransaction();
try {
    // Ordem de remoção respeita a FK transactions.card_id -> credit_cards.id.
    $pdo->prepare('DELETE FROM transactions WHERE account_id = ?')->execute([$accountId]);
    $pdo->prepare('DELETE FROM bills WHERE account_id = ?')->execute([$accountId]);
    $pdo->prepare('DELETE FROM budgets WHERE account_id = ?')->execute([$accountId]);
    $pdo->prepare('DELETE FROM goals WHERE account_id = ?')->execute([$accountId]);
    $pdo->prepare('DELETE FROM categories WHERE account_id = ?')->execute([$accountId]);
    $pdo->prepare('DELETE FROM credit_cards WHERE account_id = ?')->execute([$accountId]);

    $insertCard = $pdo->prepare(
        'INSERT INTO credit_cards (id, account_id, name, credit_limit, closing_day, due_day, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($cards as $card) {
        if (!is_array($card)) json_error('Cartão inválido.', 422);
        $closingDay = (int) ($card['closingDay'] ?? 0);
        $dueDay = (int) ($card['dueDay'] ?? 0);
        if ($closingDay < 1 || $closingDay > 31 || $dueDay < 1 || $dueDay > 31) {
            json_error('Dias de fechamento e vencimento do cartão devem estar entre 1 e 31.', 422);
        }
        $insertCard->execute([
            snapshot_require_text($card['id'] ?? '', 'cards.id', 36),
            $accountId,
            snapshot_require_text($card['name'] ?? '', 'cards.name', 100),
            snapshot_require_money($card['limit'] ?? null, 'cards.limit'),
            $closingDay,
            $dueDay,
            isset($card['color']) ? substr((string) $card['color'], 0, 20) : null,
        ]);
    }

    $insertTx = $pdo->prepare(
        'INSERT INTO transactions
         (id, account_id, created_by, date, description, amount, category, subcategory, type,
          recurrence, recurrence_group_id, card_id, installment_group_id, installment_number, installment_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($transactions as $tx) {
        if (!is_array($tx)) json_error('Transação inválida.', 422);
        $type = $tx['type'] ?? '';
        if (!in_array($type, ['income', 'expense'], true)) json_error('Tipo de transação inválido.', 422);
        $recurrence = $tx['recurrence'] ?? 'none';
        if (!in_array($recurrence, ['none', 'monthly', 'yearly'], true)) $recurrence = 'none';

        $insertTx->execute([
            snapshot_require_text($tx['id'] ?? '', 'transactions.id', 36),
            $accountId,
            $userId,
            snapshot_require_date($tx['date'] ?? '', 'transactions.date'),
            snapshot_require_text($tx['description'] ?? '', 'transactions.description', 255),
            snapshot_require_money($tx['amount'] ?? null, 'transactions.amount'),
            snapshot_require_text($tx['category'] ?? '', 'transactions.category', 100),
            isset($tx['subcategory']) && $tx['subcategory'] !== '' ? substr((string) $tx['subcategory'], 0, 100) : null,
            $type,
            $recurrence,
            $tx['recurrenceGroupId'] ?? null,
            $tx['cardId'] ?? null,
            $tx['installmentGroupId'] ?? null,
            isset($tx['installmentNumber']) ? (int) $tx['installmentNumber'] : null,
            isset($tx['installmentTotal']) ? (int) $tx['installmentTotal'] : null,
        ]);
    }

    $insertBill = $pdo->prepare(
        'INSERT INTO bills
         (id, account_id, description, due_date, original_amount, daily_interest_rate, penalty_rate,
          category, type, is_paid, paid_date, paid_amount, is_recurring_monthly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($bills as $bill) {
        if (!is_array($bill)) json_error('Conta/compromisso inválido.', 422);
        $type = $bill['type'] ?? '';
        if (!in_array($type, ['income', 'expense'], true)) json_error('Tipo de conta inválido.', 422);

        $insertBill->execute([
            snapshot_require_text($bill['id'] ?? '', 'bills.id', 36),
            $accountId,
            snapshot_require_text($bill['description'] ?? '', 'bills.description', 255),
            snapshot_require_date($bill['dueDate'] ?? '', 'bills.dueDate'),
            snapshot_require_money($bill['originalAmount'] ?? null, 'bills.originalAmount'),
            snapshot_require_money($bill['dailyInterestRate'] ?? 0, 'bills.dailyInterestRate'),
            snapshot_require_money($bill['penaltyRate'] ?? 0, 'bills.penaltyRate'),
            snapshot_require_text($bill['category'] ?? '', 'bills.category', 100),
            $type,
            !empty($bill['isPaid']) ? 1 : 0,
            !empty($bill['paidDate']) ? snapshot_require_date($bill['paidDate'], 'bills.paidDate') : null,
            isset($bill['paidAmount']) ? snapshot_require_money($bill['paidAmount'], 'bills.paidAmount') : null,
            !empty($bill['isRecurringMonthly']) ? 1 : 0,
        ]);
    }

    $insertBudget = $pdo->prepare('INSERT INTO budgets (account_id, category, limit_amount) VALUES (?, ?, ?)');
    foreach ($budgets as $category => $limit) {
        $insertBudget->execute([
            $accountId,
            snapshot_require_text($category, 'budgets.category', 100),
            snapshot_require_money($limit, 'budgets.limit'),
        ]);
    }

    $insertGoal = $pdo->prepare(
        'INSERT INTO goals (id, account_id, title, icon, target_amount, current_amount, deadline, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($goals as $goal) {
        if (!is_array($goal)) json_error('Meta inválida.', 422);
        $createdAt = !empty($goal['createdAt']) ? (string) $goal['createdAt'] : date('Y-m-d H:i:s');
        $insertGoal->execute([
            snapshot_require_text($goal['id'] ?? '', 'goals.id', 36),
            $accountId,
            snapshot_require_text($goal['title'] ?? '', 'goals.title', 150),
            isset($goal['icon']) ? substr((string) $goal['icon'], 0, 10) : null,
            snapshot_require_money($goal['targetAmount'] ?? null, 'goals.targetAmount'),
            snapshot_require_money($goal['currentAmount'] ?? 0, 'goals.currentAmount'),
            !empty($goal['deadline']) ? snapshot_require_date($goal['deadline'], 'goals.deadline') : null,
            $createdAt,
        ]);
    }

    $insertCategory = $pdo->prepare(
        'INSERT INTO categories (id, account_id, name, parent, icon, type) VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($categories as $category) {
        if (!is_array($category)) json_error('Categoria inválida.', 422);
        $type = $category['type'] ?? 'expense';
        if (!in_array($type, ['income', 'expense', 'both'], true)) $type = 'expense';
        $insertCategory->execute([
            uuid(),
            $accountId,
            snapshot_require_text($category['name'] ?? '', 'categories.name', 100),
            !empty($category['parent']) ? substr((string) $category['parent'], 0, 100) : null,
            isset($category['icon']) ? substr((string) $category['icon'], 0, 10) : null,
            $type,
        ]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

json_response(['success' => true]);
