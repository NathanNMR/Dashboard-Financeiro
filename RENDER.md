# Deploy no Render

O projeto está preparado para dois serviços:

- **smartfinance**: frontend Next.js exportado como site estático;
- **smartfinance-api**: API PHP em Docker.

O MySQL pode ficar em um provedor externo ou em um serviço MySQL separado com disco persistente. As credenciais nunca devem ser commitadas.

## Variáveis do frontend

```
NEXT_PUBLIC_API_URL=https://<URL-DA-API>/api
```

Essa variável é incorporada no build do Next.js, portanto faça um novo deploy do frontend se a URL mudar.

## Variáveis da API

```
DB_HOST=<host mysql>
DB_PORT=3306
DB_NAME=<database>
DB_USER=<user>
DB_PASSWORD=<password>
JWT_SECRET=<chave aleatória longa>
JWT_TTL_SECONDS=86400
ALLOWED_ORIGINS=https://<URL-DO-FRONTEND>
FRONTEND_URL=https://<URL-DO-FRONTEND>
```

Para mais de uma origem CORS, use valores separados por vírgula em `ALLOWED_ORIGINS`.

## Banco

Antes do primeiro uso, aplique `backend/schema.sql` no banco MySQL.

A API possui:

```
GET /api/health.php
```

para health check e:

```
php backend/scripts/migrate.php
```

para aplicar o schema a partir de um ambiente que tenha as variáveis de banco configuradas.

## Importante

Dados financeiros agora são persistidos no MySQL por conta financeira. O `localStorage` é mantido apenas para preferências locais e autenticação atual.

A branch `chatgpt/render-ready` também gera automaticamente um artefato ZIP pelo GitHub Actions.
