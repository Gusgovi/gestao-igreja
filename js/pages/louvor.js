// Ministério de louvor: repertório de músicas e ensaios com a lista de músicas de cada um.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  const CAMPOS_MUSICA = [
    { nome: 'titulo', rotulo: 'Nome da música', obrigatorio: true },
    { nome: 'artista', rotulo: 'Artista / ministério' },
    { nome: 'tom', rotulo: 'Tom', exemplo: 'Ex.: G, Am, C#' },
    { nome: 'bpm', rotulo: 'Andamento (BPM)', tipo: 'number', min: 0 },
    { nome: 'link', rotulo: 'Link (YouTube, cifra…)', tipo: 'url', exemplo: 'https://' },
    { nome: 'letra', rotulo: 'Letra / cifra', tipo: 'textarea', linhas: 8 },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2 },
  ];
  const CAMPOS_ENSAIO = [
    { nome: 'data', rotulo: 'Dia', tipo: 'date', obrigatorio: true },
    { nome: 'hora', rotulo: 'Horário', tipo: 'time' },
    { nome: 'local', rotulo: 'Local', padrao: 'Templo' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2 },
  ];

  let aba = 'ensaios';

  function verMusica(mu, recarregar) {
    let m;
    m = App.modal(mu.titulo, [
      h('p.muted', [mu.artista, mu.tom ? 'Tom: ' + mu.tom : null, mu.bpm ? mu.bpm + ' BPM' : null].filter(Boolean).join(' · ')),
      mu.link ? h('p', h('a.link', { href: mu.link, target: '_blank', rel: 'noopener' }, '▶ Abrir link')) : null,
      mu.letra ? h('pre.letra', mu.letra) : h('p.muted', 'Sem letra cadastrada.'),
      mu.observacoes ? h('p.obs', mu.observacoes) : null,
      h('div.acoes', h('button.btn.secundario', { type: 'button', onclick: () => {
        m.fechar();
        App.editarRegistro({ tabela: 'musicas', titulo: 'Editar música', campos: CAMPOS_MUSICA, registro: mu, depois: recarregar, nomeItem: `"${mu.titulo}"` });
      } }, '✎ Editar')),
    ], { largo: true });
  }

  async function abaMusicas(el, recarregar) {
    const musicas = await App.db.list('musicas', { order: 'titulo' });
    let termo = '';
    const lista = h('div.lista-cards');
    const desenhar = () => {
      lista.innerHTML = '';
      const f = musicas.filter((m) => !termo || util.normalizar(m.titulo + ' ' + (m.artista || '')).includes(termo));
      if (!f.length) return lista.appendChild(App.vazio(musicas.length ? 'Nenhuma música encontrada.' : 'Nenhuma música no repertório ainda.'));
      for (const mu of f) {
        lista.appendChild(h('button.item-card', { type: 'button', onclick: () => verMusica(mu, recarregar) },
          h('span.avatar.musica', { 'aria-hidden': 'true' }, '♪'),
          h('div.item-info', h('strong', mu.titulo), h('span.muted', mu.artista || '')),
          mu.tom ? h('span.tom', { title: 'Tom' }, mu.tom) : null));
      }
    };
    el.appendChild(h('div.barra-filtros',
      App.busca('Buscar música ou artista', (t) => { termo = t; desenhar(); }),
      h('button.btn', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'musicas', titulo: 'Nova música', campos: CAMPOS_MUSICA, depois: recarregar }) }, '+ Nova música')));
    el.appendChild(lista);
    desenhar();
  }

  async function abaEnsaios(el, recarregar) {
    const [ensaios, musicas, em] = await Promise.all([
      App.db.list('ensaios', { order: 'data' }),
      App.db.list('musicas', { order: 'titulo' }),
      App.db.list('ensaio_musicas', { order: 'ordem' }),
    ]);
    const pmu = util.porId(musicas);
    const hoje = util.hoje();
    const proximos = ensaios.filter((e) => e.data >= hoje);
    const passados = ensaios.filter((e) => e.data < hoje).reverse();

    el.appendChild(h('div.barra-acoes',
      h('button.btn', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'ensaios', titulo: 'Marcar ensaio', campos: CAMPOS_ENSAIO, registro: null, depois: recarregar }) }, '+ Marcar ensaio')));

    const cartao = (e) => {
      const lista = em.filter((x) => x.ensaio_id === e.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      const mover = async (i, d) => {
        const a = lista[i], b = lista[i + d];
        if (!b) return;
        await App.db.update('ensaio_musicas', a.id, { ordem: i + d });
        await App.db.update('ensaio_musicas', b.id, { ordem: i });
        recarregar();
      };
      const addMusica = () => {
        const ja = new Set(lista.map((x) => x.musica_id));
        const disp = musicas.filter((m) => !ja.has(m.id));
        if (!disp.length) return App.toast('Todas as músicas do repertório já estão neste ensaio.', 'aviso');
        let md;
        md = App.modal('Adicionar música ao ensaio', App.formulario([
          { nome: 'musica_id', rotulo: 'Música', tipo: 'select', obrigatorio: true, opcoes: disp.map((m) => ({ valor: m.id, texto: m.titulo + (m.tom ? ` (${m.tom})` : '') })) },
        ], {}, {
          textoSalvar: 'Adicionar',
          aoSalvar: async ({ musica_id }) => {
            // normaliza a ordem para 0..n antes de colocar a nova no fim
            for (let i = 0; i < lista.length; i++) if (lista[i].ordem !== i) await App.db.update('ensaio_musicas', lista[i].id, { ordem: i });
            await App.db.insert('ensaio_musicas', { ensaio_id: e.id, musica_id, ordem: lista.length });
            md.fechar(); recarregar();
          },
        }));
      };
      return h('section.card.ensaio' + (e.data < hoje ? '.passado' : ''),
        h('div.card-topo',
          h('div', h('h2', util.dataLonga(e.data) + (e.hora ? ' · ' + e.hora : '')), e.local ? h('p.muted', '📍 ' + e.local) : null),
          h('button.btn.secundario.pequeno', { type: 'button', onclick: () => App.editarRegistro({
            tabela: 'ensaios', titulo: 'Editar ensaio', campos: CAMPOS_ENSAIO, registro: e, depois: recarregar, nomeItem: 'este ensaio',
          }) }, '✎ Editar')),
        e.observacoes ? h('p.obs', e.observacoes) : null,
        lista.length ? h('ol.setlist', lista.map((x, i) => {
          const mu = pmu[x.musica_id] || { titulo: '(música apagada)' };
          return h('li',
            h('button.link.setlist-nome', { type: 'button', onclick: () => pmu[x.musica_id] && verMusica(mu, recarregar) }, mu.titulo),
            mu.tom ? h('span.tom', mu.tom) : null,
            h('span.setlist-acoes',
              h('button.btn-icone', { type: 'button', 'aria-label': 'Subir', disabled: i === 0, onclick: () => mover(i, -1) }, '↑'),
              h('button.btn-icone', { type: 'button', 'aria-label': 'Descer', disabled: i === lista.length - 1, onclick: () => mover(i, 1) }, '↓'),
              h('button.btn-icone', { type: 'button', 'aria-label': 'Tirar do ensaio', onclick: async () => {
                await App.db.remove('ensaio_musicas', x.id); recarregar();
              } }, '✕')));
        })) : h('p.muted', 'Nenhuma música escolhida ainda.'),
        h('button.btn.secundario.pequeno', { type: 'button', onclick: addMusica }, '+ Música'));
    };

    el.appendChild(h('h2.secao-titulo', 'Próximos ensaios'));
    el.appendChild(proximos.length ? h('div.coluna', proximos.map(cartao)) : App.vazio('Nenhum ensaio marcado.'));
    if (passados.length) {
      el.appendChild(h('details.passados', h('summary', `Ensaios anteriores (${passados.length})`), h('div.coluna', passados.map(cartao))));
    }
  }

  App.paginas.louvor = {
    titulo: 'Louvor',
    async render(el, _p, recarregar) {
      el.appendChild(App.cabecalho('Louvor', 'Repertório e ensaios do ministério de louvor.'));
      el.appendChild(App.abas([['ensaios', 'Ensaios'], ['musicas', 'Músicas']], aba, (v) => { aba = v; recarregar(); }));
      if (aba === 'musicas') await abaMusicas(el, recarregar);
      else await abaEnsaios(el, recarregar);
    },
  };
})();
