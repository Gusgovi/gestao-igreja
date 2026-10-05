// Página de boas-vindas (landing): primeira tela que aparece ao abrir o site.
// Mostra o que o sistema faz (com prévias feitas a partir dos dados reais, quando dá para ler)
// e leva para o login, ou direto para o sistema no modo demonstração.
(function () {
  const App = window.App;
  const { h, util } = App;

  // Onda do logo: água (azul), Espírito (branco) e sangue (vermelho) — 1 João 5:8
  App.logoOnda = function (classe = '') {
    const svg = `<svg viewBox="0 0 600 440" aria-hidden="true" focusable="false">
      <path class="onda-agua" fill="#3BA9E6" d="M30 425C140 310 255 150 415 140C525 133 585 235 548 345C536 262 488 208 415 208C285 208 170 330 30 425Z"/>
      <path class="onda-espirito" fill="#FFFFFF" d="M75 428C185 330 278 228 405 222C488 218 532 280 516 355C500 298 460 268 405 270C305 274 205 350 75 428Z"/>
      <path class="onda-sangue" fill="#EF3B3F" d="M120 430C220 355 300 290 395 283C460 278 495 322 488 385C472 345 442 326 397 328C322 332 245 375 120 430Z"/>
    </svg>`;
    return h('span.logo-onda' + (classe ? '.' + classe : ''), { html: svg });
  };

  const VERSICULO = 'Porque três são os que testificam na terra: o Espírito, e a água, e o sangue; e estes três concordam num.';

  // Lê o que der para as prévias. Sem login no Supabase as regras do banco bloqueiam a leitura,
  // então cada lista cai para vazio e a prévia usa um exemplo.
  async function carregarDados() {
    const hoje = util.hoje();
    const domingo = util.inicioSemana(hoje);
    const ler = (tabela, opts) => App.db.list(tabela, opts).catch(() => []);
    const [escalas, membros, ministerios, musicas, itens, eventos, pastores] = await Promise.all([
      ler('escalas', { gte: { data: hoje }, lte: { data: util.somarDias(domingo, 13) }, order: 'data' }),
      ler('membros'), ler('ministerios'), ler('musicas'), ler('cantina_itens'),
      ler('eventos', { gte: { data: hoje }, order: 'data' }),
      ler('pastores', { order: 'ordem' }),
    ]);
    return { escalas, membros, ministerios, musicas, itens, eventos, pastores };
  }

  // ---------- Prévias de cada área (mini telas dentro dos cards) ----------
  function previaEscalas({ escalas, membros, ministerios }) {
    const pm = util.porId(membros), pmin = util.porId(ministerios);
    const linhas = escalas.slice(0, 4).map((e) => ({
      dia: util.dataCurta(e.data),
      ministerio: (pmin[e.ministerio_id] || {}).nome || 'Ministério',
      cor: (pmin[e.ministerio_id] || {}).cor,
      pessoa: (pm[e.membro_id] || {}).nome || 'A definir',
      funcao: e.funcao,
    }));
    const exemplo = [
      { dia: 'Dom', ministerio: 'Louvor', cor: '#7c3aed', pessoa: 'Ana', funcao: 'Vocal' },
      { dia: 'Dom', ministerio: 'Cantina', cor: '#ea580c', pessoa: 'Carla', funcao: 'Caixa' },
      { dia: 'Qua', ministerio: 'Portaria', cor: '#0284c7', pessoa: 'Daniel', funcao: 'Recepção' },
    ];
    return h('ul.previa-escalas', (linhas.length ? linhas : exemplo).map((l) => h('li',
      h('span.previa-dia', l.dia),
      h('span.etiqueta', { style: { background: l.cor || '#3B4F8F' } }, l.ministerio),
      h('strong', l.pessoa),
      l.funcao ? h('span.muted', l.funcao) : null)));
  }

  function previaLouvor({ musicas }) {
    const lista = musicas.length ? musicas.slice(0, 3) : [
      { titulo: 'Bondade de Deus', tom: 'G' }, { titulo: 'Grande é o Senhor', tom: 'D' }, { titulo: 'Lindo És', tom: 'A' },
    ];
    return h('ol.previa-setlist', lista.map((m) => h('li', h('span', m.titulo), m.tom ? h('span.tom', m.tom) : null)));
  }

  function previaCantina({ itens }) {
    const lista = itens.length ? itens.slice(0, 3) : [{ nome: 'Café', preco: 2.5 }, { nome: 'Bolo', preco: 5 }, { nome: 'Coxinha', preco: 7 }];
    return h('div.previa-precos', lista.map((i) => h('span.previa-preco', i.nome, h('strong', util.dinheiro(i.preco)))));
  }

  function previaMembros({ membros }) {
    const nomes = membros.length ? membros.map((m) => m.nome) : ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Daniel Rocha', 'Eduarda Alves'];
    return h('div.previa-membros',
      h('div.pilha', nomes.slice(0, 5).map((n) => App.avatar(n))),
      h('p', h('strong', String(membros.length || nomes.length)), ' pessoas cadastradas'));
  }

  // ---------- Eventos em cards grandes ----------
  const CORES_EVENTO = ['#1F6FB2', '#2D9CDB', '#3B4F8F', '#0E7490', '#24518F', '#4A5FA8'];
  function cardEvento(ev, i, destino) {
    const fundo = ev.imagem_url
      ? { backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(4, 12, 26, .92)), url("${ev.imagem_url.replace(/"/g, '%22')}")` }
      : { backgroundImage: `radial-gradient(120% 80% at 80% 0%, ${CORES_EVENTO[i % CORES_EVENTO.length]}, #0A1628 70%)` };
    const d = util.parse(ev.data);
    return h('a.evento-grande', { href: destino, style: fundo },
      h('span.evento-grande-data', h('strong', String(d.getDate())), h('span', util.dataCurta(ev.data).split(' ')[1])),
      h('span.evento-grande-texto',
        h('strong', ev.titulo),
        h('span', [util.diaSemana(ev.data), ev.hora, ev.local].filter(Boolean).join(', '))));
  }

  // ---------- Versículo que acende palavra por palavra ao rolar ----------
  function versiculoAnimado() {
    const palavras = VERSICULO.split(' ').map((p) => h('span.palavra', p + ' '));
    const bloco = h('p.versiculo-texto', { 'aria-label': VERSICULO }, palavras);
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) { palavras.forEach((p) => p.classList.add('acesa')); return bloco; }
    let pendente = false;
    function atualizar() {
      pendente = false;
      if (!bloco.isConnected) { window.removeEventListener('scroll', agendar); return; }
      const r = bloco.getBoundingClientRect();
      const alturaTela = window.innerHeight;
      // 0 quando o bloco entra por baixo, 1 quando chega a ~35% do topo
      const progresso = Math.min(1, Math.max(0, (alturaTela - r.top) / (alturaTela * .65 + r.height * .5)));
      const acesas = Math.round(progresso * palavras.length);
      palavras.forEach((p, i) => p.classList.toggle('acesa', i < acesas));
    }
    function agendar() { if (!pendente) { pendente = true; requestAnimationFrame(atualizar); } }
    window.addEventListener('scroll', agendar, { passive: true });
    requestAnimationFrame(atualizar);
    return bloco;
  }

  function faixaCorrendo() {
    const item = () => [h('span', 'Água'), App.logoOnda('faixa-onda'), h('span', 'Espírito'), App.logoOnda('faixa-onda'), h('span', 'Sangue'), App.logoOnda('faixa-onda')];
    const trilho = () => h('div.faixa-trilho', item(), item(), item(), item());
    return h('div.faixa', { 'aria-hidden': 'true' }, trilho(), trilho());
  }

  App.telaBemVindo = async function ({ logado }) {
    const cfg = window.APP_CONFIG || {};
    const nome = cfg.NOME_IGREJA || 'Igreja';
    const demo = App.db.modo === 'local';
    const destino = logado || demo ? '#/inicio' : '#/entrar';
    const textoEntrar = logado || demo ? 'Abrir o sistema' : 'Entrar';

    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(h('p.carregando', 'Carregando…'));
    const dados = await carregarDados();
    app.innerHTML = '';
    document.title = nome;

    const irPara = (id) => (e) => { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); };
    const proximo = dados.eventos[0];

    app.appendChild(h('div.landing',
      h('header.landing-nav',
        h('a.marca', { href: '#/bem-vindo' }, App.logoOnda('mini'), h('span', nome)),
        h('nav.landing-links', { 'aria-label': 'Seções da página' },
          h('a', { href: '#/bem-vindo', onclick: irPara('o-que-tem') }, 'O que tem'),
          dados.eventos.length ? h('a', { href: '#/bem-vindo', onclick: irPara('eventos') }, 'Eventos') : null,
          dados.pastores.length ? h('a', { href: '#/bem-vindo', onclick: irPara('pastores') }, 'Pastores') : null,
          h('a', { href: '#/bem-vindo', onclick: irPara('como-comecar') }, 'Como começar')),
        h('a.btn.pequeno', { href: destino }, textoEntrar)),

      h('main#conteudo.landing-main', { tabindex: '-1' },
        h('section.hero',
          h('div.hero-brilho', { 'aria-hidden': 'true' }),
          App.logoOnda('hero-onda'),
          h('div.hero-texto',
            h('p.hero-igreja', 'Igreja ' + nome),
            h('h1', h('span', 'Quem serve,'), h('span', 'onde e'), h('span', 'quando.')),
            h('p.hero-sub', 'Escalas, louvor, cantina e membros da igreja num só lugar. Letras grandes, botões fáceis e tudo funcionando no celular.'),
            h('div.hero-acoes',
              h('a.btn.grande', { href: destino }, textoEntrar),
              h('a.btn.vidro.grande', { href: '#/bem-vindo', onclick: irPara('o-que-tem') }, 'Ver o que tem aqui')),
            demo ? h('p.hero-nota', 'Modo demonstração: dá para testar tudo, os dados ficam só neste navegador.')
              : !logado ? h('p.hero-nota', 'Primeira vez aqui? ', h('a', { href: '#/cadastro' }, 'Cadastre-se como visitante')) : null),
          proximo ? h('a.hero-proximo', { href: destino },
            h('span.hero-proximo-rotulo', 'Próximo encontro'),
            h('strong', proximo.titulo),
            h('span', [util.dataLonga(proximo.data), proximo.hora].filter(Boolean).join(' às '))) : null),

        faixaCorrendo(),

        h('section#o-que-tem.landing-secao', { 'aria-labelledby': 'titulo-areas' },
          h('div.secao-cabeca',
            h('h2#titulo-areas', 'Tudo da igreja num lugar só'),
            h('p', 'Cada ministério cuida da sua parte e todo mundo enxerga o que precisa.')),
          h('div.bento',
            h('a.bento-card.bento-escalas', { href: destino },
              h('div.bento-topo', h('span.area-icone', App.icone('escalas')), h('h3', 'Escalas')),
              h('p', 'Quem serve, onde e quando. Cada ministério monta a sua semana.'),
              previaEscalas(dados)),
            h('a.bento-card', { href: destino },
              h('div.bento-topo', h('span.area-icone', App.icone('louvor')), h('h3', 'Louvor')),
              h('p', 'Repertório com tom e BPM, e ensaios com a ordem das músicas.'),
              previaLouvor(dados)),
            h('a.bento-card', { href: destino },
              h('div.bento-topo', h('span.area-icone', App.icone('cantina')), h('h3', 'Cantina')),
              h('p', 'Cardápio com preços e o caixa somando as vendas do dia.'),
              previaCantina(dados)),
            h('a.bento-card.bento-largo', { href: destino },
              h('div.bento-topo', h('span.area-icone', App.icone('membros')), h('h3', 'Membros')),
              h('p', 'Cadastro simples, busca por nome e aniversariantes do mês.'),
              previaMembros(dados)))),

        dados.eventos.length ? h('section#eventos.landing-secao', { 'aria-labelledby': 'titulo-eventos' },
          h('div.secao-cabeca', h('h2#titulo-eventos', 'Próximos encontros')),
          h('div.eventos-trilho', dados.eventos.slice(0, 8).map((ev, i) => cardEvento(ev, i, destino)))) : null,

        dados.pastores.length ? h('section#pastores.landing-secao', { 'aria-labelledby': 'titulo-pastores' },
          h('div.secao-cabeca', h('h2#titulo-pastores', 'Conheça os pastores')),
          App.cartoesPastores(dados.pastores)) : null,

        h('section#como-comecar.landing-secao.passos-secao', { 'aria-labelledby': 'titulo-passos' },
          h('div.secao-cabeca', h('h2#titulo-passos', 'Como começar')),
          h('ol.passos',
            h('li', h('strong', 'Peça seu acesso à secretaria.'), h('span', 'Ela cadastra você com o seu e-mail. ',
              demo || logado ? 'Visitante pode criar a própria conta.' : h('a', { href: '#/cadastro' }, 'Visitante pode criar a própria conta.'))),
            h('li', h('strong', 'Entre com e-mail e senha.'), h('span', 'No celular ou no computador, do jeito que preferir.')),
            h('li', h('strong', 'Veja quando é a sua vez de servir.'), h('span', 'A tela inicial já mostra as escalas desta semana.')))),

        h('section.versiculo', { 'aria-label': 'Versículo' },
          h('blockquote', versiculoAnimado(), h('cite', '1 João 5:8')),
          h('p.versiculo-nota', 'É daqui que vem a onda do nosso logo: azul da água, branco do Espírito e vermelho do sangue.'))),

      h('footer.landing-rodape',
        h('div.rodape-linha',
          h('a.marca', { href: '#/bem-vindo' }, App.logoOnda('mini'), h('span', nome)),
          h('a.btn.pequeno', { href: destino }, textoEntrar)),
        h('p.rodape-gigante', { 'aria-hidden': 'true' }, nome))));

    window.scrollTo(0, 0);
  };
})();
