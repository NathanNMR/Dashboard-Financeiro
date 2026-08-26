<?php
/**
 * GET  /api/invites.php?account_id=...        → lista convites pendentes (owner/admin)
 * POST /api/invites.php  { account_id, email, role } → cria um convite (owner/admin)
 *
 * OBS: este endpoint não envia e-mail (a hospedagem compartilhada gratuita
 * costuma bloquear SMTP). Ele retorna um link de convite pronto
 * (invite_link) para você copiar e mandar manualmente para o convidado, ou
 * plugar depois num serviço de e-mail transacional (SendGrid, Resend etc.).
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($payload['sub']);
    require_account_role($payload['sub'], $accountId, ['owner', 'admin']);

    $stmt = $pdo->prepare(
        "SELECT id, email, role, created_at, expires_at
         FROM account_invites
         WHERE account_id = ? AND accepted_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC"
    );
    $stmt->execute([$accountId]);
    json_response(['invites' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = request_body();
    require_fields($body, ['account_id', 'email']);

    $accountId = (string) $body['account_id'];
    $email = strtolower(trim((string) $body['email']));
    $role = in_array($body['role'] ?? 'member', ['admin', 'member'], true) ? $body['role'] : 'member';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('E-mail inválido.', 422);
    }

    require_account_role($payload['sub'], $accountId, ['owner', 'admin']);

    $accountStmt = $pdo->prepare('SELECT type FROM accounts WHERE id = ?');
    $accountStmt->execute([$accountId]);
    $account = $accountStmt->fetch();
    if (!$account) {
        json_error('Conta não encontrada.', 404);
    }
    if ($account['type'] !== 'company') {
        json_error('Convites de equipe só existem em contas do tipo empresa.', 422);
    }

    $inviteId = uuid();
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTime('+7 days'))->format('Y-m-d H:i:s');

    $pdo->prepare(
        'INSERT INTO account_invites (id, account_id, email, role, token, invited_by, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$inviteId, $accountId, $email, $role, $token, $payload['sub'], $expiresAt]);

    $frontendUrl = config()['allowed_origins'][0] ?? '';

    json_response([
        'invite_id' => $inviteId,
        'token' => $token,
        'expires_at' => $expiresAt,
        'invite_link' => rtrim($frontendUrl, '/') . "/convite?token={$token}",
    ], 201);
}

json_error('Método não permitido.', 405);
