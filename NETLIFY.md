# Frontend no Netlify e API no Render

O Netlify hospeda o frontend estático em `out/`. O cadastro e o login precisam da API PHP e do MySQL; publicar só o frontend não cria usuários.

1. Prepare um banco MySQL acessível pela API e aplique `backend/schema.sql` (ou execute `php backend/scripts/migrate.php` com as variáveis de banco configuradas). O banco deve existir antes da migração; o script usa o banco definido em `DB_NAME`. Não coloque credenciais no GitHub.
2. No Render, crie o serviço Docker da API usando este repositório, `Dockerfile` na raiz, e configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (pelo menos 32 caracteres), `ALLOWED_ORIGINS` e `FRONTEND_URL`. Para Aiven, cole o certificado CA completo em `DB_SSL_CA_PEM`; a conexão verificará o certificado TLS. O `render.yaml` também descreve esse serviço. Defina `ALLOWED_ORIGINS` com a URL exata do site Netlify, por exemplo `https://nmrfinance.netlify.app`, sem barra final.
3. Verifique `https://<api>.onrender.com/api/health.php`. O resultado deve conter `"status":"ok"` e `"database":"ok"`. Uma resposta 503 indica problema com o banco.
4. No Netlify, importe o repositório. O `netlify.toml` define o build e a pasta `out`. Em **Site configuration → Environment variables**, defina `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api` (sem barra final) e faça novo deploy. Essa variável entra nos arquivos gerados durante o build.
5. Cadastre uma conta no site. Se houver erro, confira a requisição `register.php` em DevTools → Network: erro de rede costuma indicar URL, servidor ou CORS; HTTP 409 indica e-mail já cadastrado; HTTP 500/503 indica problema no backend ou banco. Para testar CORS, confira se o cabeçalho `Access-Control-Allow-Origin` corresponde à URL do frontend.

## Domínio personalizado

Depois que o cadastro funcionar na URL `netlify.app`, abra **Domain management → Production domains → Add a domain** no Netlify. Informe um domínio que você possui e siga os registros DNS específicos mostrados pelo Netlify para seu caso. Se ainda não tiver um domínio, é preciso registrar um. Aguarde a verificação DNS e HTTPS.

Ao trocar a URL pública, atualize `ALLOWED_ORIGINS` e `FRONTEND_URL` na API para `https://seu-dominio` e republique o frontend se mudar `NEXT_PUBLIC_API_URL`. Durante a transição, `ALLOWED_ORIGINS` pode conter a URL `netlify.app` e o domínio novo, separadas por vírgula. O domínio da API pode continuar `onrender.com` ou ser configurado separadamente, por exemplo `api.seu-dominio`.
