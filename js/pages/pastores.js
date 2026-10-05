// Conheça os pastores: foto, nome e um texto sobre cada um.
// Aparece no menu e também na página de boas-vindas (para quem ainda não entrou).
(function () {
  const App = window.App;
  const { h } = App;
  App.paginas = App.paginas || {};

  const CAMPOS = [
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
    { nome: 'titulo', rotulo: 'Título', tipo: 'select', vazio: false, padrao: 'Pastor',
      opcoes: ['Pastor', 'Pastora'].map((t) => ({ valor: t, texto: t })) },
    { nome: 'foto_url', rotulo: 'Link da foto (opcional)', tipo: 'url', exemplo: 'https://',
      ajuda: 'Cole o endereço de uma foto. Do Instagram: clique com o botão direito na foto > "Copiar endereço da imagem".' },
    { nome: 'texto', rotulo: 'Sobre', tipo: 'textarea', linhas: 8, ajuda: 'Deixe uma linha em branco para separar parágrafos.' },
    { nome: 'ordem', rotulo: 'Ordem de exibição', tipo: 'number', min: 0 },
  ];

  // Cartões dos pastores. aoEditar(p) só é passado para quem pode alterar.
  App.cartoesPastores = function (pastores, aoEditar) {
    return h('div.pastores', pastores.map((p) => h('article.pastor-card',
      p.foto_url
        ? h('div.pastor-foto', { style: { backgroundImage: `url("${p.foto_url.replace(/"/g, '%22')}")` }, role: 'img', 'aria-label': 'Foto de ' + p.nome })
        : h('div.pastor-foto.sem-foto', { 'aria-hidden': 'true' }, App.util.iniciais(p.nome)),
      h('div.pastor-texto',
        h('span.cargo', p.titulo || 'Pastor'),
        h('h3', p.nome),
        (p.texto || '').split(/\n\s*\n/).filter(Boolean).map((t) => h('p', t)),
        aoEditar ? h('button.btn.secundario.pequeno', { type: 'button', onclick: () => aoEditar(p) }, '✎ Editar') : null))));
  };

  App.paginas.pastores = {
    titulo: 'Pastores',
    async render(el, _p, recarregar) {
      const pastores = await App.db.list('pastores', { order: 'ordem' });
      const pode = App.posso('pastores');
      el.appendChild(App.cabecalho('Conheça os pastores', 'Quem cuida da nossa igreja.',
        pode ? h('button.btn', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'pastores', titulo: 'Adicionar pastor', campos: CAMPOS, depois: recarregar }) }, '+ Adicionar') : null));
      if (!pastores.length) return el.appendChild(App.vazio('Nenhum pastor cadastrado ainda.'));
      el.appendChild(App.cartoesPastores(pastores, pode
        ? (p) => App.editarRegistro({ tabela: 'pastores', titulo: 'Editar pastor', campos: CAMPOS, registro: p, depois: recarregar, nomeItem: p.nome })
        : null));
    },
  };
})();
