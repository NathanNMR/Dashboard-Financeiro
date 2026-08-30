<?php
/**
 * Helpers compartilhados por todos os endpoints: resposta JSON padronizada,
 * cabeçalhos CORS e leitura do corpo da requisição.
 */

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // A checagem de CORS não pode depender de config() funcionar perfeitamente:
    // se o config.php tiver algum problema, ainda queremos que o navegador
    // veja o erro real (JSON) em vez de um erro de CORS que esconde a causa.
    try {
        $cfg = config();
        $allowed = in_array($origin, $cfg['allowed_origins'], true);
    } catch (Throwable $e) {
        error_log('Falha ao carregar config.php ao montar CORS: ' . $e->getMessage());
        $allowed = $origin !== '';
    }

    if ($allowed) {
        header("Access-Control-Allow-Origin: $origin");
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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

/** Lê e decodifica o corpo JSON da requisição. Retorna [] se vazio/inválido. */
function request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_fields(array $body, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($body[$field]) || $body[$field] === '') {
            json_error("Campo obrigatório ausente: {$field}", 422);
        }
    }
}
