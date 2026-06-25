-- ============================================================
-- Comida — Auth + Row Level Security (RLS)
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → colar → Run
-- Rode os passos NA ORDEM. O passo 2 precisa do seu user_id (ver instruções).
-- ============================================================

-- ------------------------------------------------------------
-- PASSO 1 — Adicionar colunas de dono (pode rodar agora)
-- ------------------------------------------------------------
alter table items   add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table recipes add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table recipes add column if not exists is_shared boolean not null default false;
alter table settings add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- ------------------------------------------------------------
-- PASSO 2 — Adotar os dados que já existem (eles ficam SEUS)
--   Antes de rodar este passo:
--     1) Ative o login por email (ver README abaixo do arquivo)
--     2) Entre no app uma vez com SEU email (cria seu usuário)
--     3) Pegue seu UUID em: Authentication → Users → (clique no seu email)
--     4) Substitua 'COLE-SEU-UUID-AQUI' pelo seu UUID e rode este bloco
-- ------------------------------------------------------------
update items    set user_id = 'COLE-SEU-UUID-AQUI' where user_id is null;
update recipes  set user_id = 'COLE-SEU-UUID-AQUI' where user_id is null;
update settings set user_id = 'COLE-SEU-UUID-AQUI' where user_id is null;

-- ------------------------------------------------------------
-- PASSO 4 — Ligar o Row Level Security
-- ------------------------------------------------------------
alter table items    enable row level security;
alter table recipes  enable row level security;
alter table settings enable row level security;

-- ------------------------------------------------------------
-- PASSO 5 — Regras de acesso
-- ------------------------------------------------------------
-- items: 100% privado do dono (lista de compras + despensa)
create policy "items_own" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- settings: chave do Gemini COMPARTILHADA — todo amigo logado LÊ a sua
--           chave (pra usar o "Suggest"), mas só VOCÊ (o dono da linha)
--           pode criar/editar/apagar.
create policy "settings_read_all" on settings
  for select using (auth.uid() is not null);
create policy "settings_owner_write" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes: você lê as SUAS + as que qualquer amigo marcou como compartilhada;
--          mas só pode criar/editar/apagar as suas.
create policy "recipes_read" on recipes
  for select using (auth.uid() = user_id or is_shared = true);
create policy "recipes_insert" on recipes
  for insert with check (auth.uid() = user_id);
create policy "recipes_update" on recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipes_delete" on recipes
  for delete using (auth.uid() = user_id);
