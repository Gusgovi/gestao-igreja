-- =============================================================
-- Dados iniciais (opcional). Rode DEPOIS do schema.sql.
-- Cria os ministérios Louvor e Cantina (as regras de segurança de
-- músicas, ensaios e cantina procuram o ministério por esses nomes)
-- e um cardápio de exemplo. Pode rodar de novo: não duplica.
-- =============================================================
insert into public.ministerios (nome, descricao, cor)
select v.nome, v.descricao, v.cor
from (values
  ('Louvor',  'Música e adoração nos cultos.', '#7c3aed'),
  ('Cantina', 'Lanches após os cultos.',       '#ea580c')
) as v(nome, descricao, cor)
where not exists (select 1 from public.ministerios m where lower(m.nome) = lower(v.nome));

insert into public.cantina_itens (nome, preco)
select v.nome, v.preco
from (values ('Café', 2.00), ('Bolo (fatia)', 5.00), ('Salgado', 6.00), ('Refrigerante (lata)', 5.00)) as v(nome, preco)
where not exists (select 1 from public.cantina_itens i where lower(i.nome) = lower(v.nome));
