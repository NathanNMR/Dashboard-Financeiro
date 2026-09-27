# SmartFinance API — pacote standalone para Render

Este branch contém somente o backend PHP/MySQL do projeto SmartFinance,
separado do frontend Next.js para ser publicado como um **Web Service Docker**
no Render.

## Estrutura

```text
├── api/                  # Endpoints REST
├── lib/                  # Banco, JWT, HTTP e autorização
├── scripts/              # Migração do schema
├── .htaccess             # Proteção dos arquivos internos
├── bootstrap.php         # Bootstrap compartilhado
├── config.example.php    # Configuração local opcional
├── schema.sql            # Estrutura do MySQL
├── Dockerfile            # Imagem PHP 8.3 + Apache + PDO MySQL
├── render.yaml           # Blueprint do Render
└── .env.example          # Variáveis necessárias
```

## 1. Banco MySQL

Antes de usar cadastro/login, crie um banco MySQL e aplique `schema.sql`.

Variáveis necessárias:

```env
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
```

## 2. Variáveis no Render

Além do banco, configure:

```env
JWT_SECRET=<chave aleatória longa, mínimo 32 caracteres>
JWT_TTL_SECONDS=86400
ALLOWED_ORIGINS=https://SEU-SITE.netlify.app
FRONTEND_URL=https://SEU-SITE.netlify.app
```

Se usar o `render.yaml` como Blueprint, o Render gera `JWT_SECRET`
automaticamente e solicita os valores marcados como `sync: false`.

## 3. Deploy no Render

### Blueprint

1. No Render, escolha **New > Blueprint**.
2. Selecione o repositório `NathanNMR/Dashboard-Financeiro`.
3. Selecione a branch `render-api`.
4. O Render encontrará `render.yaml`.
5. Preencha as variáveis do MySQL e as URLs do frontend.
6. Crie o serviço.

### Web Service

1. No Render, escolha **New > Web Service**.
2. Conecte `NathanNMR/Dashboard-Financeiro`.
3. Selecione a branch `render-api`.
4. Runtime/Language: **Docker**.
5. Dockerfile: `./Dockerfile`.
6. Health Check Path: `/api/health.php`.
7. Adicione todas as variáveis descritas acima.
8. Faça o deploy.

## 4. Teste

Quando estiver no ar, abra:

```text
https://SEU-SERVICO.onrender.com/api/health.php
```

Com banco acessível, a resposta esperada é:

```json
{
  "status": "ok",
  "service": "smartfinance-api",
  "database": "ok"
}
```

Teste de cadastro:

```bash
curl -X POST https://SEU-SERVICO.onrender.com/api/register.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@example.com","password":"senha12345","accountType":"personal"}'
```

## 5. Conectar ao frontend no Netlify

Depois que a API estiver funcionando, crie no frontend a variável:

```env
NEXT_PUBLIC_API_URL=https://SEU-SERVICO.onrender.com/api
```

Faça um novo deploy do frontend após alterar essa variável.

## Segurança

- Não faça commit de `.env` nem `config.php`.
- Não coloque credenciais reais em `render.yaml`.
- Mantenha `JWT_SECRET` longo e aleatório.
- `ALLOWED_ORIGINS` deve conter somente os domínios autorizados.
- Quando o frontend ganhar domínio personalizado, atualize `ALLOWED_ORIGINS` e `FRONTEND_URL`.
