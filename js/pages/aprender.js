// Área de ensino: ABC do Evangelho, fundamentos para o recém-convertido e visão da igreja.
(function () {
  const App = window.App;
  const { h } = App;
  App.paginas = App.paginas || {};

  const SECOES = [
    ['abc', 'ABC do Evangelho', 'O básico da fé cristã, explicado de um jeito simples.'],
    ['fundamentos', 'Primeiros passos', 'Fundamentos para quem acabou de se converter.'],
    ['visao', 'Nossa igreja', 'Visão, missão e valores da igreja.'],
  ];
  let secao = 'abc';

  const campos = () => [
    { nome: 'secao', rotulo: 'Seção', tipo: 'select', vazio: false, opcoes: SECOES.map(([valor, texto]) => ({ valor, texto })) },
    { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
    { nome: 'corpo', rotulo: 'Texto', tipo: 'textarea', linhas: 12, ajuda: 'Deixe uma linha em branco para separar parágrafos.' },
    { nome: 'ordem', rotulo: 'Ordem de exibição', tipo: 'number', min: 0 },
  ];

  App.paginas.aprender = {
    titulo: 'Aprender',
    async render(el, _p, recarregar) {
      const todos = await App.db.list('conteudos', { order: 'ordem' });
      const info = SECOES.find((s) => s[0] === secao);
      const itens = todos.filter((c) => c.secao === secao);

      const podeEditar = App.posso('conteudos');
      el.appendChild(App.cabecalho('Aprender', 'Conteúdo para quem está chegando na fé e na igreja.',
        podeEditar ? h('button.btn', { type: 'button', onclick: () => App.editarRegistro({
          tabela: 'conteudos', titulo: 'Novo texto', campos: campos(), registro: null, depois: recarregar,
        }) }, '+ Novo texto') : null));
      el.appendChild(App.abas(SECOES.map(([v, t]) => [v, t]), secao, (v) => { secao = v; recarregar(); }));
      el.appendChild(h('p.subtitulo', info[2]));

      if (!itens.length) return el.appendChild(App.vazio('Nenhum texto nesta seção ainda.'));
      el.appendChild(h('div.artigos', itens.map((c, i) => h('details.artigo', { open: i === 0 },
        h('summary', h('span.artigo-num', String(i + 1)), c.titulo),
        h('div.artigo-corpo',
          (c.corpo || '').split(/\n\s*\n/).filter(Boolean).map((p) => h('p', p)),
          podeEditar ? h('button.btn.secundario.pequeno', { type: 'button', onclick: () => App.editarRegistro({
            tabela: 'conteudos', titulo: 'Editar texto', campos: campos(), registro: c, depois: recarregar, nomeItem: `"${c.titulo}"`,
          }) }, '✎ Editar') : null)))));
    },
  };
})();
