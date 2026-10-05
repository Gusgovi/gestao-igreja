// Escalas semanais. O mesmo componente aparece na página "Escalas" (todos os ministérios)
// e dentro de cada ministério (só daquele ministério).
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};
  App.estado = App.estado || {};

  function semanaAtual() {
    if (!App.estado.semana) App.estado.semana = util.inicioSemana(util.hoje());
    return App.estado.semana;
  }

  // Formulário para escalar alguém
  async function escalar({ ministerioFixo, data, registro, depois }) {
    const [ministerios, membros, mm] = await Promise.all([
      App.db.list('ministerios', { order: 'nome' }),
      App.db.list('membros', { order: 'nome' }),
      App.db.list('ministerio_membros'),
    ]);
    const ativos = membros.filter((m) => m.status !== 'inativo');
    const opcoesMembros = (minId) => {
      const ids = new Set(mm.filter((x) => x.ministerio_id === minId).map((x) => x.membro_id));
      const doMin = ativos.filter((m) => ids.has(m.id));
      return (doMin.length ? doMin : ativos).map((m) => ({ valor: m.id, texto: m.nome }));
    };
    const minInicial = registro ? registro.ministerio_id : ministerioFixo;
    const campos = [
      ministerioFixo ? null : {
        nome: 'ministerio_id', rotulo: 'Ministério', tipo: 'select', obrigatorio: true,
        // só os ministérios que a pessoa pode escalar (admin: todos; líder: os que lidera)
        opcoes: ministerios.filter((m) => App.posso('escalas', { ministerio_id: m.id })).map((m) => ({ valor: m.id, texto: m.nome })),
      },
      { nome: 'data', rotulo: 'Dia', tipo: 'date', obrigatorio: true },
      { nome: 'membro_id', rotulo: 'Pessoa', tipo: 'select', obrigatorio: true, opcoes: opcoesMembros(minInicial),
        ajuda: 'Aparecem primeiro as pessoas que participam do ministério.' },
      { nome: 'funcao', rotulo: 'Função', exemplo: 'Ex.: Vocal, Porta principal, Caixa' },
      { nome: 'observacao', rotulo: 'Observação' },
    ].filter(Boolean);

    let m;
    const form = App.formulario(campos, registro || { ministerio_id: ministerioFixo, data }, {
      aoSalvar: async (dados) => {
        if (ministerioFixo) dados.ministerio_id = ministerioFixo;
        if (registro) await App.db.update('escalas', registro.id, dados);
        else await App.db.insert('escalas', dados);
        m.fechar();
        App.toast(registro ? 'Escala atualizada.' : 'Pessoa escalada.');
        depois();
      },
      aoApagar: registro ? async () => {
        if (!(await App.confirmar('Tirar esta pessoa da escala?', 'Sim, tirar'))) return;
        await App.db.remove('escalas', registro.id);
        m.fechar();
        App.toast('Removido da escala.');
        depois();
      } : null,
    });
    // ao trocar o ministério, atualiza a lista de pessoas
    const selMin = form.elements.ministerio_id;
    if (selMin) {
      selMin.addEventListener('change', () => {
        const sel = form.elements.membro_id;
        const atual = sel.value;
        sel.innerHTML = '';
        sel.appendChild(h('option', { value: '' }, '— escolha —'));
        for (const o of opcoesMembros(selMin.value)) sel.appendChild(h('option', { value: o.valor, selected: o.valor === atual }, o.texto));
      });
    }
    m = App.modal(registro ? 'Editar escala' : 'Escalar pessoa', form);
  }

  // Monta a visão da semana dentro de "el"
  App.escalaSemana = async function (el, { ministerioId = null, aoMudar }) {
    const inicio = semanaAtual();
    const fim = util.somarDias(inicio, 6);
    const filtro = { gte: { data: inicio }, lte: { data: fim }, order: 'data' };
    if (ministerioId) filtro.eq = { ministerio_id: ministerioId };
    const [escalas, membros, ministerios] = await Promise.all([
      App.db.list('escalas', filtro),
      App.db.list('membros'),
      App.db.list('ministerios'),
    ]);
    const pm = util.porId(membros), pmin = util.porId(ministerios);

    const mudarSemana = (dias) => { App.estado.semana = util.somarDias(inicio, dias); aoMudar(); };

    const copiarAnterior = async () => {
      const ant = { gte: { data: util.somarDias(inicio, -7) }, lte: { data: util.somarDias(inicio, -1) } };
      if (ministerioId) ant.eq = { ministerio_id: ministerioId };
      const anteriores = await App.db.list('escalas', ant);
      if (!anteriores.length) return App.toast('A semana anterior está vazia.', 'aviso');
      if (escalas.length && !(await App.confirmar(
        `Esta semana já tem ${escalas.length} pessoa(s) escalada(s). Copiar a semana anterior vai somar mais ${anteriores.length}. Continuar?`, 'Sim, copiar'))) return;
      await App.db.insertMany('escalas', anteriores.map((e) => ({
        ministerio_id: e.ministerio_id, membro_id: e.membro_id, data: util.somarDias(e.data, 7), funcao: e.funcao, observacao: e.observacao,
      })));
      App.toast(`${anteriores.length} escala(s) copiada(s).`);
      aoMudar();
    };

    const ehEstaSemana = inicio === util.inicioSemana(util.hoje());
    const perfil = App.perfil || {};
    const podeEscalar = ministerioId
      ? App.posso('escalas', { ministerio_id: ministerioId })
      : perfil.papel === 'admin' || (perfil.lidera || []).length > 0 || (perfil.escala || []).length > 0;
    // copiar a semana inteira de todos os ministérios só faz sentido para quem pode alterar todos
    const podeCopiar = ministerioId ? podeEscalar : perfil.papel === 'admin';
    el.appendChild(h('div.semana-nav',
      h('button.btn.secundario', { type: 'button', onclick: () => mudarSemana(-7), 'aria-label': 'Semana anterior' }, '‹ Anterior'),
      h('div.semana-titulo',
        h('strong', `${util.dataCurta(inicio)} a ${util.dataCurta(fim)}`),
        ehEstaSemana ? h('span.selo', 'Esta semana')
          : h('button.link', { type: 'button', onclick: () => { App.estado.semana = null; aoMudar(); } }, 'Voltar para hoje')),
      h('button.btn.secundario', { type: 'button', onclick: () => mudarSemana(7), 'aria-label': 'Próxima semana' }, 'Próxima ›')));

    el.appendChild(h('div.barra-acoes.nao-imprimir',
      podeEscalar ? h('button.btn', { type: 'button', onclick: () => escalar({ ministerioFixo: ministerioId, data: ehEstaSemana ? util.hoje() : inicio, depois: aoMudar }) }, '+ Escalar pessoa') : null,
      podeCopiar ? h('button.btn.secundario', { type: 'button', onclick: copiarAnterior }, '⧉ Copiar semana anterior') : null,
      h('button.btn.secundario', { type: 'button', onclick: () => window.print() }, '🖨 Imprimir')));

    const hoje = util.hoje();
    const dias = h('div.semana');
    for (let i = 0; i < 7; i++) {
      const dia = util.somarDias(inicio, i);
      const doDia = escalas.filter((e) => e.data === dia);
      // dias vazios aparecem compactos, para a lista ficar curta
      dias.appendChild(h('section.dia' + (doDia.length ? '' : '.vazio-dia') + (dia === hoje ? '.hoje' : ''),
        h('div.dia-topo',
          h('h3', util.diaSemana(dia), h('span.muted', ' ' + util.dataCurta(dia)), dia === hoje ? h('span.selo', 'Hoje') : null),
          podeEscalar ? h('button.btn-icone.nao-imprimir', { type: 'button', 'aria-label': `Escalar alguém em ${util.dataLonga(dia)}`,
            onclick: () => escalar({ ministerioFixo: ministerioId, data: dia, depois: aoMudar }) }, '+') : null),
        doDia.length ? h('ul.escala-lista', doDia.map((e) => {
          const mi = pmin[e.ministerio_id] || {};
          const pessoa = pm[e.membro_id];
          const podeEditar = App.posso('escalas', { ministerio_id: e.ministerio_id });
          return h('li', h(podeEditar ? 'button.escala-item' : 'div.escala-item.so-leitura',
            podeEditar ? { type: 'button', onclick: () => escalar({ ministerioFixo: ministerioId, registro: e, depois: aoMudar }) } : null,
            ministerioId ? null : h('span.etiqueta', { style: { background: mi.cor || '#6b7280' } }, mi.nome || '—'),
            h('strong', pessoa ? pessoa.nome : 'A definir'),
            e.funcao ? h('span.muted', e.funcao) : null,
            e.observacao ? h('span.obs', e.observacao) : null));
        })) : null));
    }
    el.appendChild(dias);
  };

  let filtroMin = 'todos';
  App.paginas.escalas = {
    titulo: 'Escalas',
    async render(el, _p, recarregar) {
      const ministerios = await App.db.list('ministerios', { order: 'nome' });
      if (filtroMin !== 'todos' && !ministerios.find((m) => m.id === filtroMin)) filtroMin = 'todos';
      el.appendChild(App.cabecalho('Escalas', 'Quem serve em cada dia da semana.'));
      el.appendChild(h('div.nao-imprimir', App.abas([['todos', 'Todos'], ...ministerios.map((m) => [m.id, m.nome])], filtroMin,
        (v) => { filtroMin = v; recarregar(); })));
      await App.escalaSemana(el, { ministerioId: filtroMin === 'todos' ? null : filtroMin, aoMudar: recarregar });
    },
  };
})();
