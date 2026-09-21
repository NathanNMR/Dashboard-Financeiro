<?php
/**
 * Conexão PDO com MySQL.
 *
 * Em produção (Render), a configuração vem de variáveis de ambiente.
 * Em desenvolvimento local, backend/config.php continua sendo aceito.
 */

function config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $localPath = __DIR__ . '/../config.php';
    if (is_file($localPath)) {
        $config = require $localPath;
        return $config;
    }

    $originsRaw = getenv('ALLOWED_ORIGINS') ?: '';
    $origins = array_values(array_filter(array_map('trim', explode(',', $originsRaw))));

    $config = [
        'db' => [
            'host' => getenv('DB_HOST') ?: 'localhost',
            'port' => (int) (getenv('DB_PORT') ?: 3306),
            'name' => getenv('DB_NAME') ?: '',
            'user' => getenv('DB_USER') ?: '',
            'pass' => getenv('DB_PASSWORD') ?: '',
            'charset' => 'utf8mb4',
        ],
        'jwt_secret' => getenv('JWT_SECRET') ?: '',
        'jwt_ttl_seconds' => (int) (getenv('JWT_TTL_SECONDS') ?: 86400),
        'allowed_origins' => $origins,
        'frontend_url' => getenv('FRONTEND_URL') ?: ($origins[0] ?? ''),
    ];

    foreach (['host', 'name', 'user'] as $required) {
        if ($config['db'][$required] === '') {
            throw new RuntimeException("Variável de banco ausente: {$required}");
        }
    }
    if (strlen($config['jwt_secret']) < 32) {
        throw new RuntimeException('JWT_SECRET deve ter pelo menos 32 caracteres.');
    }

    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $db = config()['db'];
    $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset={$db['charset']}";

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    return $pdo;
}

function uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
