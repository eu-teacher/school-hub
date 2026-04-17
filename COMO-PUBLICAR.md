# Como publicar o School Hub na internet

Siga esses passos uma vez só. Depois disso, o site fica no ar 24h por dia e **todos os dados ficam salvos no Supabase** — nunca se perdem, mesmo que o Railway reinicie.

---

## O que você vai precisar

- Uma conta gratuita no **GitHub** (github.com)
- Uma conta gratuita no **Railway** (railway.app) — faça login com o GitHub
- Uma conta gratuita no **Supabase** (supabase.com) — já configurada ✅

---

## Passo 1 — Instalar o Node.js no seu computador (só na primeira vez)

1. Acesse https://nodejs.org e baixe a versão **LTS**
2. Instale normalmente (next, next, finish)
3. Abra o terminal (no Mac: `Cmd+Espaço` → "Terminal"; no Windows: `Win+R` → "cmd")
4. Digite `node -v` e pressione Enter — deve aparecer algo como `v20.x.x`

---

## Passo 2 — Criar a tabela no Supabase (só na primeira vez)

1. Acesse https://supabase.com e faça login
2. Entre no seu projeto
3. Clique em **SQL Editor** no menu lateral
4. Cole e execute este comando:

```sql
CREATE TABLE IF NOT EXISTS schoolhub_data (
  id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

5. Clique **Run** — pronto!

---

## Passo 3 — Publicar no GitHub

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
   
   ⚠️ **NÃO envie:** `roca-two-regular.ttf` nem o arquivo `.env`

6. Clique **Commit changes**

---

## Passo 4 — Publicar no Railway

1. Acesse https://railway.app e clique **Login with GitHub**
2. Clique **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório `school-hub`
4. Aguarde o deploy (1-2 minutos)

### Configurar variáveis de ambiente no Railway:

Vá em **Variables** e adicione as seguintes:

| Nome | Valor |
|------|-------|
| `JWT_SECRET` | Uma frase secreta longa (ex: `minhaSenhaSecretaParaOSchoolHub2024`) |
| `SUPABASE_URL` | O URL do seu projeto Supabase (ex: `https://vglxntfdnrdd...supabase.co`) |
| `SUPABASE_KEY` | Sua service role key do Supabase |
| `ADMIN_PASSWORD_HASH` | O hash gerado com `node setup-password.js` |

> **Onde encontrar SUPABASE_URL e SUPABASE_KEY:** No painel do Supabase → **Project Settings** → **API** → copie a "Project URL" e a chave "service_role" (em "Project API keys")

### Configurar a senha inicial:

1. No terminal do seu computador, entre na pasta do projeto e rode:
   ```
   node setup-password.js
   ```
2. Digite a senha que quiser — vai aparecer um hash longo começando com `$2b$...`
3. Copie esse hash e cole como valor da variável `ADMIN_PASSWORD_HASH` no Railway

---

## Passo 5 — Acessar de qualquer lugar

Após o deploy, o Railway vai dar um endereço como:
`https://school-hub-production-xxxx.up.railway.app`

Esse é o link do seu School Hub. Acesse de qualquer dispositivo, faça login com sua senha, e **tudo salva automaticamente no Supabase** — permanente e seguro.

---

## Por que agora é melhor do que antes?

| Antes | Agora |
|-------|-------|
| Dados salvos no Railway (se reiniciar, perde tudo) | Dados salvos no Supabase (nunca se perdem) |
| Precisa de `auth.json` no servidor | Senha configurada via variável de ambiente |
| Dados só no servidor | Dados acessíveis de qualquer lugar |

---

## Como atualizar o site depois

Quando modificar o `student-progress-hub.html` ou qualquer outro arquivo:
1. No GitHub, vá ao arquivo e clique no lápis (editar) — ou use **Add file → Upload files**
2. Faça o upload do arquivo atualizado
3. O Railway detecta automaticamente e republica em ~1 minuto

---

## Migrar dados antigos do Railway para o Supabase

Se você tinha dados no Railway e quer recuperá-los:
1. Vá ao Railway → seu projeto → aba **Shell** (terminal do servidor)
2. Digite: `cat data/schoolhub.json` e copie todo o conteúdo
3. Me mande esse conteúdo aqui que eu importo para o Supabase pra você!

---

## Dúvidas?

- Railway gratuito: até 500 horas/mês (suficiente para uso pessoal)
- Supabase gratuito: até 500 MB de dados (mais do que suficiente)
- Se o site ficar inativo por muito tempo, o Railway pode suspender — basta acessar para reativar
- Para plano sempre ativo: Railway Hobby = US$5/mês
