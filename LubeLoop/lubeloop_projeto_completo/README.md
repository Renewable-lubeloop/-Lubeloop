# EcoOLUC - Plataforma SaaS para Coleta de OLUC

Este projeto contém o código completo (React + Tailwind CSS + Supabase/PostgreSQL) para a plataforma de coleta de Óleo Lubrificante Usado ou Contaminado.

## Passos Rápidos para Colocar no Ar:

### 1. Banco de Dados (Supabase)
1. Acesse https://supabase.com e crie um projeto gratuito.
2. Abra o **SQL Editor** no painel do Supabase.
3. Copie o conteúdo do arquivo `schema.sql` e clique em **Run**.
4. Copie as chaves API em **Settings > API** (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).

### 2. Rodar Localmente
```bash
npm install
cp .env.example .env.local
# Cole suas chaves do Supabase no .env.local
npm run dev
```

### 3. Publicar na Vercel (Hospedagem Gratuita/Baixo Custo)
1. Suba esta pasta para o GitHub (veja o guia de comandos no projeto).
2. Acesse https://vercel.com e importe o repositório.
3. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Clique em **Deploy**.

### 4. Apontar o Domínio Próprio
No painel da Vercel em **Settings > Domains**, insira o seu subdomínio (ex: `coleta.rampinelli.com.br`) e adicione o CNAME no seu provedor de DNS (`cname.vercel-dns.com`).
