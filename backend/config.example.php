<?php
/**
 * Configuração local opcional.
 *
 * No Render, prefira variáveis de ambiente e NÃO crie config.php.
 * Para desenvolvimento local, copie este arquivo para config.php.
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'smartfinance',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'jwt_secret' => 'troque-por-uma-chave-aleatoria-com-pelo-menos-32-caracteres',
    'jwt_ttl_seconds' => 60 * 60 * 24,
    'allowed_origins' => ['http://localhost:3000'],
    'frontend_url' => 'http://localhost:3000',
];
