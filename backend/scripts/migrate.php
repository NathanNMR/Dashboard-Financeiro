<?php
declare(strict_types=1);

require __DIR__ . '/../lib/db.php';

// Credenciais administrativas são usadas somente nesta execução inicial.
$migrateUser = getenv('DB_MIGRATE_USER');
$migratePassword = getenv('DB_MIGRATE_PASSWORD');
$appUser = getenv('DB_USER');
$appPassword = getenv('DB_PASSWORD');
$database = getenv('DB_NAME');
if (!$migrateUser || !$migratePassword || !$appUser || !$appPassword || !$database ||
    !preg_match('/^[a-zA-Z0-9_]+$/', $database) ||
    !preg_match('/^[a-zA-Z0-9_]+$/', $appUser)) {
    fwrite(STDERR, "Configuração de migração incompleta ou inválida.\n");
    exit(1);
}

putenv('DB_USER=' . $migrateUser);
putenv('DB_PASSWORD=' . $migratePassword);

$schemaPath = __DIR__ . '/../schema.sql';
$sql = file_get_contents($schemaPath);
if ($sql === false) {
    fwrite(STDERR, "Não foi possível ler schema.sql\n");
    exit(1);
}

try {
    $pdo = db();
    // PDO/MySQL não consome de forma portável os resultados de várias
    // instruções em um único exec(). O schema não contém ponto e vírgula
    // dentro de strings SQL; removemos comentários de linha e executamos
    // cada instrução separadamente.
    $withoutComments = preg_replace('/^\s*--[^\r\n]*/m', '', $sql);
    foreach (explode(';', $withoutComments) as $statement) {
        if (trim($statement) !== '') {
            $pdo->exec($statement);
        }
    }
    $userLiteral = $pdo->quote($appUser);
    $passwordLiteral = $pdo->quote($appPassword);
    $pdo->exec("CREATE USER IF NOT EXISTS {$userLiteral}@'%' IDENTIFIED BY {$passwordLiteral}");
    $pdo->exec("ALTER USER {$userLiteral}@'%' IDENTIFIED BY {$passwordLiteral}");
    $pdo->exec("GRANT SELECT, INSERT, UPDATE, DELETE ON `{$database}`.* TO {$userLiteral}@'%'");
    fwrite(STDOUT, "Schema aplicado com sucesso.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Falha ao aplicar schema: " . $e->getMessage() . "\n");
    exit(1);
}
