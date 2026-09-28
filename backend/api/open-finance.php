<?php
/** Integração de leitura Pluggy: token do widget, vínculo e prévia de importação. */
require __DIR__ . '/../bootstrap.php';

$userId = (string) require_auth()['sub'];
$body = $_SERVER['REQUEST_METHOD'] === 'POST' ? request_body() : [];
$accountId = (string) ($body['account_id'] ?? $_GET['account_id'] ?? '');
if ($accountId === '') json_error('Informe account_id.', 422);
require_account_member($userId, $accountId);
$action = (string) ($body['action'] ?? $_GET['action'] ?? '');
$clientUserId = $accountId . ':' . $userId;

function pluggy_request(string $method, string $path, ?array $data = null, ?string $apiKey = null): array
{
    $headers = ['Content-Type: application/json'];
    if ($apiKey !== null) $headers[] = 'X-API-KEY: ' . $apiKey;
    $ch = curl_init('https://api.pluggy.ai' . $path);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 25,
        CURLOPT_FOLLOWLOCATION => false]);
    if ($data !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_THROW_ON_ERROR));
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($response === false || $status < 200 || $status >= 300) {
        error_log('Falha Pluggy ' . $path . ' HTTP ' . $status . ': ' . curl_error($ch));
        json_error('Não foi possível consultar o provedor Open Finance. Confira as credenciais e tente novamente.', 502);
    }
    $decoded = json_decode($response, true);
    if (!is_array($decoded)) json_error('Resposta inválida do provedor Open Finance.', 502);
    return $decoded;
}

function pluggy_key(): string
{
    $id = getenv('PLUGGY_CLIENT_ID');
    $secret = getenv('PLUGGY_CLIENT_SECRET');
    if (!$id || !$secret) json_error('Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no Render.', 503);
    $result = pluggy_request('POST', '/auth', ['clientId' => $id, 'clientSecret' => $secret]);
    if (empty($result['apiKey'])) json_error('Autenticação com o provedor indisponível.', 502);
    return $result['apiKey'];
}

function valid_item_id($value): string
{
    if (!is_string($value) || !preg_match('/^[a-f0-9-]{36}$/i', $value)) json_error('Conexão inválida.', 422);
    return $value;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'token') {
    $result = pluggy_request('POST', '/connect_token', ['options' => ['clientUserId' => $clientUserId]], pluggy_key());
    json_response(['connectToken' => $result['accessToken'] ?? '']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'attach') {
    $itemId = valid_item_id($body['item_id'] ?? null);
    $item = pluggy_request('GET', '/items/' . $itemId, null, pluggy_key());
    // O identificador é gravado no provedor na criação do token do widget.
    if (($item['clientUserId'] ?? null) !== $clientUserId) json_error('Conexão não pertence a este usuário e conta.', 403);
    $stmt = db()->prepare('INSERT INTO open_finance_connections (account_id, user_id, item_id) VALUES (?, ?, ?)');
    try { $stmt->execute([$accountId, $userId, $itemId]); }
    catch (PDOException $e) {
        if ($e->getCode() !== '23000') throw $e;
        $check = db()->prepare('SELECT 1 FROM open_finance_connections WHERE item_id = ? AND account_id = ? AND user_id = ?');
        $check->execute([$itemId, $accountId, $userId]);
        if (!$check->fetchColumn()) json_error('Conexão já vinculada a outra conta.', 409);
    }
    json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = db()->prepare('SELECT item_id, created_at FROM open_finance_connections WHERE account_id = ? AND user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$accountId, $userId]);
    json_response(['connections' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'preview') {
    $itemId = valid_item_id($_GET['item_id'] ?? null);
    $stmt = db()->prepare('SELECT 1 FROM open_finance_connections WHERE account_id = ? AND user_id = ? AND item_id = ?');
    $stmt->execute([$accountId, $userId, $itemId]);
    if (!$stmt->fetchColumn()) json_error('Conexão não encontrada nesta conta.', 403);
    $key = pluggy_key();
    $item = pluggy_request('GET', '/items/' . $itemId, null, $key);
    if (($item['clientUserId'] ?? null) !== $clientUserId) json_error('Conexão não pertence a este usuário.', 403);
    if (!in_array($item['status'] ?? '', ['UPDATED', 'PARTIAL_SUCCESS'], true)) {
        json_error('O banco ainda está sincronizando. Aguarde e tente novamente.', 409);
    }
    $mapped = [];
    $accounts = pluggy_request('GET', '/accounts?itemId=' . rawurlencode($itemId), null, $key);
    foreach ($accounts['results'] ?? [] as $bankAccount) {
        if (($bankAccount['type'] ?? '') !== 'BANK' || ($bankAccount['currencyCode'] ?? '') !== 'BRL') continue;
        $bankId = (string) $bankAccount['id'];
        $next = '?accountId=' . rawurlencode($bankId);
        for ($page = 0; $next !== null && $page < 20; $page++) {
            if (!preg_match('/^\?accountId=[a-f0-9-]{36}(?:&after=[A-Za-z0-9_%+=\/-]+)?$/i', $next)) {
                json_error('Paginação inválida do provedor.', 502);
            }
            $result = pluggy_request('GET', '/v2/transactions' . $next, null, $key);
            foreach ($result['results'] ?? [] as $tx) {
                if (($tx['status'] ?? '') !== 'POSTED' || ($tx['currencyCode'] ?? '') !== 'BRL' || empty($tx['id'])) continue;
                $direction = $tx['type'] ?? '';
                if (!in_array($direction, ['CREDIT', 'DEBIT'], true) || !is_numeric($tx['amount'] ?? null)) continue;
                $amount = abs((float) $tx['amount']);
                if ($amount <= 0 || !is_finite($amount)) continue;
                $date = substr((string) ($tx['date'] ?? ''), 0, 10);
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
                // UUID estável: reimportar a mesma operação não cria outro lançamento.
                $hash = hash('sha256', $bankId . ':' . $tx['id']);
                $uuid = substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-5' . substr($hash, 13, 3) . '-a' . substr($hash, 17, 3) . '-' . substr($hash, 20, 12);
                $mapped[] = ['id' => $uuid, 'date' => $date,
                    'description' => mb_substr(trim((string) ($tx['description'] ?? 'Transação bancária')), 0, 255),
                    'amount' => round($amount, 2), 'category' => $direction === 'CREDIT' ? 'Outras receitas' : 'Outras despesas',
                    'type' => $direction === 'CREDIT' ? 'income' : 'expense'];
                if (count($mapped) > 9000) json_error('Muitas transações para importar de uma vez.', 413);
            }
            $next = $result['next'] ?? null;
        }
        if ($next !== null) json_error('Há mais páginas que o limite da importação. Tente novamente depois.', 413);
    }
    json_response(['transactions' => $mapped]);
}
json_error('Método ou ação inválidos.', 405);
