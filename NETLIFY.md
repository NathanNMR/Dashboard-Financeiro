# Frontend no Netlify e API no Render

O frontend está em https://nmrfinance.netlify.app/. Cadastro e login precisam da API PHP e do MySQL. O arquivo `render.yaml` deste repositório cria **somente a API** no plano gratuito do Render; o frontend permanece no Netlify.

O banco `smartfinance` já existe no serviço Aiven `jurassihealth-mysql`. Ele compartilha a capacidade gratuita de 1 GB com `clinica_jurassihealth` e pode desligar após inatividade. A primeira implantação cria as tabelas e o usuário SQL `smartfinance_app`, com acesso limitado ao banco `smartfinance`.

## 1. Criar a API no seu navegador

1. No Render, escolha **New → Blueprint**, conecte sua conta GitHub e selecione `NathanNMR/Dashboard-Financeiro`, branch `main`. Revise o serviço `smartfinance-api` antes de aplicar o Blueprint. Ele usa Docker, plano Free e health check `/api/health.php`; o Apache escuta na porta 10000.
2. O Blueprint já define `DB_HOST`, `DB_PORT=20110`, `DB_NAME=smartfinance`, `DB_USER=smartfinance_app`, `DB_MIGRATE_USER=avnadmin`, `ALLOWED_ORIGINS` e `FRONTEND_URL` para a URL atual do Netlify. O Render gera `JWT_SECRET`.
3. Preencha os campos solicitados pelo Render:

| Variável | Valor a informar |
| --- | --- |
| `DB_PASSWORD` | Crie uma senha longa e nova para `smartfinance_app`; a migração atribuirá essa senha ao usuário SQL. |
| `DB_MIGRATE_PASSWORD` | Senha atual de `avnadmin` no Aiven, somente para a primeira implantação. |
| `DB_SSL_CA_PEM` | Certificado CA completo do serviço Aiven, incluindo as linhas `BEGIN CERTIFICATE` e `END CERTIFICATE`. |
| `RUN_DB_MIGRATION` | `1` na primeira implantação. |

Encontre o certificado na página do serviço Aiven, em **Overview → Connection information**. Cole o PEM inteiro no campo do Render, preservando as quebras de linha. Não coloque senhas nem o certificado em arquivos do repositório ou mensagens.

4. Aplique o Blueprint e acompanhe os logs. Quando a implantação terminar, abra `https://smartfinance-api.onrender.com/api/health.php` (ou a URL exata indicada pelo Render). O JSON deve conter `"status":"ok"` e `"database":"ok"`.
5. Após o primeiro health check bem-sucedido, em **Environment** do serviço no Render, mude `RUN_DB_MIGRATION` para `0` e exclua `DB_MIGRATE_PASSWORD` e `DB_MIGRATE_USER`. Salve e aguarde a nova implantação. O usuário `smartfinance_app` continua com sua senha em `DB_PASSWORD`. O Blueprint não reescreve as variáveis marcadas com `sync: false` nas sincronizações futuras.

Se a implantação inicial falhar, mantenha `RUN_DB_MIGRATION=1` e as credenciais administrativas enquanto corrige o erro. A migração pode ser repetida. Uma resposta 503 no health check aponta para falha de conexão com o banco; verifique os logs e o estado do serviço Aiven.

## 2. Conectar o Netlify

No Netlify, abra o site existente em **Site configuration → Environment variables**. Defina `NEXT_PUBLIC_API_URL=https://smartfinance-api.onrender.com/api`, substituindo o host pela URL real do Render e sem barra final. Inicie um novo deploy do frontend: essa variável é incorporada durante o build.

Teste o cadastro em https://nmrfinance.netlify.app/. Se falhar, inspecione `register.php` em DevTools → Network. Erro de rede indica URL, servidor ou CORS; HTTP 409 indica e-mail já cadastrado; HTTP 500/503 sugere problema na API ou no banco. `Access-Control-Allow-Origin` deve corresponder à origem do site.

## 3. Domínio personalizado, quando você tiver um

Depois de comprar um domínio e confirmar que o cadastro funciona, use **Domain management → Production domains → Add a domain** no Netlify. Siga os registros DNS apresentados pelo Netlify e aguarde a validação DNS e HTTPS.

Atualize `ALLOWED_ORIGINS` e `FRONTEND_URL` no Render com a nova URL HTTPS. Durante a transição, `ALLOWED_ORIGINS` pode conter a URL `netlify.app` e o domínio novo separados por vírgula. A API pode continuar em `onrender.com`; se optar por um subdomínio próprio para ela, atualize também `NEXT_PUBLIC_API_URL` no Netlify e faça novo deploy.
