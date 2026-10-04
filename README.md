# Gestão de Igreja

Sistema web de gerenciamento interno da igreja **Paixão Por Jesus**: membros, ministérios e escalas, louvor, cantina, eventos e área de ensino.
Feito para ser **simples e fácil de usar**, inclusive por quem tem pouca familiaridade com tecnologia (letras grandes, botões grandes, funciona no celular e no computador).

MVP para apresentação acadêmica, com arquitetura organizada para virar uso real.

## Tecnologias

- **HTML, CSS e JavaScript puro** (sem framework, sem build, sem `npm install`)
- **Supabase** (banco Postgres + login) — opcional: sem configurar, o sistema roda em **modo demonstração**, salvando os dados no próprio navegador

## Como rodar

**Jeito mais fácil:** dê dois cliques no `index.html`. Ele abre no navegador em modo demonstração, já com dados de exemplo.

**No VS Code:** instale a extensão **Live Server**, clique com o botão direito no `index.html` > *Open with Live Server*.

## O que tem em cada tela

| Tela | O que faz |
|---|---|
| **Início** | Eventos em formato *story* (igual Instagram), escalas da semana, próximo ensaio |
| **Membros** | Cadastro, busca, situação (ativo/visitante/inativo), aniversariantes do mês |
| **Ministérios** | Líder, participantes e a **escala semanal** de cada ministério |
| **Escalas** | Visão da semana de todos os ministérios, copiar a semana anterior, imprimir |
| **Louvor** | Repertório (tom, BPM, link, letra) e ensaios com a lista de músicas em ordem |
| **Cantina** | Responsáveis (escala do ministério Cantina), cardápio com preços e caixa do dia |
| **Eventos** | Cultos e eventos que viram os stories da página inicial (aceita link de imagem) |
| **Aprender** | ABC do Evangelho, primeiros passos e visão da igreja (textos provisórios, editáveis) |

## Ligando o Supabase (banco de verdade)

1. Crie uma conta e um projeto grátis em https://supabase.com
2. No projeto: **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**
3. Em **Authentication > Users > Add user**, crie o login de quem vai usar o sistema (e-mail e senha)
4. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*
5. Cole as duas em `js/config.js`
6. Abra o sistema de novo: vai aparecer a tela de login

> No modo Supabase o sistema começa vazio (os dados de exemplo são só do modo demonstração).

## Estrutura

```
index.html            página única (as telas trocam pelo endereço: #/membros, #/escalas…)
css/style.css         visual
js/config.js          chaves do Supabase e nome da igreja
js/ui.js              utilidades: formulários, janelas, avisos, datas
js/db.js              camada de dados (Supabase ou navegador) – as telas só usam App.db
js/seed.js            dados de exemplo do modo demonstração
js/app.js             menu, rotas e login
js/pages/*.js         uma tela por arquivo
supabase/schema.sql   tabelas e regras de segurança do banco
```

Para criar uma tela nova: crie `js/pages/minha-tela.js` registrando `App.paginas['minha-tela'] = { titulo, render }`, inclua o `<script>` no `index.html` e um item no `MENU` em `js/app.js`.

## Próximos passos sugeridos

- Permissões por papel (ex.: só o líder edita a escala do próprio ministério)
- Upload de imagens dos eventos no Supabase Storage
- Telas do briefing de UI/UX ainda não feitas: programação da semana, pregações, devocional do dia, pedido de oração, conheça os pastores
- Publicar online (Netlify, Vercel ou GitHub Pages — é só subir a pasta)
