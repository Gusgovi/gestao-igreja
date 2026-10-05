-- =============================================================
-- Gestão de Igreja – esquema do banco (Supabase / Postgres)
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem perder dados: o script só cria o que falta
-- e recria as regras de segurança.
--
-- Papéis:
--   admin     – secretaria e pastores: cadastra e edita tudo. Membro com
--               cargo Pastor ou Pastora vira admin sozinho ao ligar o login.
--   líder     – não é um papel gravado: é quem está como líder de um
--               ministério (ministerios.lider_id). Edita os participantes
--               e a escala do próprio ministério. O líder do ministério
--               "Louvor" cuida também de músicas e ensaios; o da
--               "Cantina", do cardápio e do caixa.
--               Quem PARTICIPA do Louvor (não só o líder) também cadastra
--               músicas, marca ensaios e monta a escala do Louvor.
--   membro    – vê as informações internas (escalas, louvor, cantina...).
--               Quem participa da Cantina também registra vendas; quem
--               participa da Mídia envia as fotos do culto.
--   visitante – criou a própria conta pelo botão "Sou visitante" (ou é um
--               login ainda não ligado a um membro). Vê só o que é geral:
--               eventos, Aprender, pastores, cardápio da cantina e fotos da
--               Mídia. NÃO vê escalas, membros, louvor nem o caixa.
--   pendente  – papel antigo (login sem membro). Hoje vira visitante.
--
-- Como um login vira membro: a secretaria salva o cadastro do membro com o
-- mesmo e-mail do login (Membros > abrir a pessoa > Salvar). O banco liga os
-- dois na hora. Quem cria a própria conta NUNCA é ligado sozinho, mesmo que
-- o e-mail já esteja num cadastro: assim ninguém vira membro só por digitar
-- o e-mail de outra pessoa.
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
-- Cargo na igreja (opcional). Aparece como tag no cadastro do membro.
alter table public.membros add column if not exists cargo text
  check (cargo in ('Pastor', 'Pastora', 'Diaconisa'));

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
-- nome que o visitante digitou ao criar a conta
alter table public.perfis add column if not exists nome text;
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check
  check (papel in ('admin', 'membro', 'visitante', 'pendente'));
alter table public.perfis alter column papel set default 'visitante';

-- ---------- Conheça os pastores ----------
-- Página pública (aparece também para quem não entrou). A tag "Pastor" no
-- cadastro de membro continua no campo membros.cargo.
create table if not exists public.pastores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  titulo text default 'Pastor',
  foto_url text,
  texto text,
  ordem int default 0,
  created_at timestamptz not null default now()
);

-- ---------- Mídia: fotos dos cultos ----------
-- O arquivo fica no Storage (bucket "midia"); aqui ficam o endereço e o dia.
create table if not exists public.midia_fotos (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  caminho text not null,   -- caminho do arquivo dentro do bucket
  url text not null,       -- endereço público da imagem
  legenda text,
  created_at timestamptz not null default now()
);
create index if not exists midia_fotos_data_idx on public.midia_fotos (data desc);

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

-- membro ligado ou admin (visitante não vê as áreas internas)
create or replace function private.tem_acesso()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.meu_papel() in ('admin', 'membro');
$$;

-- qualquer login (admin, membro ou visitante)
create or replace function private.logado()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.meu_papel() in ('admin', 'membro', 'visitante');
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

-- admin, ou líder de um ministério com este nome ('louvor', 'cantina', 'mídia')
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

-- pode montar a escala deste ministério: o líder (ou admin) e, no Louvor, quem participa
create or replace function private.pode_escalar(p_ministerio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.lidera(p_ministerio) or (
    exists (select 1 from public.ministerios m where m.id = p_ministerio and lower(m.nome) = 'louvor')
    and private.participa_area('louvor')
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------- Ligação automática login <-> membro ----------
-- Quando um login é criado (Authentication > Add user)
create or replace function private.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_papel text := 'visitante';
begin
  -- Todo login novo entra como visitante. Não liga ao membro pelo e-mail aqui:
  -- quem cria a própria conta poderia usar o e-mail de outra pessoa.
  -- A ligação acontece quando a secretaria salva o membro (gatilho abaixo).
  -- O primeiro login do projeto vira admin.
  if not exists (select 1 from public.perfis where papel = 'admin') then v_papel := 'admin'; end if;

  insert into public.perfis (id, email, nome, papel)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), v_papel)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_login on auth.users;
create trigger ao_criar_login after insert on auth.users
  for each row execute function private.criar_perfil();

-- Quando um membro é cadastrado/alterado com o e-mail de um login que ainda não tem membro.
-- Pastor e Pastora (campo cargo) têm acesso de admin: quando o membro tem esse cargo,
-- o login ligado a ele vira admin (só o admin consegue alterar o cargo de alguém).
create or replace function private.ligar_membro_ao_login()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_pastor boolean := coalesce(new.cargo in ('Pastor', 'Pastora'), false);
begin
  if new.email is not null and not exists (select 1 from public.perfis where membro_id = new.id) then
    update public.perfis
       set membro_id = new.id,
           papel = case when v_pastor then 'admin'
                        when papel in ('pendente', 'visitante') then 'membro' else papel end
     where id = (select p.id from public.perfis p
                  where p.membro_id is null and lower(p.email) = lower(new.email)
                  order by p.created_at limit 1);
  elsif v_pastor then
    -- já tinha login ligado e ganhou o cargo de pastor depois
    update public.perfis set papel = 'admin' where membro_id = new.id and papel <> 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists ao_salvar_membro on public.membros;
create trigger ao_salvar_membro after insert or update of email, cargo on public.membros
  for each row execute function private.ligar_membro_ao_login();

-- Logins que já existiam antes deste script ganham perfil agora
insert into public.perfis (id, email, papel)
select u.id, u.email, 'pendente' from auth.users u
on conflict (id) do nothing;
-- só os logins antigos (pendentes) são ligados pelo e-mail aqui; visitantes não
update public.perfis p set membro_id = m.id, papel = 'membro'
  from public.membros m
 where p.membro_id is null and p.papel = 'pendente' and lower(m.email) = lower(p.email)
   and not exists (select 1 from public.perfis x where x.membro_id = m.id);
update public.perfis set papel = 'admin'
 where id = (select id from public.perfis order by created_at limit 1)
   and not exists (select 1 from public.perfis where papel = 'admin');
-- quem sobrou sem membro vira visitante
update public.perfis set papel = 'visitante' where papel = 'pendente';

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
  public.cantina_itens, public.cantina_vendas, public.eventos, public.conteudos,
  public.pastores, public.midia_fotos
  to authenticated;
grant select, update on public.perfis to authenticated;
grant select on public.eventos, public.conteudos, public.pastores to anon;

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
      ('escalas',            '(select private.tem_acesso())',      'private.pode_escalar(ministerio_id)'),
      ('musicas',            '(select private.tem_acesso())',      '(select private.participa_area(''louvor''))'),
      ('ensaios',            '(select private.tem_acesso())',      '(select private.participa_area(''louvor''))'),
      ('ensaio_musicas',     '(select private.tem_acesso())',      '(select private.participa_area(''louvor''))'),
      ('cantina_itens',      '(select private.logado())',          '(select private.lidera_area(''cantina''))'),
      ('cantina_vendas',     '(select private.tem_acesso())',      '(select private.lidera_area(''cantina''))'),
      ('eventos',            'true',                               '(select private.eh_admin())'),
      ('conteudos',          'true',                               '(select private.eh_admin())'),
      ('pastores',           'true',                               '(select private.eh_admin())'),
      ('midia_fotos',        '(select private.logado())',          '(select private.participa_area(''mídia''))')
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

-- =============================================================
-- Fotos da Mídia no Storage
-- Bucket público: quem tem o endereço da foto consegue ver (é assim que a
-- imagem aparece no site). Enviar e apagar: admin, líder ou quem participa
-- do ministério "Mídia".
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "midia enviar foto" on storage.objects;
drop policy if exists "midia apagar foto" on storage.objects;
drop policy if exists "midia ver foto" on storage.objects;
-- (apagar pela API também precisa enxergar o arquivo)
create policy "midia ver foto" on storage.objects for select to authenticated
  using (bucket_id = 'midia' and (select private.logado()));
create policy "midia enviar foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and (select private.participa_area('mídia')));
create policy "midia apagar foto" on storage.objects for delete to authenticated
  using (bucket_id = 'midia' and (select private.participa_area('mídia')));
