// Cantina: responsáveis (escala do ministério Cantina), cardápio com preços e caixa do dia.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};
  App.estado = App.estado || {};

  const CAMPOS_ITEM = [
    { nome: 'nome', rotulo: 'Item', obrigatorio: true, exemplo: 'Ex.: Coxinha' },
    { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'number', passo: '0.01', min: 0, obrigatorio: true },
    { nome: 'disponivel', rotulo: 'Disponível para venda', tipo: 'checkbox', padrao: true },
  ];

  App.paginas.cantina = {
    titulo: 'Cantina',
    async render(el, _p, recarregar) {
      const dia = App.estado.diaCantina || util.hoje();
      const [itens, vendas, ministerios, membros] = await Promise.all([
        App.db.list('cantina_itens', { order: 'nome' }),
        App.db.list('cantina_vendas', { eq: { data: dia }, order: 'created_at' }),
        App.db.list('ministerios'),
        App.db.list('membros'),
      ]);
      const pm = util.porId(membros);
      const minCantina = ministerios.find((m) => util.normalizar(m.nome).includes('cantina'));

      el.appendChild(App.cabecalho('Cantina', 'Responsáveis, cardápio e caixa.'));
      const grade = h('div.grade-2');

      // ----- Caixa do dia -----
      const total = vendas.reduce((s, v) => s + v.quantidade * Number(v.valor_unitario), 0);
      const qtdTotal = vendas.reduce((s, v) => s + v.quantidade, 0);
      const vender = async (item) => {
        await App.db.insert('cantina_vendas', { data: dia, item_id: item.id, item_nome: item.nome, quantidade: 1, valor_unitario: Number(item.preco) });
        App.toast(`+1 ${item.nome}`);
        recarregar();
      };
      const inputDia = h('input', { type: 'date', 'aria-label': 'Dia do caixa' });
      inputDia.value = dia;
      inputDia.addEventListener('change', () => { App.estado.diaCantina = inputDia.value || util.hoje(); recarregar(); });

      const disponiveis = itens.filter((i) => i.disponivel !== false);
      // agrupa vendas iguais para o resumo
      const resumo = {};
      for (const v of vendas) {
        const k = v.item_nome + '|' + v.valor_unitario;
        (resumo[k] = resumo[k] || { nome: v.item_nome, valor: Number(v.valor_unitario), qtd: 0, ids: [] });
        resumo[k].qtd += v.quantidade;
        resumo[k].ids.push(v.id);
      }
      const desfazer = async (r) => {
        await App.db.remove('cantina_vendas', r.ids[r.ids.length - 1]);
        App.toast(`−1 ${r.nome}`);
        recarregar();
      };

      grade.appendChild(h('section.card.caixa',
        h('div.card-topo', h('h2', '💰 Caixa'), inputDia),
        h('p.muted', 'Toque no item a cada venda.'),
        disponiveis.length
          ? h('div.botoes-venda', disponiveis.map((i) => h('button.venda', { type: 'button', onclick: () => vender(i) },
            h('strong', i.nome), h('span', util.dinheiro(i.preco)))))
          : h('p.muted', 'Cadastre itens no cardápio para vender.'),
        h('div.total', h('span', `Total do dia (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`), h('strong', util.dinheiro(total))),
        Object.values(resumo).length ? h('ul.resumo-vendas', Object.values(resumo).map((r) => h('li',
          h('span', `${r.qtd}× ${r.nome}`),
          h('span.muted', util.dinheiro(r.qtd * r.valor)),
          h('button.btn-icone', { type: 'button', 'aria-label': `Desfazer uma venda de ${r.nome}`, onclick: () => desfazer(r) }, '−')))) : null));

      // ----- Coluna lateral: responsáveis + cardápio -----
      const lateral = h('div.coluna');
      if (minCantina) {
        const hoje = util.hoje();
        const proximas = await App.db.list('escalas', { eq: { ministerio_id: minCantina.id }, gte: { data: hoje }, order: 'data' });
        const proxDia = proximas[0] && proximas[0].data;
        const doDia = proximas.filter((e) => e.data === proxDia);
        lateral.appendChild(h('section.card',
          h('div.card-topo', h('h2', '🙋 Responsáveis'), h('a.link', { href: '#/ministerios/' + minCantina.id }, 'Escala')),
          minCantina.lider_id && pm[minCantina.lider_id] ? h('p', 'Líder: ', h('strong', pm[minCantina.lider_id].nome)) : null,
          proxDia
            ? [h('p.muted', 'Próximo dia: ' + util.dataLonga(proxDia)),
              h('ul.lista-simples', doDia.map((e) => h('li', App.avatar((pm[e.membro_id] || {}).nome, minCantina.cor),
                h('span', (pm[e.membro_id] || {}).nome || 'A definir'), e.funcao ? h('span.muted', ' · ' + e.funcao) : null)))]
            : h('p.muted', 'Ninguém escalado nos próximos dias.')));
      } else {
        lateral.appendChild(h('section.card', h('h2', '🙋 Responsáveis'),
          h('p.muted', 'Crie um ministério chamado "Cantina" para montar a escala dos responsáveis.'),
          h('a.btn.secundario.pequeno', { href: '#/ministerios' }, 'Ir para Ministérios')));
      }

      lateral.appendChild(h('section.card',
        h('div.card-topo', h('h2', '📋 Cardápio'),
          h('button.btn.secundario.pequeno', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'cantina_itens', titulo: 'Novo item', campos: CAMPOS_ITEM, depois: recarregar }) }, '+ Item')),
        itens.length ? h('ul.cardapio', itens.map((i) => h('li',
          h('button.cardapio-item' + (i.disponivel === false ? '.indisponivel' : ''), { type: 'button',
            onclick: () => App.editarRegistro({ tabela: 'cantina_itens', titulo: 'Editar item', campos: CAMPOS_ITEM, registro: i, depois: recarregar, nomeItem: i.nome }) },
          h('span', i.nome, i.disponivel === false ? h('span.muted', ' (em falta)') : null),
          h('strong', util.dinheiro(i.preco)))))) : h('p.muted', 'Nenhum item cadastrado.')));

      grade.appendChild(lateral);
      el.appendChild(grade);
    },
  };
})();
