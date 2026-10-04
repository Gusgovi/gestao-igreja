// Página inicial: banners em formato "story", escalas da semana e próximos eventos.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  const CORES = ['#1F6FB2', '#2D9CDB', '#3B4F8F', '#0E7490', '#24518F', '#4A5FA8'];

  // Visualizador em tela cheia, igual aos stories do Instagram
  function abrirStories(eventos, inicio) {
    let atual = inicio;
    let timer;
    const DURACAO = 6000;
    const barras = eventos.map(() => h('div.story-barra', h('div.story-progresso')));
    const palco = h('div.story-palco');
    const fundo = h('div.story-fundo', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Eventos' },
      h('div.story-barras', barras),
      h('button.story-fechar', { type: 'button', 'aria-label': 'Fechar', onclick: fechar }, '✕'),
      palco,
      h('button.story-nav.anterior', { type: 'button', 'aria-label': 'Anterior', onclick: () => ir(atual - 1) }),
      h('button.story-nav.proximo', { type: 'button', 'aria-label': 'Próximo', onclick: () => ir(atual + 1) }));

    function fechar() { clearTimeout(timer); fundo.remove(); document.removeEventListener('keydown', teclas); }
    function teclas(e) {
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') ir(atual + 1);
      if (e.key === 'ArrowLeft') ir(atual - 1);
    }
    function ir(i) {
      if (i < 0) i = 0;
      if (i >= eventos.length) return fechar();
      atual = i;
      clearTimeout(timer);
      barras.forEach((b, j) => {
        const p = b.firstChild;
        p.style.transition = 'none';
        p.style.width = j < i ? '100%' : '0%';
      });
      const ev = eventos[i];
      palco.innerHTML = '';
      palco.style.background = ev.imagem_url
        ? `center / cover no-repeat url("${ev.imagem_url.replace(/"/g, '%22')}"), ${CORES[i % CORES.length]}`
        : `linear-gradient(160deg, ${CORES[i % CORES.length]}, #0A1628)`;
      palco.appendChild(h('div.story-texto',
        h('p.story-data', `${util.dataLonga(ev.data)}${ev.hora ? ' · ' + ev.hora : ''}`),
        h('h2', ev.titulo),
        ev.local ? h('p', '📍 ' + ev.local) : null,
        ev.descricao ? h('p.story-desc', ev.descricao) : null));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const p = barras[i].firstChild;
        p.style.transition = `width ${DURACAO}ms linear`;
        p.style.width = '100%';
      }));
      timer = setTimeout(() => ir(atual + 1), DURACAO);
    }
    document.addEventListener('keydown', teclas);
    document.body.appendChild(fundo);
    ir(inicio);
  }

  App.abrirStories = abrirStories;

  App.paginas.inicio = {
    titulo: 'Início',
    async render(el) {
      const hoje = util.hoje();
      const domingo = util.inicioSemana(hoje);
      const sabado = util.somarDias(domingo, 6);
      const [eventos, escalas, membros, ministerios, ensaios] = await Promise.all([
        App.db.list('eventos', { gte: { data: hoje }, order: 'data' }),
        App.db.list('escalas', { gte: { data: domingo }, lte: { data: sabado }, order: 'data' }),
        App.db.list('membros'),
        App.db.list('ministerios'),
        App.db.list('ensaios', { gte: { data: hoje }, order: 'data' }),
      ]);
      const pm = util.porId(membros), pmin = util.porId(ministerios);
      const nome = (window.APP_CONFIG || {}).NOME_IGREJA || 'Igreja';

      const hora = new Date().getHours();
      const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
      el.appendChild(h('header.pagina-topo', h('div',
        h('p.saudacao-data', util.dataLonga(hoje)),
        h('h1', saudacao + '!'),
        h('p.subtitulo', `Bem-vindo ao sistema da ${nome}.`))));

      // Stories
      const stories = h('section.stories', { 'aria-label': 'Próximos cultos e eventos' },
        eventos.length
          ? eventos.map((ev, i) => h('button.story', { type: 'button', onclick: () => abrirStories(eventos, i) },
            h('span.story-anel',
              h('span.story-img', {
                style: ev.imagem_url
                  ? { backgroundImage: `url("${ev.imagem_url.replace(/"/g, '%22')}")` }
                  : { background: `linear-gradient(160deg, ${CORES[i % CORES.length]}, #0A1628)` },
              }, ev.imagem_url ? '' : util.dataCurta(ev.data))),
            h('span.story-titulo', ev.titulo)))
          : h('p.muted', 'Nenhum evento futuro. Cadastre em "Eventos".'),
        h('a.story.novo', { href: '#/eventos' }, h('span.story-anel.cinza', h('span.story-img.mais', '+')), h('span.story-titulo', 'Eventos')));
      el.appendChild(stories);

      const grade = h('div.grade-2');

      // Escalas da semana
      const porDia = {};
      for (const e of escalas) (porDia[e.data] = porDia[e.data] || []).push(e);
      const cardEscalas = h('section.card',
        h('div.card-topo', h('h2', '📅 Escalas desta semana'), h('a.link', { href: '#/escalas' }, 'Ver todas')),
        Object.keys(porDia).length
          ? Object.keys(porDia).sort().map((dia) => h('div.dia-bloco' + (dia === hoje ? '.hoje' : ''),
            h('h3', util.dataLonga(dia), dia === hoje ? h('span.selo', 'Hoje') : null),
            h('ul.lista-simples', porDia[dia].map((e) => {
              const mi = pmin[e.ministerio_id] || {};
              return h('li',
                h('span.etiqueta', { style: { background: mi.cor || '#6b7280' } }, mi.nome || '—'),
                h('span', (pm[e.membro_id] || {}).nome || 'A definir'),
                e.funcao ? h('span.muted', ' · ' + e.funcao) : null);
            }))))
          : h('p.muted', 'Nenhuma escala montada para esta semana ainda.'));
      grade.appendChild(cardEscalas);

      const lateral = h('div.coluna');
      const ensaio = ensaios[0];
      lateral.appendChild(h('section.card',
        h('div.card-topo', h('h2', '🎵 Próximo ensaio'), h('a.link', { href: '#/louvor' }, 'Louvor')),
        ensaio
          ? [h('p.destaque', util.dataLonga(ensaio.data) + (ensaio.hora ? ' às ' + ensaio.hora : '')),
            ensaio.local ? h('p.muted', '📍 ' + ensaio.local) : null]
          : h('p.muted', 'Nenhum ensaio marcado.')));

      lateral.appendChild(h('section.card',
        h('h2', 'Atalhos'),
        h('div.atalhos',
          [['membros', '👥', 'Membros'], ['ministerios', '🤝', 'Ministérios'], ['cantina', '☕', 'Cantina'], ['aprender', '📖', 'Aprender']]
            .map(([r, i, t]) => h('a.atalho', { href: '#/' + r }, h('span', { 'aria-hidden': 'true' }, i), t)))));
      grade.appendChild(lateral);
      el.appendChild(grade);
    },
  };
})();
