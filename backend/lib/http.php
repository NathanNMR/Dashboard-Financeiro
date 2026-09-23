<?php
/**
 * Helpers compartilhados por todos os endpoints: resposta JSON padronizada,
 * cabeçalhos CORS e leitura do corpo da requisição.
 */

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = false;

    try {
        $cfg = config();
        $allowedOrigins = $cfg['allowed_origins'] ?? [];
        $allowed = $origin !== '' && in_array($origin, $allowedOrigins, true);
    } catch (Throwable $e) {
        // Fail closed: configuração inválida nunca amplia permissões de CORS.
        error_log('Falha ao carregar configuração de CORS: ' . $e->getMessage());
    }

    if ($allowed) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 600');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if ($origin !== '' && !$allowed) {
            http_response_code(403);
            exit;
        }
        http_response_code(204);
        exit;
    }
}

function json_response(array $data, int $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = [])
{
    json_response(array_merge(['error' => $message], $extra), $status);
}

/** Lê e decodifica o corpo JSON. Responde 400 se JSON não vazio for inválido. */
function request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('JSON inválido.', 400);
    }
    return $data;
}

function require_fields(array $body, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($body[$field]) || $body[$field] === '') {
            json_error("Campo obrigatório ausente: {$field}", 422);
        }
    }
}
