<?php
declare(strict_types=1);

require __DIR__ . '/../lib/db.php';

$schemaPath = __DIR__ . '/../schema.sql';
$sql = file_get_contents($schemaPath);
if ($sql === false) {
    fwrite(STDERR, "Não foi possível ler schema.sql\n");
    exit(1);
}

try {
    $pdo = db();
    $pdo->exec($sql);
    fwrite(STDOUT, "Schema aplicado com sucesso.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Falha ao aplicar schema: " . $e->getMessage() . "\n");
    exit(1);
}
