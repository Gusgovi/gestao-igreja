// Inicialização: menu, rotas (#/pagina/parametro) e login.
(function () {
  const App = (window.App = window.App || {});
  const { h } = App;

  const MENU = [
    ['inicio', 'Início', '🏠'],
    ['membros', 'Membros', '👥'],
    ['ministerios', 'Ministérios', '🤝'],
    ['escalas', 'Escalas', '📅'],
    ['louvor', 'Louvor', '🎵'],
    ['cantina', 'Cantina', '☕'],
    ['eventos', 'Eventos', '📣'],
    ['aprender', 'Aprender', '📖'],
  ];
  const MENU_CELULAR = ['inicio', 'escalas', 'louvor', 'cantina'];

  function montarLayout() {
    const cfg = window.APP_CONFIG || {};
    const link = ([rota, texto, icone]) =>
      h('a.menu-link', { href: '#/' + rota, 'data-rota': rota },
        h('span.menu-icone', { 'aria-hidden': 'true' }, icone), h('span', texto));

    const lateral = h('nav.lateral', { 'aria-label': 'Menu principal' },
      h('div.marca', h('span.marca-logo', { 'aria-hidden': 'true' }, '✝'), h('span', cfg.NOME_IGREJA || 'Igreja')),
      MENU.map(link),
      h('div.lateral-rodape',
        App.db.modo === 'local'
          ? h('p.modo', 'Modo demonstração: os dados ficam só neste navegador.')
          : null,
        App.db.modo === 'local'
          ? h('button.btn.secundario.pequeno', { type: 'button', onclick: restaurarExemplo }, 'Restaurar dados de exemplo')
          : h('button.btn.secundario.pequeno', { type: 'button', onclick: sair }, 'Sair')));

    const inferior = h('nav.inferior', { 'aria-label': 'Atalhos' },
      MENU.filter(([r]) => MENU_CELULAR.includes(r)).map(link),
      h('button.menu-link', { type: 'button', onclick: () => document.body.classList.toggle('menu-aberto'), 'aria-label': 'Abrir menu completo' },
        h('span.menu-icone', { 'aria-hidden': 'true' }, '☰'), h('span', 'Menu')));

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
    iniciar();
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

  function telaLogin() {
    const cfg = window.APP_CONFIG || {};
    const app = document.getElementById('app');
    app.innerHTML = '';
    const form = App.formulario([
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
      { nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true },
    ], {}, {
      textoSalvar: 'Entrar',
      aoSalvar: async ({ email, senha }) => { await App.db.entrar(email, senha); iniciar(); },
    });
    app.appendChild(h('div.login',
      h('div.login-caixa',
        h('div.marca.grande', h('span.marca-logo', '✝'), h('span', cfg.NOME_IGREJA || 'Igreja')),
        h('p', 'Entre com o e-mail e a senha cadastrados pela secretaria.'),
        form)));
  }

  async function iniciar() {
    const usuario = await App.db.usuario().catch(() => null);
    if (!usuario) return telaLogin();
    montarLayout();
    rotear();
  }

  window.addEventListener('hashchange', () => { if (document.getElementById('conteudo')) rotear(); });
  document.addEventListener('DOMContentLoaded', iniciar);
})();
