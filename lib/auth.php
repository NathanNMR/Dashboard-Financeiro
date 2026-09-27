<?php
/**
 * Helpers de autenticação/autorização usados por todos os endpoints
 * protegidos: extrai o usuário logado a partir do header Authorization e
 * confere se ele pertence à account que está tentando acessar.
 */

/** Retorna o payload do JWT do usuário logado, ou interrompe com 401 se ausente/inválido. */
function require_auth(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        json_error('Não autenticado. Envie o token no header Authorization: Bearer <token>.', 401);
    }

    $payload = jwt_decode($matches[1], config()['jwt_secret']);
    if (!$payload || empty($payload['sub'])) {
        json_error('Token inválido ou expirado. Faça login novamente.', 401);
    }

    return $payload;
}

/**
 * Confere que o usuário logado é membro da account informada (isolamento
 * multi-tenant: ninguém acessa dados de uma empresa/pessoa à qual não
 * pertence). Retorna o papel do usuário nessa account (owner/admin/member).
 */
function require_account_member(string $userId, string $accountId): string
{
    $stmt = db()->prepare('SELECT role FROM account_members WHERE account_id = ? AND user_id = ?');
    $stmt->execute([$accountId, $userId]);
    $role = $stmt->fetchColumn();

    if ($role === false) {
        json_error('Você não tem acesso a esta conta financeira.', 403);
    }

    return $role;
}

function require_account_role(string $userId, string $accountId, array $allowedRoles): string
{
    $role = require_account_member($userId, $accountId);
    if (!in_array($role, $allowedRoles, true)) {
        json_error('Você não tem permissão suficiente para esta ação.', 403);
    }
    return $role;
}

/** Extrai account_id da query string (?account_id=...) e valida que o usuário logado é membro. */
function require_account_from_query(string $userId): string
{
    $accountId = $_GET['account_id'] ?? '';
    if (!$accountId) {
        json_error('Informe account_id na URL.', 422);
    }
    require_account_member($userId, $accountId);
    return $accountId;
}
