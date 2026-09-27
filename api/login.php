<?php
/**
 * POST /api/login.php
 * Body: { email, password }
 *
 * Retorna um token JWT e a lista de accounts (pessoal e/ou empresas) às
 * quais o usuário pertence, cada uma com seu papel (owner/admin/member).
 * O frontend deixa o usuário escolher em qual "espaço financeiro" entrar.
 */

require __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido.', 405);
}

$body = request_body();
require_fields($body, ['email', 'password']);

$email = strtolower(trim((string) $body['email']));
$password = (string) $body['password'];

$pdo = db();
$stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Mensagem genérica de propósito: não revela se o e-mail existe ou não,
// evitando que um atacante use o endpoint pra enumerar contas cadastradas.
if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('E-mail ou senha incorretos.', 401);
}

$accountsStmt = $pdo->prepare(
    'SELECT a.id, a.name, a.type, m.role
     FROM accounts a
     JOIN account_members m ON m.account_id = a.id
     WHERE m.user_id = ?
     ORDER BY a.type ASC, a.name ASC'
);
$accountsStmt->execute([$user['id']]);
$accounts = $accountsStmt->fetchAll();

$token = jwt_encode(['sub' => $user['id'], 'email' => $user['email']], config()['jwt_secret'], config()['jwt_ttl_seconds']);

json_response([
    'token' => $token,
    'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']],
    'accounts' => $accounts,
]);
