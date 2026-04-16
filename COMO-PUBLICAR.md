# Como publicar o School Hub na internet

Siga esses passos uma vez só. Depois disso, o site fica no ar 24h por dia e salva tudo automaticamente.

---

## O que você vai precisar

- Uma conta gratuita no **GitHub** (github.com)
- Uma conta gratuita no **Railway** (railway.app) — faça login com o GitHub

---

## Passo 1 — Instalar o Node.js no seu computador (só na primeira vez)

1. Acesse https://nodejs.org e baixe a versão **LTS**
2. Instale normalmente (next, next, finish)
3. Abra o terminal (no Mac: `Cmd+Espaço` → "Terminal"; no Windows: `Win+R` → "cmd")
4. Digite `node -v` e pressione Enter — deve aparecer algo como `v20.x.x`

---

## Passo 2 — Preparar a pasta do projeto

No terminal, navegue até a pasta do School Hub:

```
cd "caminho/para/a/pasta/School hub"
```

Instale as dependências:
```
npm install
```

Defina sua senha de acesso (faça isso uma vez):
```
node setup-password.js
```
→ Digite a senha que quiser e pressione Enter.

---

## Passo 3 — Testar localmente

```
node server.js
```

Abra o navegador em **http://localhost:3000** — o School Hub deve aparecer com tela de login.
Pressione `Ctrl+C` no terminal para parar.

---

## Passo 4 — Publicar no GitHub

1. Crie uma conta em https://github.com (se não tiver)
2. Clique em **New repository** (botão verde)
3. Nome: `school-hub` → clique **Create repository**
4. Na página do repositório criado, clique em **uploading an existing file**
5. Arraste todos os arquivos da pasta `School hub` para lá:
   - `student-progress-hub.html`
   - `server.js`
   - `package.json`
   - `setup-password.js`
   - `.env.example`
   - `.gitignore`
   - `COMO-PUBLICAR.md`
   
   ⚠️ **NÃO envie:** `roca-two-regular.ttf`, a pasta `data/`, nem o arquivo `.env`

6. Clique **Commit changes**

---

## Passo 5 — Publicar no Railway

1. Acesse https://railway.app e clique **Login with GitHub**
2. Clique **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório `school-hub`
4. Aguarde o deploy (1-2 minutos)

### Configurar variáveis de ambiente no Railway:

Ainda no painel do Railway, vá em **Variables** e adicione:

| Nome | Valor |
|------|-------|
| `JWT_SECRET` | Uma frase secreta longa (ex: `minhaSenhaSecretaParaOSchoolHub2024`) |

### Configurar a senha inicial no Railway:

1. No Railway, clique em **Settings** → **Public Networking** → habilite um domínio público
2. Vá em **Deploy** → clique na aba **Shell** (terminal do servidor)
3. Digite: `node setup-password.js` e defina sua senha

---

## Passo 6 — Acessar de qualquer lugar

Após o deploy, o Railway vai dar um endereço como:
`https://school-hub-production-xxxx.up.railway.app`

Esse é o link do seu School Hub. Acesse de qualquer dispositivo, faça login com sua senha, e tudo salva automaticamente.

---

## Como atualizar o site depois

Quando modificar o `student-progress-hub.html` ou qualquer outro arquivo:
1. No GitHub, vá ao arquivo e clique no lápis (editar) — ou use **Add file → Upload files**
2. Faça o upload do arquivo atualizado
3. O Railway detecta automaticamente e republica em ~1 minuto

---

## Backup dos dados

Os dados ficam em `data/schoolhub.json` no servidor Railway. Para baixar um backup:
1. Vá ao Railway → **Shell**
2. Digite: `cat data/schoolhub.json`
3. Copie o conteúdo e salve num arquivo `.json` no seu computador

---

## Dúvidas?

- Railway gratuito: até 500 horas/mês (suficiente para uso pessoal)
- Se o site ficar inativo por muito tempo, o Railway pode suspender — basta acessar para reativar
- Para plano sempre ativo: Railway Hobby = US$5/mês
