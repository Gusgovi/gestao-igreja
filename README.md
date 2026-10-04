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
2. No projeto: **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Depois faça o mesmo com `supabase/seed.sql` (cria os ministérios Louvor e Cantina e um cardápio de exemplo)
3. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up** (os logins são criados pela secretaria)
4. Em **Authentication > Users > Add user**, crie o **seu** login primeiro (marque *Auto Confirm User*): o primeiro login vira **admin**
5. Em **Project Settings > API Keys**, copie a *Project URL* e a *Publishable key* (nunca a *Secret key*)
6. Cole as duas em `js/config.js`
7. Abra o sistema de novo: vai aparecer a tela de login

### Quem pode o quê

| Papel | O que pode |
|---|---|
| **Admin** | Tudo: membros, ministérios, eventos, ensino, e todas as escalas |
| **Líder** (quem está como líder de um ministério) | Participantes e escala do próprio ministério. Líder do *Louvor* também cuida de músicas e ensaios; líder da *Cantina*, do cardápio e do caixa |
| **Membro** | Vê escalas, louvor, cantina e membros. Quem participa da Cantina lança vendas no caixa |
| **Pendente** (login sem membro ligado) | Não vê nada |

Para dar acesso a alguém: cadastre a pessoa em **Membros** com o e-mail dela e crie o login com o mesmo e-mail em *Authentication > Users*. O banco liga os dois sozinho. Para tornar alguém admin, no SQL Editor:

```sql
update perfis set papel = 'admin' where email = 'pessoa@email.com';
```

As regras ficam no próprio banco (RLS), então valem mesmo que alguém mexa no site. Os nomes **Louvor** e **Cantina** dos ministérios são usados pelas regras: não renomeie esses dois.

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
supabase/schema.sql   tabelas, papéis e regras de segurança do banco
supabase/seed.sql     ministérios Louvor e Cantina e cardápio inicial (opcional)
```

Para criar uma tela nova: crie `js/pages/minha-tela.js` registrando `App.paginas['minha-tela'] = { titulo, render }`, inclua o `<script>` no `index.html` e um item no `MENU` em `js/app.js`.

## Próximos passos sugeridos

- Upload de imagens dos eventos no Supabase Storage
- Telas do briefing de UI/UX ainda não feitas: programação da semana, pregações, devocional do dia, pedido de oração, conheça os pastores
- Publicar online (Netlify, Vercel ou GitHub Pages — é só subir a pasta)
