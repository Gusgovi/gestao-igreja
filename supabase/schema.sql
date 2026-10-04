-- =============================================================
-- Gestão de Igreja – esquema do banco (Supabase / Postgres)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Membros ----------
create table if not exists membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  data_nascimento date,
  data_batismo date,
  endereco text,
  status text not null default 'ativo' check (status in ('ativo', 'visitante', 'inativo')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- ---------- Ministérios ----------
create table if not exists ministerios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  lider_id uuid references membros(id) on delete set null,
  cor text default '#6d4aff',
  created_at timestamptz not null default now()
);

-- Quem participa de cada ministério
create table if not exists ministerio_membros (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references ministerios(id) on delete cascade,
  membro_id uuid not null references membros(id) on delete cascade,
  unique (ministerio_id, membro_id)
);

-- ---------- Escalas ----------
-- Cada linha = uma pessoa escalada em um dia, em um ministério, numa função
create table if not exists escalas (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references ministerios(id) on delete cascade,
  membro_id uuid references membros(id) on delete set null,
  data date not null,
  funcao text,
  observacao text,
  created_at timestamptz not null default now()
);
create index if not exists escalas_data_idx on escalas (data);

-- ---------- Louvor ----------
create table if not exists musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text,
  tom text,
  bpm int,
  link text,
  letra text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists ensaios (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora text,
  local text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists ensaio_musicas (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references ensaios(id) on delete cascade,
  musica_id uuid not null references musicas(id) on delete cascade,
  ordem int default 0
);

-- ---------- Cantina ----------
create table if not exists cantina_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null default 0,
  disponivel boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cantina_vendas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  item_id uuid references cantina_itens(id) on delete set null,
  item_nome text,
  quantidade int not null default 1,
  valor_unitario numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Eventos (banners da home) ----------
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data date not null,
  hora text,
  local text,
  imagem_url text,
  created_at timestamptz not null default now()
);

-- ---------- Área de ensino ----------
create table if not exists conteudos (
  id uuid primary key default gen_random_uuid(),
  secao text not null check (secao in ('abc', 'fundamentos', 'visao')),
  titulo text not null,
  corpo text,
  ordem int default 0,
  created_at timestamptz not null default now()
);

-- =============================================================
-- Segurança (RLS)
-- MVP: qualquer pessoa logada pode ler e editar tudo.
-- Eventos e conteúdos de ensino podem ser lidos sem login.
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array['membros','ministerios','ministerio_membros','escalas','musicas',
                           'ensaios','ensaio_musicas','cantina_itens','cantina_vendas','eventos','conteudos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "logado pode tudo" on %I', t);
    execute format('create policy "logado pode tudo" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "publico le eventos" on eventos;
create policy "publico le eventos" on eventos for select to anon using (true);

drop policy if exists "publico le conteudos" on conteudos;
create policy "publico le conteudos" on conteudos for select to anon using (true);
