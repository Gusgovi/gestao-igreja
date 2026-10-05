-- =============================================================
-- Dados iniciais (opcional). Rode DEPOIS do schema.sql.
-- Cria os ministérios Louvor, Cantina e Mídia (as regras de segurança de
-- músicas, ensaios, cantina e fotos procuram o ministério por esses nomes),
-- o Som, os pastores e um cardápio de exemplo. Pode rodar de novo: não duplica.
-- =============================================================
insert into public.ministerios (nome, descricao, cor)
select v.nome, v.descricao, v.cor
from (values
  ('Louvor',  'Música e adoração nos cultos.', '#7c3aed'),
  ('Cantina', 'Lanches após os cultos.',       '#ea580c'),
  ('Mídia',   'Fotos, telão e redes sociais dos cultos.', '#db2777'),
  ('Som',     'Caixas de som, microfones e mesa de som.', '#0d9488')
) as v(nome, descricao, cor)
where not exists (select 1 from public.ministerios m where lower(m.nome) = lower(v.nome));

insert into public.cantina_itens (nome, preco)
select v.nome, v.preco
from (values ('Café', 2.00), ('Bolo (fatia)', 5.00), ('Salgado', 6.00), ('Refrigerante (lata)', 5.00)) as v(nome, preco)
where not exists (select 1 from public.cantina_itens i where lower(i.nome) = lower(v.nome));

-- Conheça os pastores (o texto e a foto a secretaria completa pelo site)
insert into public.pastores (nome, titulo, texto, ordem)
select v.nome, v.titulo, 'Texto provisório. A liderança vai escrever um pouco sobre a história e o chamado do pastor.', v.ordem
from (values ('Sebastian Chuliver', 'Pastor', 1), ('Romina Zaninovich', 'Pastora', 2)) as v(nome, titulo, ordem)
where not exists (select 1 from public.pastores p where lower(p.nome) = lower(v.nome));
