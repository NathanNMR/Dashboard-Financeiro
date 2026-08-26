<?php
/**
 * POST /api/invite-accept.php
 * Body: { token, password, name? }
 *
 * Aceita um convite de empresa. Se já existe um usuário com o e-mail do
 * convite, a senha precisa bater com a conta existente (evita que qualquer
 * um sequestre uma conta só por saber o e-mail). Se não existe, cria um
 * usuário novo — nesse caso `name` é obrigatório.
 */

require __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido.', 405);
}

$body = request_body();
require_fields($body, ['token', 'password']);

$pdo = db();

$inviteStmt = $pdo->prepare(
    'SELECT id, account_id, email, role FROM account_invites
     WHERE token = ? AND accepted_at IS NULL AND expires_at > NOW()'
);
$inviteStmt->execute([(string) $body['token']]);
$invite = $inviteStmt->fetch();

if (!$invite) {
    json_error('Convite inválido ou expirado.', 404);
}

$userStmt = $pdo->prepare('SELECT id, name, password_hash FROM users WHERE email = ?');
$userStmt->execute([$invite['email']]);
$user = $userStmt->fetch();

$pdo->beginTransaction();
try {
    if ($user) {
        if (!password_verify((string) $body['password'], $user['password_hash'])) {
            $pdo->rollBack();
            json_error('Já existe uma conta com este e-mail — informe a senha correta para aceitar o convite.', 401);
        }
        $userId = $user['id'];
        $userName = $user['name'];
    } else {
        if (empty(trim((string) ($body['name'] ?? '')))) {
            $pdo->rollBack();
            json_error('Informe seu nome para criar a conta.', 422);
        }
        if (strlen((string) $body['password']) < 8) {
            $pdo->rollBack();
            json_error('A senha precisa ter pelo menos 8 caracteres.', 422);
        }
        $userId = uuid();
        $userName = trim((string) $body['name']);
        $pdo->prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
            ->execute([$userId, $userName, $invite['email'], password_hash((string) $body['password'], PASSWORD_BCRYPT)]);
    }

    $pdo->prepare(
        'INSERT INTO account_members (account_id, user_id, role) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role = VALUES(role)'
    )->execute([$invite['account_id'], $userId, $invite['role']]);

    $pdo->prepare('UPDATE account_invites SET accepted_at = NOW() WHERE id = ?')->execute([$invite['id']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

$accountsStmt = $pdo->prepare(
    'SELECT a.id, a.name, a.type, m.role
     FROM accounts a JOIN account_members m ON m.account_id = a.id
     WHERE m.user_id = ?
     ORDER BY a.type ASC, a.name ASC'
);
$accountsStmt->execute([$userId]);

$token = jwt_encode(['sub' => $userId, 'email' => $invite['email']], config()['jwt_secret'], config()['jwt_ttl_seconds']);

json_response([
    'token' => $token,
    'user' => ['id' => $userId, 'name' => $userName, 'email' => $invite['email']],
    'accounts' => $accountsStmt->fetchAll(),
]);
