<?php
require __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido.', 405);
}

try {
    db()->query('SELECT 1');
    json_response([
        'status' => 'ok',
        'service' => 'smartfinance-api',
        'database' => 'ok',
    ]);
} catch (Throwable $e) {
    error_log('Health check DB error: ' . $e->getMessage());
    json_error('Serviço indisponível.', 503, ['status' => 'error', 'database' => 'unavailable']);
}
