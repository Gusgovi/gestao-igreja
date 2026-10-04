// Cadastro e consulta de membros.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  const STATUS = [['ativo', 'Ativo'], ['visitante', 'Visitante'], ['inativo', 'Inativo']];

  const CAMPOS = [
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel', exemplo: '(11) 90000-0000' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' },
    { nome: 'data_batismo', rotulo: 'Data de batismo', tipo: 'date' },
    { nome: 'endereco', rotulo: 'Endereço' },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, padrao: 'ativo',
      opcoes: STATUS.map(([valor, texto]) => ({ valor, texto })) },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 3 },
  ];

  let filtroStatus = 'todos';

  App.paginas.membros = {
    titulo: 'Membros',
    async render(el, _p, recarregar) {
      const [membros, mm, ministerios] = await Promise.all([
        App.db.list('membros', { order: 'nome' }),
        App.db.list('ministerio_membros'),
        App.db.list('ministerios'),
      ]);
      const pmin = util.porId(ministerios);
      const ministeriosDe = (id) => mm.filter((x) => x.membro_id === id).map((x) => pmin[x.ministerio_id]).filter(Boolean);

      const novo = () => App.editarRegistro({ tabela: 'membros', titulo: 'Novo membro', campos: CAMPOS, depois: recarregar });
      const editar = (m) => App.editarRegistro({
        tabela: 'membros', titulo: 'Editar membro', campos: CAMPOS, registro: m, depois: recarregar, nomeItem: m.nome,
      });

      const ativos = membros.filter((m) => m.status === 'ativo').length;
      el.appendChild(App.cabecalho('Membros', `${membros.length} cadastrados · ${ativos} ativos`,
        h('button.btn', { type: 'button', onclick: novo }, '+ Novo membro')));

      // Aniversariantes do mês
      const mes = new Date().getMonth() + 1;
      const aniver = membros.filter((m) => m.data_nascimento && Number(m.data_nascimento.slice(5, 7)) === mes)
        .sort((a, b) => a.data_nascimento.slice(8).localeCompare(b.data_nascimento.slice(8)));
      if (aniver.length) {
        el.appendChild(h('section.card.aniver',
          h('h2', '🎂 Aniversariantes do mês'),
          h('div.chips', aniver.map((m) => h('span.chip', `${m.nome.split(' ')[0]} · dia ${Number(m.data_nascimento.slice(8))}`)))));
      }

      let termo = '';
      const lista = h('div.lista-cards');
      const desenhar = () => {
        lista.innerHTML = '';
        const filtrados = membros.filter((m) =>
          (filtroStatus === 'todos' || m.status === filtroStatus) &&
          (!termo || util.normalizar(m.nome + ' ' + (m.telefone || '') + ' ' + (m.email || '')).includes(termo)));
        if (!filtrados.length) {
          lista.appendChild(App.vazio(membros.length ? 'Ninguém encontrado com essa busca.' : 'Nenhum membro cadastrado ainda.'));
          return;
        }
        for (const m of filtrados) {
          const mins = ministeriosDe(m.id);
          lista.appendChild(h('button.item-card', { type: 'button', onclick: () => editar(m), 'aria-label': 'Editar ' + m.nome },
            App.avatar(m.nome),
            h('div.item-info',
              h('strong', m.nome),
              h('span.muted', m.telefone || m.email || 'Sem contato'),
              mins.length ? h('div.chips.mini', mins.map((mi) => h('span.etiqueta', { style: { background: mi.cor } }, mi.nome))) : null),
            h('span.status.' + m.status, (STATUS.find((s) => s[0] === m.status) || [, m.status])[1])));
        }
      };

      el.appendChild(h('div.barra-filtros',
        App.busca('Buscar por nome, telefone ou e-mail', (t) => { termo = t; desenhar(); }),
        App.abas([['todos', 'Todos'], ...STATUS], filtroStatus, (v) => { filtroStatus = v; recarregar(); })));
      el.appendChild(lista);
      desenhar();
    },
  };
})();
