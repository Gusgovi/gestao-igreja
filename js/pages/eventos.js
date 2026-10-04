// Eventos e cultos: aparecem como "stories" na página inicial.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  const CAMPOS = [
    { nome: 'titulo', rotulo: 'Título', obrigatorio: true, exemplo: 'Ex.: Culto de Celebração' },
    { nome: 'data', rotulo: 'Dia', tipo: 'date', obrigatorio: true },
    { nome: 'hora', rotulo: 'Horário', tipo: 'time' },
    { nome: 'local', rotulo: 'Local', padrao: 'Templo' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', linhas: 3 },
    { nome: 'imagem_url', rotulo: 'Link da imagem (opcional)', tipo: 'url', exemplo: 'https://',
      ajuda: 'Cole o endereço de uma imagem (de preferência vertical). Imagens do Instagram: clique com o botão direito na foto > "Copiar endereço da imagem". Esses links do Instagram podem expirar depois de alguns dias.' },
  ];

  App.paginas.eventos = {
    titulo: 'Eventos',
    async render(el, _p, recarregar) {
      const eventos = await App.db.list('eventos', { order: 'data' });
      const hoje = util.hoje();
      const futuros = eventos.filter((e) => e.data >= hoje);
      const passados = eventos.filter((e) => e.data < hoje).reverse();

      el.appendChild(App.cabecalho('Eventos e cultos', 'Os próximos eventos aparecem como stories na página inicial.',
        futuros.length ? h('button.btn.secundario', { type: 'button', onclick: () => App.abrirStories(futuros, 0) }, '▶ Ver stories') : null,
        h('button.btn', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'eventos', titulo: 'Novo evento', campos: CAMPOS, depois: recarregar }) }, '+ Novo evento')));

      const cartao = (ev) => h('button.evento-card', { type: 'button',
        onclick: () => App.editarRegistro({ tabela: 'eventos', titulo: 'Editar evento', campos: CAMPOS, registro: ev, depois: recarregar, nomeItem: `"${ev.titulo}"` }) },
        h('div.evento-data', h('strong', String(util.parse(ev.data).getDate())), h('span', util.dataCurta(ev.data).split(' ')[1])),
        h('div.item-info',
          h('strong', ev.titulo),
          h('span.muted', [util.diaSemana(ev.data), ev.hora, ev.local].filter(Boolean).join(' · ')),
          ev.descricao ? h('span', ev.descricao) : null),
        ev.imagem_url ? h('span.evento-thumb', { style: { backgroundImage: `url("${ev.imagem_url.replace(/"/g, '%22')}")` }, 'aria-hidden': 'true' }) : null);

      el.appendChild(futuros.length ? h('div.lista-cards', futuros.map(cartao)) : App.vazio('Nenhum evento marcado.'));
      if (passados.length) {
        el.appendChild(h('details.passados', h('summary', `Eventos que já passaram (${passados.length})`), h('div.lista-cards', passados.map(cartao))));
      }
    },
  };
})();
