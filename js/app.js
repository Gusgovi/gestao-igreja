// Inicialização: menu, rotas (#/pagina/parametro) e login.
(function () {
  const App = (window.App = window.App || {});
  const { h } = App;

  // [rota, texto] — o ícone tem o mesmo nome da rota (js/icones.js)
  const MENU = [
    ['inicio', 'Início'],
    ['membros', 'Membros'],
    ['ministerios', 'Ministérios'],
    ['escalas', 'Escalas'],
    ['louvor', 'Louvor'],
    ['cantina', 'Cantina'],
    ['midia', 'Mídia'],
    ['eventos', 'Eventos'],
    ['aprender', 'Aprender'],
    ['pastores', 'Pastores'],
    ['ajuda', 'Ajuda'],
  ];
  const MENU_CELULAR = ['inicio', 'escalas', 'louvor', 'cantina'];
  // Visitante só vê o que é geral: some o que é interno (escalas, membros, louvor)
  const SO_MEMBROS = ['membros', 'ministerios', 'escalas', 'louvor'];
  const MENU_CELULAR_VISITANTE = ['inicio', 'eventos', 'cantina', 'aprender'];
  // Rotas que abrem fora do layout com menu
  const ROTA_BEM_VINDO = 'bem-vindo';
  const ROTA_LOGIN = 'entrar';
  const ROTA_CADASTRO = 'cadastro';

  function montarLayout() {
    const cfg = window.APP_CONFIG || {};
    const visitante = App.ehVisitante(App.perfil);
    const menu = visitante ? MENU.filter(([r]) => !SO_MEMBROS.includes(r)) : MENU;
    const celular = visitante ? MENU_CELULAR_VISITANTE : MENU_CELULAR;
    const link = ([rota, texto]) =>
      h('a.menu-link', { href: '#/' + rota, 'data-rota': rota },
        h('span.menu-icone', App.icone(rota)), h('span', texto));

    const lateral = h('nav.lateral', { 'aria-label': 'Menu principal' },
      h('a.marca', { href: '#/' + ROTA_BEM_VINDO, title: 'Página de boas-vindas' }, App.logoOnda('mini'), h('span', cfg.NOME_IGREJA || 'Igreja')),
      menu.map(link),
      h('div.lateral-rodape',
        App.db.modo === 'local'
          ? h('p.modo', 'Modo demonstração: os dados ficam só neste navegador.')
          : null,
        App.db.modo === 'local'
          ? h('button.btn.secundario.pequeno', { type: 'button', onclick: restaurarExemplo }, 'Restaurar dados de exemplo')
          : h('button.btn.secundario.pequeno', { type: 'button', onclick: sair }, App.icone('sair'), 'Sair')));

    const inferior = h('nav.inferior', { 'aria-label': 'Atalhos' },
      celular.map((r) => menu.find(([x]) => x === r)).map(link),
      h('button.menu-link', { type: 'button', onclick: () => document.body.classList.toggle('menu-aberto'), 'aria-label': 'Abrir menu completo' },
        h('span.menu-icone', App.icone('menu')), h('span', 'Menu')));

    const app = document.getElementById('app');
    app.innerHTML = '';
    app.append(
      lateral,
      h('div.cortina', { onclick: () => document.body.classList.remove('menu-aberto') }),
      h('main#conteudo', { tabindex: '-1' }),
      inferior);
  }

  async function restaurarExemplo() {
    if (!(await App.confirmar('Isso apaga tudo o que você cadastrou e volta para os dados de exemplo. Continuar?', 'Sim, restaurar'))) return;
    await App.db.resetar();
    App.toast('Dados de exemplo restaurados.');
    rotear();
  }

  async function sair() {
    await App.db.sair();
    location.hash = '#/' + ROTA_BEM_VINDO;
  }

  async function rotear() {
    document.body.classList.remove('menu-aberto');
    const [rota = 'inicio', ...params] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
    const restrita = SO_MEMBROS.includes(rota) && App.ehVisitante(App.perfil);
    const pagina = App.paginas[rota] || App.paginas.inicio;
    document.querySelectorAll('.menu-link[data-rota]').forEach((a) => {
      const ativo = a.dataset.rota === rota;
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const main = document.getElementById('conteudo');
    main.innerHTML = '';
    main.appendChild(h('p.carregando', 'Carregando…'));
    try {
      // papel de quem está logado: as telas usam App.posso() para esconder o que a pessoa não pode alterar
      App.perfil = await App.db.perfil().catch(() => null);
      const conteudo = h('div.pagina');
      if (restrita) {
        conteudo.appendChild(App.vazio('Esta parte é só para os membros da igreja. Quer servir com a gente? Fale com a secretaria.',
          h('a.btn', { href: '#/inicio' }, 'Voltar para o início')));
      } else {
        await pagina.render(conteudo, params, rotear);
      }
      main.innerHTML = '';
      main.appendChild(conteudo);
      document.title = `${pagina.titulo} · ${(window.APP_CONFIG || {}).NOME_IGREJA || 'Igreja'}`;
    } catch (e) {
      console.error(e);
      main.innerHTML = '';
      main.appendChild(App.vazio('Algo deu errado ao carregar esta página: ' + e.message));
    }
    window.scrollTo(0, 0);
  }
  App.rotear = rotear;
  // Atalho para as telas: App.posso('escalas', { ministerio_id }) — só esconde botões, quem bloqueia é o banco
  App.posso = (tabela, registro) => App.pode(App.perfil, tabela, registro);

  function telaLogin() {
    const cfg = window.APP_CONFIG || {};
    const app = document.getElementById('app');
    app.innerHTML = '';
    const form = App.formulario([
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
      { nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true },
    ], {}, {
      textoSalvar: 'Entrar',
      aoSalvar: async ({ email, senha }) => {
        await App.db.entrar(email, senha);
        if (rotaAtual() === ROTA_LOGIN) location.hash = '#/inicio'; else iniciar();
      },
    });
    app.appendChild(h('main.login',
      h('div.login-caixa',
        h('a.marca.grande', { href: '#/' + ROTA_BEM_VINDO }, App.logoOnda('mini'), h('span', cfg.NOME_IGREJA || 'Igreja')),
        h('h1', 'Entrar'),
        h('p.muted', 'Use o e-mail e a senha cadastrados pela secretaria.'),
        form,
        h('div.login-visitante',
          h('p', 'Primeira vez aqui?'),
          h('a.btn.secundario', { href: '#/' + ROTA_CADASTRO }, 'Sou visitante, quero me cadastrar')),
        h('a.link.login-voltar', { href: '#/' + ROTA_BEM_VINDO }, 'Voltar para o início'))));
    document.title = 'Entrar · ' + (cfg.NOME_IGREJA || 'Igreja');
  }

  // Cadastro de visitante: a própria pessoa cria a conta. Entra vendo só o que é geral.
  function telaCadastro() {
    const cfg = window.APP_CONFIG || {};
    const app = document.getElementById('app');
    app.innerHTML = '';
    const caixa = h('div.login-caixa');
    const form = App.formulario([
      { nome: 'nome', rotulo: 'Seu nome', obrigatorio: true },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
      { nome: 'senha', rotulo: 'Crie uma senha', tipo: 'password', obrigatorio: true, ajuda: 'Pelo menos 6 letras ou números.' },
    ], {}, {
      textoSalvar: 'Criar minha conta',
      aoSalvar: async ({ nome, email, senha }) => {
        if (senha.length < 6) throw new Error('a senha precisa ter pelo menos 6 letras ou números.');
        const entrou = await App.db.cadastrar(nome, email, senha);
        if (entrou) { App.toast('Conta criada. Seja bem-vindo!'); location.hash = '#/inicio'; return; }
        caixa.innerHTML = '';
        caixa.append(
          h('h1', 'Quase lá!'),
          h('p', 'Mandamos um e-mail para ', h('strong', email), '. Abra o e-mail e toque no link para confirmar. Depois é só entrar.'),
          h('a.btn', { href: '#/' + ROTA_LOGIN }, 'Ir para Entrar'));
      },
    });
    caixa.append(
      h('a.marca.grande', { href: '#/' + ROTA_BEM_VINDO }, App.logoOnda('mini'), h('span', cfg.NOME_IGREJA || 'Igreja')),
      h('h1', 'Cadastro de visitante'),
      h('p.muted', 'Crie sua conta para ver os eventos, o cardápio da cantina, as fotos dos cultos e os textos da área Aprender.'),
      form,
      h('p.muted.login-nota', 'Já é membro? A secretaria cadastra o seu acesso.'),
      h('a.link.login-voltar', { href: '#/' + ROTA_LOGIN }, 'Já tenho conta: entrar'));
    app.appendChild(h('main.login', caixa));
    document.title = 'Cadastro · ' + (cfg.NOME_IGREJA || 'Igreja');
  }

  function rotaAtual() {
    return location.hash.startsWith('#/') ? location.hash.slice(2).split('/')[0] : '';
  }

  // Sem rota (site recém-aberto) ou #/bem-vindo: página de boas-vindas.
  // Sem login: tela de entrar. Com login (ou no modo demonstração): o sistema.
  async function iniciar() {
    const rota = rotaAtual();
    const usuario = await App.db.usuario().catch(() => null);
    if (!rota || rota === ROTA_BEM_VINDO) return App.telaBemVindo({ logado: !!usuario && App.db.modo !== 'local' });
    if (!usuario) return rota === ROTA_CADASTRO && App.db.cadastrar ? telaCadastro() : telaLogin();
    if (rota === ROTA_LOGIN || rota === ROTA_CADASTRO) { location.replace('#/inicio'); return; }
    // o menu muda conforme o papel (visitante vê menos coisas)
    App.perfil = await App.db.perfil().catch(() => null);
    montarLayout();
    rotear();
  }

  window.addEventListener('hashchange', () => {
    // Âncoras comuns (ex.: "Pular para o conteúdo") não são rotas
    if (location.hash && !location.hash.startsWith('#/')) return;
    const rota = rotaAtual();
    const noSistema = document.querySelector('main#conteudo:not(.landing-main)');
    if (noSistema && rota && rota !== ROTA_BEM_VINDO && rota !== ROTA_LOGIN && rota !== ROTA_CADASTRO) rotear();
    else iniciar();
  });
  document.addEventListener('DOMContentLoaded', iniciar);
})();
