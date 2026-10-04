// Ministérios: lista, detalhe com participantes e a escala semanal montada pelo líder.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  async function campos() {
    const membros = await App.db.list('membros', { order: 'nome' });
    return [
      { nome: 'nome', rotulo: 'Nome do ministério', obrigatorio: true, exemplo: 'Ex.: Louvor' },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', linhas: 2 },
      { nome: 'lider_id', rotulo: 'Líder', tipo: 'select', vazio: '— sem líder —',
        opcoes: membros.filter((m) => m.status !== 'inativo').map((m) => ({ valor: m.id, texto: m.nome })) },
      { nome: 'cor', rotulo: 'Cor', tipo: 'color', padrao: '#7c3aed', ajuda: 'Usada para identificar o ministério nas escalas.' },
    ];
  }

  async function editar(registro, depois) {
    App.editarRegistro({
      tabela: 'ministerios', titulo: registro ? 'Editar ministério' : 'Novo ministério', campos: await campos(),
      registro, depois, nomeItem: registro ? `o ministério ${registro.nome} (e as escalas dele)` : '',
    });
  }

  async function lista(el, recarregar) {
    const [ministerios, membros, mm] = await Promise.all([
      App.db.list('ministerios', { order: 'nome' }),
      App.db.list('membros'),
      App.db.list('ministerio_membros'),
    ]);
    const pm = util.porId(membros);
    el.appendChild(App.cabecalho('Ministérios', 'Cada ministério tem um líder que monta a escala da semana.',
      h('button.btn', { type: 'button', onclick: () => editar(null, recarregar) }, '+ Novo ministério')));
    if (!ministerios.length) return el.appendChild(App.vazio('Nenhum ministério cadastrado.'));
    el.appendChild(h('div.grade-cards', ministerios.map((m) => {
      const qtd = mm.filter((x) => x.ministerio_id === m.id).length;
      const lider = pm[m.lider_id];
      return h('a.min-card', { href: '#/ministerios/' + m.id, style: { borderTopColor: m.cor || '#7c3aed' } },
        h('h2', m.nome),
        m.descricao ? h('p.muted', m.descricao) : null,
        h('p', '👤 Líder: ', h('strong', lider ? lider.nome : 'não definido')),
        h('p.muted', `${qtd} participante${qtd === 1 ? '' : 's'}`));
    })));
  }

  async function detalhe(el, id, recarregar) {
    const [m, membros, mm] = await Promise.all([
      App.db.get('ministerios', id),
      App.db.list('membros', { order: 'nome' }),
      App.db.list('ministerio_membros', { eq: { ministerio_id: id } }),
    ]);
    if (!m) { el.appendChild(App.vazio('Ministério não encontrado.', h('a.btn', { href: '#/ministerios' }, 'Voltar'))); return; }
    const pm = util.porId(membros);
    const lider = pm[m.lider_id];

    el.appendChild(h('a.voltar.nao-imprimir', { href: '#/ministerios' }, '‹ Ministérios'));
    el.appendChild(App.cabecalho(m.nome, lider ? `Líder: ${lider.nome}` : 'Sem líder definido',
      h('button.btn.secundario.nao-imprimir', { type: 'button', onclick: () => editar(m, () => {
        // se apagou, volta para a lista
        App.db.get('ministerios', id).then((ainda) => { if (ainda) recarregar(); else location.hash = '#/ministerios'; });
      }) }, '✎ Editar')));

    // Participantes
    const ids = new Set(mm.map((x) => x.membro_id));
    const participantes = membros.filter((x) => ids.has(x.id));
    const adicionar = () => {
      const disponiveis = membros.filter((x) => !ids.has(x.id) && x.status !== 'inativo');
      if (!disponiveis.length) return App.toast('Todos os membros ativos já participam.', 'aviso');
      let md;
      md = App.modal('Adicionar participante', App.formulario([
        { nome: 'membro_id', rotulo: 'Pessoa', tipo: 'select', obrigatorio: true, opcoes: disponiveis.map((x) => ({ valor: x.id, texto: x.nome })) },
      ], {}, {
        textoSalvar: 'Adicionar',
        aoSalvar: async ({ membro_id }) => {
          await App.db.insert('ministerio_membros', { ministerio_id: id, membro_id });
          md.fechar(); App.toast('Participante adicionado.'); recarregar();
        },
      }));
    };
    const remover = async (p) => {
      if (!(await App.confirmar(`Tirar ${p.nome} do ministério ${m.nome}?`, 'Sim, tirar'))) return;
      const vinculo = mm.find((x) => x.membro_id === p.id);
      await App.db.remove('ministerio_membros', vinculo.id);
      App.toast('Participante removido.'); recarregar();
    };

    el.appendChild(h('section.card.nao-imprimir',
      h('div.card-topo', h('h2', `Participantes (${participantes.length})`),
        h('button.btn.secundario.pequeno', { type: 'button', onclick: adicionar }, '+ Adicionar')),
      participantes.length
        ? h('div.chips', participantes.map((p) => h('span.chip.grande',
          App.avatar(p.nome, m.cor), p.nome, p.id === m.lider_id ? h('span.selo', 'Líder') : null,
          h('button.chip-x', { type: 'button', 'aria-label': `Tirar ${p.nome}`, onclick: () => remover(p) }, '✕'))))
        : h('p.muted', 'Ninguém participa ainda. Adicione as pessoas para facilitar a montagem da escala.')));

    const secEscala = h('section.card', h('h2', '📅 Escala da semana'));
    el.appendChild(secEscala);
    await App.escalaSemana(secEscala, { ministerioId: id, aoMudar: recarregar });
  }

  App.paginas.ministerios = {
    titulo: 'Ministérios',
    async render(el, params, recarregar) {
      if (params[0]) return detalhe(el, params[0], recarregar);
      return lista(el, recarregar);
    },
  };
})();
