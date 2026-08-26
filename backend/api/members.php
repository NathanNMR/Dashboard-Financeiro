<?php
/**
 * GET    /api/members.php?account_id=...                  → lista membros
 * DELETE /api/members.php  { account_id, user_id }         → remove um membro (owner/admin)
 */

require __DIR__ . '/../bootstrap.php';

$payload = require_auth();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accountId = require_account_from_query($payload['sub']);

    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.email, m.role, m.joined_at
         FROM account_members m JOIN users u ON u.id = m.user_id
         WHERE m.account_id = ?
         ORDER BY FIELD(m.role, "owner", "admin", "member"), u.name ASC'
    );
    $stmt->execute([$accountId]);
    json_response(['members' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = request_body();
    require_fields($body, ['account_id', 'user_id']);
    $accountId = (string) $body['account_id'];
    $targetUserId = (string) $body['user_id'];

    require_account_role($payload['sub'], $accountId, ['owner', 'admin']);

    $roleStmt = $pdo->prepare('SELECT role FROM account_members WHERE account_id = ? AND user_id = ?');
    $roleStmt->execute([$accountId, $targetUserId]);
    $targetRole = $roleStmt->fetchColumn();

    if ($targetRole === false) {
        json_error('Este usuário não é membro desta conta.', 404);
    }
    if ($targetRole === 'owner') {
        json_error('Não é possível remover o dono da conta.', 422);
    }

    $pdo->prepare('DELETE FROM account_members WHERE account_id = ? AND user_id = ?')
        ->execute([$accountId, $targetUserId]);

    json_response(['success' => true]);
}

json_error('Método não permitido.', 405);
