<?php
/**
 * Configuração do backend — PREENCHA com os dados do seu banco MySQL antes
 * de subir para a hospedagem (InfinityFree, Hostinger etc.).
 *
 * IMPORTANTE: nunca versione este arquivo com credenciais reais no Git.
 * Use config.example.php como modelo e copie para config.php no servidor.
 */

return [
    'db' => [
        'host' => 'localhost',
        'name' => 'seu_banco_aqui',
        'user' => 'seu_usuario_aqui',
        'pass' => 'sua_senha_aqui',
        'charset' => 'utf8mb4',
    ],

    // Chave secreta usada para assinar os tokens JWT. Gere uma string
    // aleatória longa e única (ex: `openssl rand -hex 32`) — nunca reutilize
    // a mesma chave entre ambientes de desenvolvimento e produção.
    'jwt_secret' => 'troque-esta-chave-por-uma-aleatoria-e-longa',

    // Tempo de vida do token de acesso (segundos). 15 minutos é um bom padrão
    // quando combinado com refresh token; para simplificar, aqui usamos um
    // token único de vida mais longa.
    'jwt_ttl_seconds' => 60 * 60 * 24 * 7, // 7 dias

    // Domínios autorizados a chamar esta API (CORS). Coloque a URL do seu
    // frontend em produção (ex: 'https://meusite.com') e, se precisar, o
    // endereço usado em desenvolvimento local.
    'allowed_origins' => [
        'http://localhost:3000',
    ],
];
