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
    ['eventos', 'Eventos'],
    ['aprender', 'Aprender'],
    ['ajuda', 'Ajuda'],
  ];
  const MENU_CELULAR = ['inicio', 'escalas', 'louvor', 'cantina'];
  // Rotas que abrem fora do layout com menu
  const ROTA_BEM_VINDO = 'bem-vindo';
  const ROTA_LOGIN = 'entrar';

  function montarLayout() {
    const cfg = window.APP_CONFIG || {};
    const link = ([rota, texto]) =>
      h('a.menu-link', { href: '#/' + rota, 'data-rota': rota },
        h('span.menu-icone', App.icone(rota)), h('span', texto));

    const lateral = h('nav.lateral', { 'aria-label': 'Menu principal' },
      h('a.marca', { href: '#/' + ROTA_BEM_VINDO, title: 'Página de boas-vindas' }, App.logoOnda('mini'), h('span', cfg.NOME_IGREJA || 'Igreja')),
      MENU.map(link),
      h('div.lateral-rodape',
        App.db.modo === 'local'
          ? h('p.modo', 'Modo demonstração: os dados ficam só neste navegador.')
          : null,
        App.db.modo === 'local'
          ? h('button.btn.secundario.pequeno', { type: 'button', onclick: restaurarExemplo }, 'Restaurar dados de exemplo')
          : h('button.btn.secundario.pequeno', { type: 'button', onclick: sair }, App.icone('sair'), 'Sair')));

    const inferior = h('nav.inferior', { 'aria-label': 'Atalhos' },
      MENU.filter(([r]) => MENU_CELULAR.includes(r)).map(link),
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
      await pagina.render(conteudo, params, rotear);
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
        h('a.link.login-voltar', { href: '#/' + ROTA_BEM_VINDO }, 'Voltar para o início'))));
    document.title = 'Entrar · ' + (cfg.NOME_IGREJA || 'Igreja');
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
    if (!usuario) return telaLogin();
    if (rota === ROTA_LOGIN) { location.replace('#/inicio'); return; }
    montarLayout();
    rotear();
  }

  window.addEventListener('hashchange', () => {
    // Âncoras comuns (ex.: "Pular para o conteúdo") não são rotas
    if (location.hash && !location.hash.startsWith('#/')) return;
    const rota = rotaAtual();
    const noSistema = document.querySelector('main#conteudo:not(.landing-main)');
    if (noSistema && rota && rota !== ROTA_BEM_VINDO && rota !== ROTA_LOGIN) rotear();
    else iniciar();
  });
  document.addEventListener('DOMContentLoaded', iniciar);
})();
