-- =============================================================
-- Teste das regras de segurança (admin, líder, membro, pendente).
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- NADA É GRAVADO: o script cria usuários e dados de teste, tenta cada
-- ação "como se fosse" cada pessoa e no fim desfaz tudo de propósito.
-- Por isso ele termina com um ERRO cujo texto é o RESULTADO do teste.
-- Procure "FALHAS: 0" na mensagem.
-- =============================================================
do $$
declare
  u_admin   uuid := gen_random_uuid();
  u_lider   uuid := gen_random_uuid();
  u_membro  uuid := gen_random_uuid();
  u_pend    uuid := gen_random_uuid();
  louvor    uuid;
  cantina   uuid;
  m_lider   uuid;
  m_membro  uuid;
  esc_louvor  uuid;
  esc_cantina uuid;
  venda     uuid;
  r record;
  v_sql text;
  n int;
  obtido text;
  rel text := '';
  falhas int := 0;
begin
  -- ---------- preparação (como dono do banco) ----------
  select id into louvor  from public.ministerios where lower(nome) = 'louvor'  limit 1;
  select id into cantina from public.ministerios where lower(nome) = 'cantina' limit 1;
  if louvor is null or cantina is null then
    raise exception 'Faltam os ministérios Louvor e Cantina (rode o seed.sql).';
  end if;

  insert into public.membros (nome, email) values ('Líder Teste RLS', 'lider.rls@teste.invalid') returning id into m_lider;
  insert into public.membros (nome, email) values ('Membro Teste RLS', 'membro.rls@teste.invalid') returning id into m_membro;

  -- logins de teste: o gatilho cria o perfil e liga ao membro pelo e-mail
  insert into auth.users (id, email, aud, role, instance_id) values
    (u_admin,  'admin.rls@teste.invalid',    'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_lider,  'lider.rls@teste.invalid',    'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_membro, 'membro.rls@teste.invalid',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_pend,   'pendente.rls@teste.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  update public.perfis set papel = 'admin' where id = u_admin;

  update public.ministerios set lider_id = m_lider where id = louvor;
  insert into public.ministerio_membros (ministerio_id, membro_id) values (cantina, m_membro);
  insert into public.escalas (ministerio_id, membro_id, data, funcao) values (louvor, m_lider, current_date, 'Teste') returning id into esc_louvor;
  insert into public.escalas (ministerio_id, membro_id, data, funcao) values (cantina, m_membro, current_date, 'Teste') returning id into esc_cantina;
  insert into public.cantina_vendas (data, item_nome, quantidade, valor_unitario) values (current_date, 'Teste', 1, 1) returning id into venda;
  insert into public.eventos (titulo, data) values ('Evento Teste RLS', current_date);

  -- confere a ligação automática login <-> membro
  rel := rel || format(E'ligacao lider: %s | ligacao membro: %s | sem membro fica: %s\n',
    (select papel || '/' || (membro_id = m_lider) from public.perfis where id = u_lider),
    (select papel || '/' || (membro_id = m_membro) from public.perfis where id = u_membro),
    (select papel from public.perfis where id = u_pend));

  -- ---------- cada ação, como cada pessoa ----------
  for r in select * from (values
    ('pendente', 'vê membros',                    'select 1 from public.membros',                                         'bloqueado'),
    ('pendente', 'vê eventos (público)',          'select 1 from public.eventos',                                         'permitido'),
    ('membro',   'vê membros',                    'select 1 from public.membros',                                         'permitido'),
    ('membro',   'vê escalas',                    'select 1 from public.escalas',                                         'permitido'),
    ('membro',   'cadastra membro',               'insert into public.membros (nome) values (''x'')',                     'bloqueado'),
    ('membro',   'edita escala',                  'update public.escalas set funcao = ''x'' where id = :esc_cantina',     'bloqueado'),
    ('membro',   'cadastra música',               'insert into public.musicas (titulo) values (''x'')',                   'bloqueado'),
    ('membro',   'cadastra item da cantina',      'insert into public.cantina_itens (nome, preco) values (''x'', 1)',     'bloqueado'),
    ('membro',   'lança venda (participa)',       'insert into public.cantina_vendas (item_nome, valor_unitario) values (''x'', 1)', 'permitido'),
    ('membro',   'desfaz venda do dia',           'delete from public.cantina_vendas where id = :venda',                  'permitido'),
    ('membro',   'cria evento',                   'insert into public.eventos (titulo, data) values (''x'', current_date)', 'bloqueado'),
    ('membro',   'vira admin sozinho',            'update public.perfis set papel = ''admin'' where id = :u_membro',      'bloqueado'),
    ('lider',    'cadastra música (Louvor)',      'insert into public.musicas (titulo) values (''x'')',                   'permitido'),
    ('lider',    'cria ensaio (Louvor)',          'insert into public.ensaios (data) values (current_date)',             'permitido'),
    ('lider',    'escala no próprio ministério',  'insert into public.escalas (ministerio_id, data) values (:louvor, current_date)', 'permitido'),
    ('lider',    'adiciona participante (Louvor)','insert into public.ministerio_membros (ministerio_id, membro_id) values (:louvor, :m_membro)', 'permitido'),
    ('lider',    'escala em outro ministério',    'insert into public.escalas (ministerio_id, data) values (:cantina, current_date)', 'bloqueado'),
    ('lider',    'edita escala de outro',         'update public.escalas set funcao = ''x'' where id = :esc_cantina',     'bloqueado'),
    ('lider',    'move escala p/ outro ministério','update public.escalas set ministerio_id = :cantina where id = :esc_louvor', 'bloqueado'),
    ('lider',    'cadastra item da cantina',      'insert into public.cantina_itens (nome, preco) values (''x'', 1)',     'bloqueado'),
    ('lider',    'cadastra membro',               'insert into public.membros (nome) values (''x'')',                     'bloqueado'),
    ('lider',    'edita ministério',              'update public.ministerios set descricao = ''x'' where id = :louvor',   'bloqueado'),
    ('admin',    'cadastra membro',               'insert into public.membros (nome) values (''x'')',                     'permitido'),
    ('admin',    'cria evento',                   'insert into public.eventos (titulo, data) values (''x'', current_date)', 'permitido'),
    ('admin',    'edita escala de qualquer um',   'update public.escalas set funcao = ''x'' where id = :esc_cantina',     'permitido'),
    ('admin',    'muda papel de alguém',          'update public.perfis set papel = ''membro'' where id = :u_pend',       'permitido')
  ) as t(quem, teste, comando, esperado)
  loop
    v_sql := r.comando;
    v_sql := replace(v_sql, ':esc_cantina', quote_literal(esc_cantina));
    v_sql := replace(v_sql, ':esc_louvor',  quote_literal(esc_louvor));
    v_sql := replace(v_sql, ':venda',       quote_literal(venda));
    v_sql := replace(v_sql, ':louvor',      quote_literal(louvor));
    v_sql := replace(v_sql, ':cantina',     quote_literal(cantina));
    v_sql := replace(v_sql, ':m_membro',    quote_literal(m_membro));
    v_sql := replace(v_sql, ':u_membro',    quote_literal(u_membro));
    v_sql := replace(v_sql, ':u_pend',      quote_literal(u_pend));

    perform set_config('request.jwt.claims', json_build_object(
      'sub', case r.quem when 'admin' then u_admin when 'lider' then u_lider
                         when 'membro' then u_membro else u_pend end,
      'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      execute v_sql;
      get diagnostics n = row_count;
      obtido := case when n > 0 then 'permitido' else 'bloqueado' end;
    exception when others then
      obtido := 'bloqueado';
    end;
    execute 'reset role';

    if obtido <> r.esperado then falhas := falhas + 1; end if;
    rel := rel || format(E'%s %-8s %-32s esperado=%-9s obtido=%s\n',
      case when obtido = r.esperado then 'OK  ' else 'FALHA' end, r.quem, r.teste, r.esperado, obtido);
  end loop;

  raise exception E'RESULTADO DO TESTE (nada foi gravado) - FALHAS: %\n%', falhas, rel;
end $$;
