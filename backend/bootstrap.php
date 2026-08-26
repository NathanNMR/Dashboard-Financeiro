<?php
/**
 * Ponto de entrada comum: todo endpoint em api/*.php começa com
 * `require __DIR__ . '/../bootstrap.php';`
 */

declare(strict_types=1);

require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/jwt.php';
require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/auth.php';

send_cors_headers();

// Transforma erros do PDO / exceptions não tratadas em JSON 500, em vez de
// vazar HTML de erro do PHP (que quebraria o parse no frontend).
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    json_error('Erro interno no servidor.', 500);
});
