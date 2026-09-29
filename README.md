# SmartFinance — Dashboard Financeiro

Aplicativo de controle financeiro pessoal e de equipes com **Next.js 16, React 19, TypeScript, Tailwind CSS 4, PHP 8.3 e MySQL**.

**Site:** [nmrfinance.netlify.app](https://nmrfinance.netlify.app/)

O frontend está no Netlify, a API PHP está no Render e o MySQL está no Aiven. Cada conta financeira possui seus próprios dados; cadastro e login usam autenticação com token. O Netlify publica somente os arquivos estáticos gerados pelo Next.js.

## Funcionalidades

- Receitas, despesas, extrato, parcelamentos e lançamentos recorrentes.
- Contas a pagar e rendas a receber, com juros e multa.
- Orçamentos por categoria, cartões de crédito, metas e projeções.
- Relatórios, gráficos, importação e exportação CSV e imagem.
- Listas de compras com orçamento opcional, itens, quantidades e preços unitários. O total é calculado automaticamente; o valor pago no caixa registra descontos ou diferenças. A compra pode ser lançada como despesa no extrato.
- Modo claro e escuro, com preferência salva no navegador.
- Widget [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras) para tradução automática de conteúdo em português para Libras. A tradução depende do serviço externo e pode ter limitações.
- Interface responsiva e aplicativo instalável (PWA).

## Desenvolvimento local

Requisitos: Node.js 20+, npm, PHP 8.3 com `pdo_mysql` e MySQL. As instruções completas da API e do esquema estão em [backend/README.md](backend/README.md).

```bash
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8099/api npm run dev
```

Abra `http://localhost:3000`. Configure a API PHP e o banco conforme a documentação do backend. Para verificar o frontend:

```bash
npm run typecheck
npm run build
```

A variável `NEXT_PUBLIC_API_URL` é incorporada durante o build estático: alterar seu valor no Netlify exige novo deploy.

## Publicação e atualizações do banco

Veja [NETLIFY.md](NETLIFY.md) para as etapas detalhadas do Netlify, Render e Aiven. A API usa o Dockerfile na raiz e o Blueprint `render.yaml`. Credenciais e certificado CA do banco são variáveis do Render; **não os adicione ao GitHub**.

A lista de compras usa a nova tabela `shopping_lists`. Para atualizar uma instalação existente:

1. No Render, configure temporariamente `DB_MIGRATE_USER=avnadmin`, `DB_MIGRATE_PASSWORD` com a senha administrativa do Aiven e `RUN_DB_MIGRATION=1`.
2. Faça um novo deploy da API. O script aplica `backend/schema.sql` de modo reexecutável, sem apagar compras, contas ou transações existentes.
3. Confira o health check e os logs; depois altere `RUN_DB_MIGRATION=0`, remova as duas variáveis administrativas e publique novamente.

Sem essa migração, apenas a nova seção **Compras** falhará ao carregar; as outras seções continuam com suas tabelas existentes. As listas são salvas no MySQL por conta, assim como os demais dados financeiros.

## Estrutura

| Caminho | Função |
| --- | --- |
| `app/`, `components/` | Interface e visualizações |
| `hooks/` | Autenticação, dados financeiros e listas de compras |
| `lib/` | Tipos, cálculos, CSV e cliente da API |
| `backend/api/` | Endpoints PHP autenticados |
| `backend/schema.sql` | Tabelas MySQL e migração reexecutável |
| `render.yaml`, `netlify.toml` | Configuração de publicação |

## Segurança e limites

A API confere o acesso do usuário à conta antes de ler ou alterar os dados. Os dados financeiros e as listas de compras são armazenados no MySQL; o navegador guarda o token de sessão e preferências de interface. A sincronização usa atualização do conjunto de listas por conta: edições simultâneas da mesma lista em dois dispositivos podem sobrescrever umas às outras.

Projeto desenvolvido para estudo e portfólio por [Nathan Moreira Ramos](https://github.com/NathanNMR).
