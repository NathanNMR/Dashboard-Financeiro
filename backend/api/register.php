<?php
/**
 * POST /api/register.php
 * Body: { name, email, password, accountType: "personal"|"company", accountName?: string }
 *
 * Cria o usuário, cria a account (pessoal ou empresa) e o torna "owner"
 * dela. Retorna um token JWT já pronto pra usar.
 */

require __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido.', 405);
}

$body = request_body();
require_fields($body, ['name', 'email', 'password']);

$name = trim((string) $body['name']);
$email = strtolower(trim((string) $body['email']));
$password = (string) $body['password'];
$accountType = $body['accountType'] ?? 'personal';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('E-mail inválido.', 422);
}
if (strlen($password) < 8) {
    json_error('A senha precisa ter pelo menos 8 caracteres.', 422);
}
if (!in_array($accountType, ['personal', 'company'], true)) {
    json_error('accountType deve ser "personal" ou "company".', 422);
}
if ($accountType === 'company' && empty(trim((string) ($body['accountName'] ?? '')))) {
    json_error('Informe o nome da empresa em accountName.', 422);
}

$pdo = db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    json_error('Já existe uma conta com este e-mail.', 409);
}

$pdo->beginTransaction();
try {
    $userId = uuid();
    $pdo->prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
        ->execute([$userId, $name, $email, password_hash($password, PASSWORD_BCRYPT)]);

    $accountId = uuid();
    $accountName = $accountType === 'company'
        ? trim((string) $body['accountName'])
        : "Pessoal — {$name}";

    $pdo->prepare('INSERT INTO accounts (id, name, type, owner_user_id) VALUES (?, ?, ?, ?)')
        ->execute([$accountId, $accountName, $accountType, $userId]);

    $pdo->prepare('INSERT INTO account_members (account_id, user_id, role) VALUES (?, ?, ?)')
        ->execute([$accountId, $userId, 'owner']);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

$token = jwt_encode(['sub' => $userId, 'email' => $email], config()['jwt_secret'], config()['jwt_ttl_seconds']);

json_response([
    'token' => $token,
    'user' => ['id' => $userId, 'name' => $name, 'email' => $email],
    'account' => ['id' => $accountId, 'name' => $accountName, 'type' => $accountType, 'role' => 'owner'],
], 201);
