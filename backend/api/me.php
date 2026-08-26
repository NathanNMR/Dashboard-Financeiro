<?php
/**
 * GET /api/me.php
 * Header: Authorization: Bearer <token>
 *
 * Usado pelo frontend ao carregar a página, pra checar se o token salvo
 * ainda é válido e recarregar a lista de accounts do usuário.
 */

require __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido.', 405);
}

$payload = require_auth();
$pdo = db();

$stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
$stmt->execute([$payload['sub']]);
$user = $stmt->fetch();

if (!$user) {
    json_error('Usuário não encontrado.', 404);
}

$accountsStmt = $pdo->prepare(
    'SELECT a.id, a.name, a.type, m.role
     FROM accounts a
     JOIN account_members m ON m.account_id = a.id
     WHERE m.user_id = ?
     ORDER BY a.type ASC, a.name ASC'
);
$accountsStmt->execute([$user['id']]);

json_response([
    'user' => $user,
    'accounts' => $accountsStmt->fetchAll(),
]);
