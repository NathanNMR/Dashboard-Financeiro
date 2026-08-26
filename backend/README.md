# Backend SmartFinance (PHP + MySQL)

API REST em PHP puro (sem framework, sem Composer) feita para rodar em
hospedagem compartilhada como InfinityFree ou Hostinger, que geralmente só
oferecem PHP + MySQL via cPanel.

## 1. Criar o banco no MySQL Workbench

1. Abra o MySQL Workbench e conecte no servidor MySQL (local, para testar
   antes de subir pra hospedagem, ou já direto no da hospedagem se ela expõe
   acesso remoto).
2. `File → Open SQL Script...` e selecione `backend/schema.sql`, ou cole o
   conteúdo do arquivo numa aba de Query.
3. Execute com o raio ⚡ (ou `Ctrl+Shift+Enter`). Isso cria todas as tabelas:
   `users`, `accounts`, `account_members`, `account_invites`, `auth_tokens`,
   `transactions`, `bills`, `budgets`, `credit_cards`, `goals`, `categories`.
4. Na hospedagem (InfinityFree/Hostinger), o banco geralmente precisa ser
   criado primeiro pelo painel (cPanel → MySQL Databases), porque esses
   provedores não deixam criar bancos direto via SQL. Depois disso, é só
   rodar o `schema.sql` dentro do banco já criado (via phpMyAdmin, que
   normalmente já vem no painel).

## 2. Configurar credenciais

Copie `backend/config.example.php` para `backend/config.php` (esse arquivo
**não é commitado** — está no `.gitignore`) e preencha com os dados reais:

```php
'db' => [
    'host' => 'localhost',       // no InfinityFree costuma ser algo como sqlXXX.infinityfree.com
    'name' => 'epiz_1234_meubanco',
    'user' => 'epiz_1234_meuusuario',
    'pass' => 'sua_senha',
    'charset' => 'utf8mb4',
],
'jwt_secret' => '<gere uma string aleatória de 64 caracteres>',
'allowed_origins' => ['https://meudashboard.com'],
```

Gere uma chave JWT segura com:

```bash
openssl rand -hex 32
```

## 3. Subir para a hospedagem

Envie a pasta `backend/` inteira (via FTP/File Manager do cPanel) para uma
subpasta do seu domínio, por exemplo `public_html/api/`. Resultado:

```
public_html/
├── api/                  (conteúdo de backend/, incluindo o config.php preenchido)
│   ├── api/
│   │   ├── register.php
│   │   ├── login.php
│   │   └── ...
│   ├── lib/
│   ├── config.php
│   └── .htaccess
└── (arquivos estáticos do frontend Next.js, gerados por `npm run build` → pasta `out/`)
```

A URL da API então fica `https://meudashboard.com/api/api/register.php` —
se preferir algo mais limpo, renomeie a pasta `api/` interna ou ajuste a
estrutura; o importante é que `config.php`, `schema.sql` e a pasta `lib/`
**nunca fiquem acessíveis diretamente pelo navegador** (o `.htaccess`
incluído já bloqueia isso em servidores Apache, que é o padrão nesses
provedores).

## 4. Testar

```bash
curl -X POST https://meudashboard.com/api/api/register.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Seu Nome","email":"voce@email.com","password":"senha12345","accountType":"personal"}'
```

Deve retornar um `token` JWT e os dados da conta criada.

## Endpoints disponíveis

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/register.php` | Cria usuário + conta (pessoal ou empresa) |
| POST | `/api/login.php` | Login, retorna token + lista de contas |
| GET | `/api/me.php` | Dados do usuário logado (valida o token) |
| POST | `/api/invites.php` | Cria convite de equipe (owner/admin, só em contas empresa) |
| GET | `/api/invites.php?account_id=` | Lista convites pendentes |
| POST | `/api/invite-accept.php` | Aceita um convite (entra na equipe) |
| GET | `/api/members.php?account_id=` | Lista membros da conta |
| DELETE | `/api/members.php` | Remove um membro (owner/admin) |
| GET/POST/PUT/DELETE | `/api/transactions.php` | Transações (suporta lote para parcelas/recorrências e `all:true` para apagar tudo) |
| GET/POST/PUT/DELETE | `/api/bills.php` | Contas/compromissos |
| GET/PUT | `/api/budgets.php` | Orçamento por categoria |
| GET/POST/DELETE | `/api/credit-cards.php` | Cartões de crédito |
| GET/POST/PUT/DELETE | `/api/goals.php` | Metas |
| GET/POST/DELETE | `/api/categories.php` | Categorias personalizadas |

Toda rota de dados (exceto `register`/`login`/`invite-accept`) exige o header
`Authorization: Bearer <token>` e um `account_id` — o backend sempre confere
se o usuário logado é membro daquela conta antes de deixar ler/escrever
qualquer coisa (isolamento multi-tenant).

## Convites de equipe (sem servidor de e-mail)

Hospedagem compartilhada gratuita costuma bloquear envio de e-mail (SMTP).
Por isso, `POST /api/invites.php` **não envia e-mail** — ele retorna um
`invite_link` pronto que você copia e manda manualmente (WhatsApp, e-mail
pessoal etc.) para a pessoa convidada. Se depois você quiser automatizar,
plugue um serviço de e-mail transacional (Resend, SendGrid, Brevo) dentro de
`api/invites.php`.

## O que ainda falta (próxima etapa)

Este backend já está completo e testado (schema + API), mas o frontend
Next.js **ainda guarda os dados financeiros no localStorage do navegador**,
não no MySQL. A tela de login/registro/seleção de conta já existe e protege
o acesso ao dashboard, mas a migração de cada tela (transações, contas,
metas, cartões, categorias) para consumir esta API é o próximo passo —
avise quando quiser seguir com isso.
