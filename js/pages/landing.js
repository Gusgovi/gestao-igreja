// Página de boas-vindas: a "home" pública da igreja, para visitantes e para quem ainda não entrou.
// Cultos, próximos eventos, pastores e primeiros passos na fé; leva ao cadastro de visitante e ao login.
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

  // Só o que é público (eventos, pastores e textos do Aprender): a página é para quem ainda não entrou.
  async function carregarDados() {
    const hoje = util.hoje();
    const ler = (tabela, opts) => App.db.list(tabela, opts).catch(() => []);
    const [eventos, pastores, conteudos, sobre] = await Promise.all([
      ler('eventos', { gte: { data: hoje }, order: 'data' }),
      ler('pastores', { order: 'ordem' }),
      ler('conteudos', { eq: { secao: 'abc' }, order: 'ordem' }),
      // "Sobre nós" = textos da seção "Nossa igreja" (visão, missão, valores) da área Aprender
      ler('conteudos', { eq: { secao: 'visao' }, order: 'ordem' }),
    ]);
    return { eventos, pastores, conteudos, sobre };
  }

  // Dias e horários dos cultos (js/config.js > CULTOS)
  function cartaoCulto(c, i) {
    return h('article.culto-card' + (i % 2 ? '.alt' : ''),
      h('span.culto-dia', c.dia),
      h('strong.culto-hora' + (c.hora ? '' : '.sem-hora'), c.hora || 'Horário em breve'),
      c.nome ? h('span.culto-nome', c.nome) : null);
  }

  // Redes sociais e WhatsApp da igreja (js/config.js), com ícone
  const ICONES_REDE = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".6" fill="currentColor"/>',
    facebook: '<path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a.5.5 0 0 1 .5-.5Z"/>',
    whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.1L4 20Z"/><path d="M9 8.5c0 3.3 2.9 6.5 6.5 6.5l1-1.4-2-1-1 .8c-1.3-.5-2.4-1.6-2.9-2.9l.8-1-1-2L9 8.5Z"/>',
  };
  // Botões das redes (js/config.js). Também usados na tela Mídia: App.redes({ zap: false }).
  App.redes = function ({ zap: comZap = true } = {}) {
    const cfg = window.APP_CONFIG || {};
    const insta = (cfg.INSTAGRAM || '').replace(/^@/, '');
    const zap = (cfg.WHATSAPP || '').replace(/\D/g, '');
    const item = (rede, href, texto) => h('a.rede', { href, target: '_blank', rel: 'noopener', 'aria-label': texto },
      h('span.rede-icone', { 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES_REDE[rede]}</svg>` }),
      h('span', texto));
    const lista = [
      insta ? item('instagram', 'https://www.instagram.com/' + insta, '@' + insta) : null,
      cfg.FACEBOOK ? item('facebook', cfg.FACEBOOK, 'Facebook') : null,
      // wa.me precisa do número com o código do Brasil (55)
      comZap && zap ? item('whatsapp', 'https://wa.me/' + (zap.length <= 11 ? '55' + zap : zap), cfg.WHATSAPP) : null,
    ].filter(Boolean);
    return lista.length ? h('nav.redes', { 'aria-label': comZap ? 'Redes sociais e contato' : 'Redes sociais' }, lista) : null;
  };

  // Primeiros textos do "ABC do Evangelho", para quem está chegando
  function cartaoTexto(c, i, destino) {
    const corpo = (c.corpo || '').split(/\n\s*\n/)[0] || '';
    const resumo = corpo.length > 140 ? corpo.slice(0, 137).trim() + '…' : corpo;
    return h('a.texto-card', { href: destino },
      h('span.texto-num', String(i + 1).padStart(2, '0')),
      h('strong', c.titulo),
      resumo ? h('span', resumo) : null);
  }

  // ---------- Eventos em cards grandes ----------
  const CORES_EVENTO = ['#1F6FB2', '#2D9CDB', '#3B4F8F', '#0E7490', '#24518F', '#4A5FA8'];
  // Toque no card abre o evento em tela cheia, igual aos stories
  function cardEvento(ev, i, lista) {
    const fundo = ev.imagem_url
      ? { backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(4, 12, 26, .92)), url("${ev.imagem_url.replace(/"/g, '%22')}")` }
      : { backgroundImage: `radial-gradient(120% 80% at 80% 0%, ${CORES_EVENTO[i % CORES_EVENTO.length]}, #0A1628 70%)` };
    const d = util.parse(ev.data);
    return h('button.evento-grande', { type: 'button', style: fundo, onclick: () => App.abrirStories(lista, i) },
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
    const dentro = logado || demo;
    const destino = dentro ? '#/inicio' : '#/entrar';
    const cadastro = dentro ? '#/inicio' : '#/cadastro';
    const cultos = cfg.CULTOS || [{ dia: 'Quarta-feira' }, { dia: 'Domingo' }];

    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(h('p.carregando', 'Carregando…'));
    const dados = await carregarDados();
    app.innerHTML = '';
    document.title = nome;

    const irPara = (id) => (e) => { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); };
    const proximo = dados.eventos[0];
    const mapa = cfg.ENDERECO ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(cfg.ENDERECO) : null;

    const acoesTopo = dentro
      ? h('a.btn.pequeno', { href: '#/inicio' }, 'Abrir o sistema')
      : [h('a.btn.vidro.pequeno', { href: '#/entrar' }, 'Entrar'), h('a.btn.pequeno', { href: '#/cadastro' }, 'Cadastre-se')];

    app.appendChild(h('div.landing',
      h('header.landing-nav',
        h('a.marca', { href: '#/bem-vindo' }, App.logoOnda('mini'), h('span', nome)),
        h('nav.landing-links', { 'aria-label': 'Seções da página' },
          dados.sobre.length ? h('a', { href: '#/bem-vindo', onclick: irPara('sobre') }, 'Sobre nós') : null,
          h('a', { href: '#/bem-vindo', onclick: irPara('cultos') }, 'Cultos'),
          dados.eventos.length ? h('a', { href: '#/bem-vindo', onclick: irPara('eventos') }, 'Eventos') : null,
          dados.pastores.length ? h('a', { href: '#/bem-vindo', onclick: irPara('pastores') }, 'Pastores') : null,
          dados.conteudos.length ? h('a', { href: '#/bem-vindo', onclick: irPara('chegando') }, 'Primeiros passos') : null),
        h('div.landing-nav-acoes', acoesTopo)),

      h('main#conteudo.landing-main', { tabindex: '-1' },
        h('section.hero',
          h('div.hero-brilho', { 'aria-hidden': 'true' }),
          App.logoOnda('hero-onda'),
          h('div.hero-texto',
            h('div.hero-topo', h('p.hero-igreja', 'Igreja ' + nome), App.redes({ zap: false })),
            h('h1', h('span', 'Um lugar'), h('span', 'para chamar'), h('span', 'de casa.')),
            h('p.hero-sub', 'Venha conhecer Jesus e a nossa família. Aqui você encontra os horários dos cultos, os próximos eventos e tudo o que acontece na igreja.'),
            h('div.hero-acoes',
              h('a.btn.grande', { href: '#/bem-vindo', onclick: irPara('cultos') }, 'Venha nos visitar'),
              h('a.btn.vidro.grande', { href: cadastro }, dentro ? 'Abrir o sistema' : 'Criar minha conta')),
            demo ? h('p.hero-nota', 'Modo demonstração: dá para testar tudo, os dados ficam só neste navegador.') : null),
          proximo ? h('a.hero-proximo', { href: '#/bem-vindo', onclick: irPara('eventos') },
            h('span.hero-proximo-rotulo', 'Próximo encontro'),
            h('strong', proximo.titulo),
            h('span', [util.dataLonga(proximo.data), proximo.hora].filter(Boolean).join(' às '))) : null),

        faixaCorrendo(),

        dados.sobre.length ? h('section#sobre.landing-secao', { 'aria-labelledby': 'titulo-sobre' },
          h('div.secao-cabeca', h('h2#titulo-sobre', 'Sobre nós')),
          h('div.sobre', dados.sobre.map((c) => h('article.sobre-item',
            h('h3', c.titulo),
            (c.corpo || '').split(/\n\s*\n/).filter(Boolean).map((t) => h('p', t)))))) : null,

        h('section#cultos.landing-secao', { 'aria-labelledby': 'titulo-cultos' },
          h('div.secao-cabeca',
            h('h2#titulo-cultos', 'Nossos cultos'),
            h('p', 'Você é muito bem-vindo. Chegue um pouco antes, a gente vai te receber na porta.')),
          h('div.cultos', cultos.map(cartaoCulto),
            h('article.culto-card.onde',
              h('span.culto-dia', 'Onde estamos'),
              h('strong.culto-endereco', cfg.ENDERECO || 'Endereço em breve'),
              mapa ? h('a.btn.vidro.pequeno', { href: mapa, target: '_blank', rel: 'noopener' }, 'Ver no mapa') : null,
              cfg.WHATSAPP ? h('a.link', { href: 'https://wa.me/55' + cfg.WHATSAPP.replace(/\D/g, ''), target: '_blank', rel: 'noopener' }, 'WhatsApp: ' + cfg.WHATSAPP) : null))),

        dados.eventos.length ? h('section#eventos.landing-secao', { 'aria-labelledby': 'titulo-eventos' },
          h('div.secao-cabeca', h('h2#titulo-eventos', 'Próximos encontros')),
          h('div.eventos-trilho', dados.eventos.slice(0, 8).map((ev, i, lista) => cardEvento(ev, i, lista)))) : null,

        dados.pastores.length ? h('section#pastores.landing-secao', { 'aria-labelledby': 'titulo-pastores' },
          h('div.secao-cabeca', h('h2#titulo-pastores', 'Conheça os pastores')),
          App.cartoesPastores(dados.pastores)) : null,

        dados.conteudos.length ? h('section#chegando.landing-secao', { 'aria-labelledby': 'titulo-chegando' },
          h('div.secao-cabeca',
            h('h2#titulo-chegando', 'Chegou agora?'),
            h('p', 'O ABC do Evangelho explica o básico da fé cristã, de um jeito simples. Crie sua conta para ler tudo.')),
          h('div.textos', dados.conteudos.slice(0, 3).map((c, i) => cartaoTexto(c, i, dentro ? '#/aprender' : cadastro)))) : null,

        h('section#como-comecar.landing-secao.passos-secao', { 'aria-labelledby': 'titulo-passos' },
          h('div.secao-cabeca', h('h2#titulo-passos', 'Como começar')),
          h('ol.passos',
            h('li', h('strong', 'Conheça a igreja.'),
              h('span', 'Dê uma olhada em quem somos, no que acreditamos e em quem cuida da nossa casa. Fique à vontade.')),
            h('li', h('strong', 'Crie a sua conta.'),
              h('span', 'É rapidinho: só nome, e-mail e senha. ',
                dentro ? null : h('a', { href: '#/cadastro' }, 'Criar minha conta'))),
            h('li', h('strong', 'Acompanhe tudo por aqui.'),
              h('span', 'Eventos, fotos dos cultos, o cardápio da cantina e os textos para quem está começando na fé.')))),

        h('section.versiculo', { 'aria-label': 'Versículo' },
          h('blockquote', versiculoAnimado(), h('cite', '1 João 5:8')),
          h('p.versiculo-nota', 'É daqui que vem a onda do nosso logo: azul da água, branco do Espírito e vermelho do sangue.')),

        h('section.landing-secao.convite', { 'aria-labelledby': 'titulo-convite' },
          h('h2#titulo-convite', 'Faça parte da família'),
          h('p', 'Com a sua conta você acompanha os eventos, as fotos dos cultos, o cardápio da cantina e os textos para quem está começando na fé.'),
          h('div.hero-acoes',
            h('a.btn.grande', { href: cadastro }, dentro ? 'Abrir o sistema' : 'Criar minha conta'),
            dentro ? null : h('a.btn.vidro.grande', { href: '#/entrar' }, 'Já tenho conta')),
          h('p.convite-nota', 'Serve em algum ministério? Depois de criar a conta, a secretaria libera o seu acesso de membro para ver as escalas.'))),

      h('footer.landing-rodape',
        h('div.rodape-linha',
          h('a.marca', { href: '#/bem-vindo' }, App.logoOnda('mini'), h('span', nome)),
          App.redes(),
          h('a.btn.pequeno', { href: destino }, dentro ? 'Abrir o sistema' : 'Entrar')),
        h('p.rodape-gigante', { 'aria-hidden': 'true' }, nome))));

    window.scrollTo(0, 0);
  };
})();
