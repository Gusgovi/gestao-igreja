-- =============================================================
-- Gestão de Igreja – esquema do banco (Supabase / Postgres)
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem perder dados: o script só cria o que falta
-- e recria as regras de segurança.
--
-- Papéis:
--   admin     – secretaria/pastores: cadastra e edita tudo.
--   líder     – não é um papel gravado: é quem está como líder de um
--               ministério (ministerios.lider_id). Edita os participantes
--               e a escala do próprio ministério. O líder do ministério
--               "Louvor" cuida também de músicas e ensaios; o da
--               "Cantina", do cardápio e do caixa.
--   membro    – vê as informações internas (escalas, louvor, cantina...).
--               Quem participa da Cantina também registra vendas.
--   pendente  – fez login mas ainda não foi ligado a um membro: não vê nada.
--
-- Como um login vira membro: a secretaria cadastra o membro com o mesmo
-- e-mail do login. O banco liga os dois sozinho (nos dois sentidos: se o
-- membro já existia quando o login foi criado, ou se foi cadastrado depois).
-- O PRIMEIRO login criado no projeto vira admin automaticamente.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Membros ----------
create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  telefone text,
  email text,
  data_nascimento date,
  data_batismo date,
  endereco text,
  status text not null default 'ativo' check (status in ('ativo', 'visitante', 'inativo')),
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists membros_email_idx on public.membros (lower(email));

-- ---------- Ministérios ----------
create table if not exists public.ministerios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  descricao text,
  lider_id uuid references public.membros(id) on delete set null,
  cor text default '#6d4aff',
  created_at timestamptz not null default now()
);
create index if not exists ministerios_lider_idx on public.ministerios (lider_id);
-- as regras de Louvor e Cantina procuram o ministério pelo nome
create index if not exists ministerios_nome_idx on public.ministerios (lower(nome));

-- Quem participa de cada ministério
create table if not exists public.ministerio_membros (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  unique (ministerio_id, membro_id)
);
create index if not exists ministerio_membros_membro_idx on public.ministerio_membros (membro_id);

-- ---------- Escalas ----------
-- Cada linha = uma pessoa escalada em um dia, em um ministério, numa função
create table if not exists public.escalas (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  membro_id uuid references public.membros(id) on delete set null,
  data date not null,
  funcao text,
  observacao text,
  created_at timestamptz not null default now()
);
create index if not exists escalas_data_idx on public.escalas (data);
create index if not exists escalas_ministerio_data_idx on public.escalas (ministerio_id, data);
create index if not exists escalas_membro_idx on public.escalas (membro_id);

-- ---------- Louvor ----------
create table if not exists public.musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  artista text,
  tom text,
  bpm int check (bpm is null or bpm between 20 and 300),
  link text,
  letra text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ensaios (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora text,             -- 'HH:MM', como vem do campo de hora da tela
  local text,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists ensaios_data_idx on public.ensaios (data);

create table if not exists public.ensaio_musicas (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.ensaios(id) on delete cascade,
  musica_id uuid not null references public.musicas(id) on delete cascade,
  ordem int not null default 0
);
create index if not exists ensaio_musicas_ensaio_idx on public.ensaio_musicas (ensaio_id, ordem);
create index if not exists ensaio_musicas_musica_idx on public.ensaio_musicas (musica_id);

-- ---------- Cantina ----------
create table if not exists public.cantina_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  disponivel boolean not null default true,
  created_at timestamptz not null default now()
);

-- item_nome e valor_unitario guardam como o item estava no dia da venda,
-- para o caixa antigo não mudar se o preço for alterado depois.
create table if not exists public.cantina_vendas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  item_id uuid references public.cantina_itens(id) on delete set null,
  item_nome text,
  quantidade int not null default 1 check (quantidade > 0),
  valor_unitario numeric(10,2) not null default 0 check (valor_unitario >= 0),
  created_at timestamptz not null default now()
);
create index if not exists cantina_vendas_data_idx on public.cantina_vendas (data);
create index if not exists cantina_vendas_item_idx on public.cantina_vendas (item_id);

-- ---------- Eventos (banners da home) ----------
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  data date not null,
  hora text,
  local text,
  imagem_url text,
  created_at timestamptz not null default now()
);
create index if not exists eventos_data_idx on public.eventos (data);

-- ---------- Área de ensino ----------
create table if not exists public.conteudos (
  id uuid primary key default gen_random_uuid(),
  secao text not null check (secao in ('abc', 'fundamentos', 'visao')),
  titulo text not null,
  corpo text,
  ordem int default 0,
  created_at timestamptz not null default now()
);

-- ---------- Perfis de acesso (um por login) ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  membro_id uuid unique references public.membros(id) on delete set null,
  papel text not null default 'pendente' check (papel in ('admin', 'membro', 'pendente')),
  created_at timestamptz not null default now()
);
create index if not exists perfis_email_idx on public.perfis (lower(email));

-- =============================================================
-- Funções de apoio às regras de segurança
-- Ficam no esquema "private", que não aparece na API do site.
-- São SECURITY DEFINER para poderem consultar "perfis" e "ministerios"
-- sem cair nas próprias regras (evita recursão) e sempre olham
-- só para o usuário logado (auth.uid()).
-- =============================================================
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.meu_papel()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select papel from public.perfis where id = (select auth.uid())), 'pendente');
$$;

create or replace function private.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.meu_papel() = 'admin';
$$;

-- membro ligado ou admin (pendente não vê nada)
create or replace function private.tem_acesso()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.meu_papel() in ('admin', 'membro');
$$;

-- admin, ou líder deste ministério
create or replace function private.lidera(p_ministerio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.eh_admin() or exists (
    select 1
    from public.ministerios m
    join public.perfis p on p.membro_id = m.lider_id
    where m.id = p_ministerio and p.id = (select auth.uid()) and p.papel <> 'pendente'
  );
$$;

-- admin, ou líder de um ministério com este nome ('louvor', 'cantina')
create or replace function private.lidera_area(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.eh_admin() or exists (
    select 1
    from public.ministerios m
    join public.perfis p on p.membro_id = m.lider_id
    where lower(m.nome) = lower(p_nome) and p.id = (select auth.uid()) and p.papel <> 'pendente'
  );
$$;

-- admin, líder ou participante de um ministério com este nome
create or replace function private.participa_area(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.lidera_area(p_nome) or exists (
    select 1
    from public.ministerios m
    join public.ministerio_membros mm on mm.ministerio_id = m.id
    join public.perfis p on p.membro_id = mm.membro_id
    where lower(m.nome) = lower(p_nome) and p.id = (select auth.uid()) and p.papel <> 'pendente'
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------- Ligação automática login <-> membro ----------
-- Quando um login é criado (Authentication > Add user)
create or replace function private.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_membro uuid;
  v_papel text := 'pendente';
begin
  select id into v_membro from public.membros
   where lower(email) = lower(new.email)
     and not exists (select 1 from public.perfis p where p.membro_id = membros.id)
   order by created_at limit 1;
  if v_membro is not null then v_papel := 'membro'; end if;
  -- o primeiro login do projeto vira admin
  if not exists (select 1 from public.perfis where papel = 'admin') then v_papel := 'admin'; end if;

  insert into public.perfis (id, email, membro_id, papel)
  values (new.id, new.email, v_membro, v_papel)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_login on auth.users;
create trigger ao_criar_login after insert on auth.users
  for each row execute function private.criar_perfil();

-- Quando um membro é cadastrado/alterado com o e-mail de um login que ainda não tem membro
create or replace function private.ligar_membro_ao_login()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and not exists (select 1 from public.perfis where membro_id = new.id) then
    update public.perfis
       set membro_id = new.id,
           papel = case when papel = 'pendente' then 'membro' else papel end
     where id = (select p.id from public.perfis p
                  where p.membro_id is null and lower(p.email) = lower(new.email)
                  order by p.created_at limit 1);
  end if;
  return new;
end;
$$;

drop trigger if exists ao_salvar_membro on public.membros;
create trigger ao_salvar_membro after insert or update of email on public.membros
  for each row execute function private.ligar_membro_ao_login();

-- Logins que já existiam antes deste script ganham perfil agora
insert into public.perfis (id, email, papel)
select u.id, u.email, 'pendente' from auth.users u
on conflict (id) do nothing;
update public.perfis p set membro_id = m.id, papel = case when p.papel = 'pendente' then 'membro' else p.papel end
  from public.membros m
 where p.membro_id is null and lower(m.email) = lower(p.email)
   and not exists (select 1 from public.perfis x where x.membro_id = m.id);
update public.perfis set papel = 'admin'
 where id = (select id from public.perfis order by created_at limit 1)
   and not exists (select 1 from public.perfis where papel = 'admin');

-- =============================================================
-- Acesso pela API do site
-- Projetos novos do Supabase não liberam as tabelas sozinhos:
-- é preciso dar GRANT. Quem pode ver cada LINHA é decidido pelas
-- regras (RLS) logo abaixo.
-- =============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.membros, public.ministerios, public.ministerio_membros, public.escalas,
  public.musicas, public.ensaios, public.ensaio_musicas,
  public.cantina_itens, public.cantina_vendas, public.eventos, public.conteudos
  to authenticated;
grant select, update on public.perfis to authenticated;
grant select on public.eventos, public.conteudos to anon;

-- =============================================================
-- Regras de segurança (RLS)
-- Para cada tabela: quem pode LER e quem pode ESCREVER
-- (criar, editar, apagar).
-- =============================================================
-- Funções sem dado da linha vão dentro de (select ...) para rodarem uma
-- vez por consulta, e não uma vez por linha (bem mais rápido).
do $$
declare
  r record;
  p record;
begin
  for r in
    select * from (values
      -- tabela               ler                                  escrever
      ('membros',            '(select private.tem_acesso())',      '(select private.eh_admin())'),
      ('ministerios',        '(select private.tem_acesso())',      '(select private.eh_admin())'),
      ('ministerio_membros', '(select private.tem_acesso())',      'private.lidera(ministerio_id)'),
      ('escalas',            '(select private.tem_acesso())',      'private.lidera(ministerio_id)'),
      ('musicas',            '(select private.tem_acesso())',      '(select private.lidera_area(''louvor''))'),
      ('ensaios',            '(select private.tem_acesso())',      '(select private.lidera_area(''louvor''))'),
      ('ensaio_musicas',     '(select private.tem_acesso())',      '(select private.lidera_area(''louvor''))'),
      ('cantina_itens',      '(select private.tem_acesso())',      '(select private.lidera_area(''cantina''))'),
      ('cantina_vendas',     '(select private.tem_acesso())',      '(select private.lidera_area(''cantina''))'),
      ('eventos',            'true',                               '(select private.eh_admin())'),
      ('conteudos',          'true',                               '(select private.eh_admin())')
    ) as t(tabela, ler, escrever)
  loop
    execute format('alter table public.%I enable row level security', r.tabela);

    -- apaga as regras antigas desta tabela (inclusive a do MVP: "logado pode tudo")
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = r.tabela loop
      execute format('drop policy %I on public.%I', p.policyname, r.tabela);
    end loop;

    execute format('create policy "ler" on public.%I for select to %s using (%s)', r.tabela,
      case when r.ler = 'true' then 'anon, authenticated' else 'authenticated' end, r.ler);
    execute format('create policy "criar" on public.%I for insert to authenticated with check (%s)', r.tabela, r.escrever);
    execute format('create policy "editar" on public.%I for update to authenticated using (%s) with check (%s)', r.tabela, r.escrever, r.escrever);
    execute format('create policy "apagar" on public.%I for delete to authenticated using (%s)', r.tabela, r.escrever);
  end loop;
end $$;

-- Quem participa da Cantina (não só o líder) pode lançar vendas no caixa
create policy "participante da cantina lanca venda" on public.cantina_vendas
  for insert to authenticated with check ((select private.participa_area('cantina')));
-- ...e desfazer uma venda lançada errado, desde que seja de hoje ou ontem (o servidor usa o fuso UTC)
create policy "participante da cantina desfaz venda do dia" on public.cantina_vendas
  for delete to authenticated using (data >= current_date - 1 and (select private.participa_area('cantina')));

-- Perfis: cada um vê o seu; o admin vê e altera todos (inclusive o papel)
alter table public.perfis enable row level security;
drop policy if exists "ver o proprio perfil" on public.perfis;
drop policy if exists "admin altera perfis" on public.perfis;
create policy "ver o proprio perfil" on public.perfis
  for select to authenticated using (id = (select auth.uid()) or (select private.eh_admin()));
create policy "admin altera perfis" on public.perfis
  for update to authenticated using ((select private.eh_admin())) with check ((select private.eh_admin()));
