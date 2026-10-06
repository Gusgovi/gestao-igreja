// Ministério de louvor: repertório de músicas e ensaios com a lista de músicas de cada um.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  const CAMPOS_MUSICA = [
    { nome: 'titulo', rotulo: 'Nome da música', obrigatorio: true },
    { nome: 'artista', rotulo: 'Artista / ministério' },
    { nome: 'tom', rotulo: 'Tom', exemplo: 'Ex.: G, Am, C#' },
    { nome: 'bpm', rotulo: 'Andamento (BPM)', tipo: 'number', min: 0 },
    { nome: 'link', rotulo: 'Link (YouTube, cifra…)', tipo: 'url', exemplo: 'https://' },
    { nome: 'letra', rotulo: 'Letra / cifra', tipo: 'textarea', linhas: 8 },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2 },
  ];
  // Dias de culto da igreja (quarta e domingo): as músicas de cada ensaio são para um deles
  const DIAS_CULTO = [3, 0];
  const SEMANAS_FIXO = 4; // quantas semanas do ensaio fixo aparecem para a frente

  // próximo dia de culto (quarta ou domingo, ou o dia pedido) a partir de um dia, contando o próprio dia
  function proximoCulto(iso, diaSemana) {
    for (let i = 0; i < 14; i++) {
      const d = util.somarDias(iso, i);
      const dia = util.parse(d).getDay();
      if (diaSemana != null ? dia === diaSemana : DIAS_CULTO.includes(dia)) return d;
    }
    return null;
  }

  function opcoesCulto(apartirDe, atual) {
    const dias = [];
    for (let i = -3; i < 35 && dias.length < 8; i++) {
      const d = util.somarDias(apartirDe, i);
      if (DIAS_CULTO.includes(util.parse(d).getDay())) dias.push(d);
    }
    if (atual && !dias.includes(atual)) dias.unshift(atual);
    return dias.map((d) => ({ valor: d, texto: 'Culto de ' + util.dataLonga(d).toLowerCase() }));
  }

  function camposEnsaio(e) {
    const base = (e && e.data) || util.hoje();
    return [
      { nome: 'data', rotulo: 'Dia do ensaio', tipo: 'date', obrigatorio: true },
      { nome: 'hora', rotulo: 'Horário', tipo: 'time' },
      { nome: 'local', rotulo: 'Local', padrao: 'Templo' },
      { nome: 'culto_data', rotulo: 'As músicas são para qual culto?', tipo: 'select', vazio: '— não definido —',
        opcoes: opcoesCulto(base, e && e.culto_data), ajuda: 'Ex.: ensaio na quinta para o culto de domingo.' },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2 },
    ];
  }

  const NOMES_DIAS = util.DIAS.map((d, i) => ({ valor: String(i), texto: d === 'Sábado' || d === 'Domingo' ? d : d + '-feira' }));
  const CAMPOS_FIXO = [
    { nome: 'dia_semana', rotulo: 'Dia da semana', tipo: 'select', vazio: false, padrao: '4', opcoes: NOMES_DIAS },
    { nome: 'hora', rotulo: 'Horário', tipo: 'time', padrao: '19:00' },
    { nome: 'local', rotulo: 'Local', padrao: 'Templo' },
    { nome: 'culto_dia_semana', rotulo: 'As músicas são para o culto de', tipo: 'select', vazio: '— cada semana eu escolho —',
      opcoes: DIAS_CULTO.map((d) => ({ valor: String(d), texto: util.DIAS[d] })) },
  ];

  // Ensaios marcados + os próximos do ensaio fixo (que ainda não viraram linha no banco).
  // Os do ensaio fixo vêm com virtual: true até alguém mexer neles.
  function juntarEnsaios(ensaios, fixos, hoje) {
    const lista = ensaios.slice();
    for (const f of fixos) {
      let d = proximoCulto(hoje, Number(f.dia_semana));
      for (let s = 0; s < SEMANAS_FIXO; s++, d = util.somarDias(d, 7)) {
        if (ensaios.some((e) => e.fixo_id === f.id && e.data === d)) continue;
        lista.push({
          id: `fixo-${f.id}-${d}`, virtual: true, fixo_id: f.id, data: d, hora: f.hora, local: f.local,
          culto_data: f.culto_dia_semana != null ? proximoCulto(d, Number(f.culto_dia_semana)) : null,
        });
      }
    }
    return lista.sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  }

  // Próximos ensaios (já com os do ensaio fixo). Usado também na tela Início.
  App.proximosEnsaios = async function () {
    const hoje = util.hoje();
    const [ensaios, fixos] = await Promise.all([
      App.db.list('ensaios', { gte: { data: hoje }, order: 'data' }),
      App.db.list('ensaios_fixos'),
    ]);
    return juntarEnsaios(ensaios, fixos, hoje).filter((e) => !e.cancelado);
  };

  // Ensaio do fixo que ainda não existe no banco: cria a linha antes de mexer
  async function garantir(e) {
    if (!e.virtual) return e;
    const { virtual, id, ...dados } = e;
    return App.db.insert('ensaios', dados);
  }

  let aba = 'ensaios';

  function verMusica(mu, recarregar) {
    let m;
    m = App.modal(mu.titulo, [
      h('p.muted', [mu.artista, mu.tom ? 'Tom: ' + mu.tom : null, mu.bpm ? mu.bpm + ' BPM' : null].filter(Boolean).join(' · ')),
      mu.link ? h('p', h('a.link', { href: mu.link, target: '_blank', rel: 'noopener' }, '▶ Abrir link')) : null,
      mu.letra ? h('pre.letra', mu.letra) : h('p.muted', 'Sem letra cadastrada.'),
      mu.observacoes ? h('p.obs', mu.observacoes) : null,
      App.posso('musicas') ? h('div.acoes', h('button.btn.secundario', { type: 'button', onclick: () => {
        m.fechar();
        App.editarRegistro({ tabela: 'musicas', titulo: 'Editar música', campos: CAMPOS_MUSICA, registro: mu, depois: recarregar, nomeItem: `"${mu.titulo}"` });
      } }, '✎ Editar')) : null,
    ], { largo: true });
  }

  async function abaMusicas(el, recarregar) {
    const musicas = await App.db.list('musicas', { order: 'titulo' });
    let termo = '';
    const lista = h('div.lista-cards');
    const desenhar = () => {
      lista.innerHTML = '';
      const f = musicas.filter((m) => !termo || util.normalizar(m.titulo + ' ' + (m.artista || '')).includes(termo));
      if (!f.length) return lista.appendChild(App.vazio(musicas.length ? 'Nenhuma música encontrada.' : 'Nenhuma música no repertório ainda.'));
      for (const mu of f) {
        lista.appendChild(h('button.item-card', { type: 'button', onclick: () => verMusica(mu, recarregar) },
          h('span.avatar.musica', { 'aria-hidden': 'true' }, '♪'),
          h('div.item-info', h('strong', mu.titulo), h('span.muted', mu.artista || '')),
          mu.tom ? h('span.tom', { title: 'Tom' }, mu.tom) : null));
      }
    };
    el.appendChild(h('div.barra-filtros',
      App.busca('Buscar música ou artista', (t) => { termo = t; desenhar(); }),
      App.posso('musicas') ? h('button.btn', { type: 'button', onclick: () => App.editarRegistro({ tabela: 'musicas', titulo: 'Nova música', campos: CAMPOS_MUSICA, depois: recarregar }) }, '+ Nova música') : null));
    el.appendChild(lista);
    desenhar();
  }

  function textoFixo(f) {
    const dia = NOMES_DIAS[f.dia_semana].texto.toLowerCase();
    // domingo e sábado: "todo"; os outros dias: "toda"
    const todo = [0, 6].includes(Number(f.dia_semana)) ? 'Todo' : 'Toda';
    return [`${todo} ${dia}${f.hora ? ' às ' + f.hora : ''}`, f.local,
      f.culto_dia_semana != null ? 'músicas para o culto de ' + util.DIAS[f.culto_dia_semana].toLowerCase() : null].filter(Boolean).join(' · ');
  }

  function editarFixo(f, recarregar) {
    App.editarRegistro({
      tabela: 'ensaios_fixos', titulo: f ? 'Editar ensaio fixo' : 'Ensaio fixo', campos: CAMPOS_FIXO,
      registro: f ? { ...f, dia_semana: String(f.dia_semana), culto_dia_semana: f.culto_dia_semana == null ? '' : String(f.culto_dia_semana) } : null,
      nomeItem: 'este ensaio fixo (os ensaios que já têm músicas continuam)',
      depois: recarregar,
    });
  }

  // Editar um ensaio. No ensaio que veio do fixo, "Apagar" vira "Cancelar este dia"
  // (se apagasse, ele voltaria a aparecer na semana).
  function editarEnsaio(e, recarregar) {
    let m;
    const novo = !e.id;
    const form = App.formulario(camposEnsaio(e), e, {
      aoSalvar: async (dados) => {
        if (novo) await App.db.insert('ensaios', dados);
        else await App.db.update('ensaios', (await garantir(e)).id, dados);
        m.fechar(); App.toast('Ensaio salvo.'); recarregar();
      },
      aoApagar: novo ? null : async () => {
        if (e.fixo_id) {
          if (!(await App.confirmar(`Cancelar o ensaio de ${util.dataLonga(e.data).toLowerCase()}? O ensaio fixo das outras semanas continua.`, 'Sim, cancelar'))) return;
          await App.db.update('ensaios', (await garantir(e)).id, { cancelado: true });
          m.fechar(); App.toast('Ensaio cancelado.'); recarregar();
          return;
        }
        if (!(await App.confirmar('Tem certeza que quer apagar este ensaio? Isso não pode ser desfeito.'))) return;
        await App.db.remove('ensaios', e.id);
        m.fechar(); App.toast('Apagado.'); recarregar();
      },
    });
    if (e.fixo_id) {
      const apagar = form.querySelector('.btn.perigo');
      if (apagar) apagar.textContent = 'Cancelar este dia';
    }
    m = App.modal(novo ? 'Marcar ensaio avulso' : 'Editar ensaio', [e.virtual ? null : App.carimbo(e), form]);
  }

  async function abaEnsaios(el, recarregar) {
    const [ensaios, fixos, musicas, em] = await Promise.all([
      App.db.list('ensaios', { order: 'data' }),
      App.db.list('ensaios_fixos', { order: 'dia_semana' }),
      App.db.list('musicas', { order: 'titulo' }),
      App.db.list('ensaio_musicas', { order: 'ordem' }),
    ]);
    const pmu = util.porId(musicas);
    const hoje = util.hoje();
    const podeEnsaios = App.posso('ensaios');
    const podeSetlist = App.posso('ensaio_musicas');
    const todos = juntarEnsaios(ensaios, fixos, hoje);
    // cancelado só aparece para quem pode desfazer
    const proximos = todos.filter((e) => e.data >= hoje && (!e.cancelado || podeEnsaios));
    const passados = ensaios.filter((e) => e.data < hoje && !e.cancelado).reverse();

    // Ensaio fixo (toda semana)
    el.appendChild(h('section.card.ensaio-fixo',
      h('div.card-topo', h('h2', '🔁 Ensaio fixo'),
        podeEnsaios ? h('button.btn.secundario.pequeno', { type: 'button', onclick: () => editarFixo(null, recarregar) }, fixos.length ? '+ Outro' : '+ Definir') : null),
      fixos.length
        ? h('ul.lista-simples', fixos.map((f) => h('li',
          h('span', textoFixo(f)),
          podeEnsaios ? h('button.link', { type: 'button', onclick: () => editarFixo(f, recarregar) }, 'Editar') : null)))
        : h('p.muted', podeEnsaios
          ? 'Nenhum ensaio fixo. Toque em "+ Definir" para ensaiar toda semana no mesmo dia e horário.'
          : 'Nenhum ensaio fixo definido.')));

    if (podeEnsaios) {
      el.appendChild(h('div.barra-acoes',
        h('button.btn', { type: 'button', onclick: () => editarEnsaio({}, recarregar) }, '+ Marcar ensaio avulso')));
    }

    const cartao = (e) => {
      const lista = e.virtual ? [] : em.filter((x) => x.ensaio_id === e.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      const mover = async (i, d) => {
        const a = lista[i], b = lista[i + d];
        if (!b) return;
        await App.db.update('ensaio_musicas', a.id, { ordem: i + d });
        await App.db.update('ensaio_musicas', b.id, { ordem: i });
        recarregar();
      };
      const addMusica = () => {
        const ja = new Set(lista.map((x) => x.musica_id));
        const disp = musicas.filter((m) => !ja.has(m.id));
        if (!disp.length) return App.toast(musicas.length ? 'Todas as músicas do repertório já estão neste ensaio.' : 'Cadastre músicas na aba Músicas primeiro.', 'aviso');
        let md;
        md = App.modal('Adicionar música ao ensaio', App.formulario([
          { nome: 'musica_id', rotulo: 'Música', tipo: 'select', obrigatorio: true, opcoes: disp.map((m) => ({ valor: m.id, texto: m.titulo + (m.tom ? ` (${m.tom})` : '') })) },
        ], {}, {
          textoSalvar: 'Adicionar',
          aoSalvar: async ({ musica_id }) => {
            const real = await garantir(e);
            // normaliza a ordem para 0..n antes de colocar a nova no fim
            for (let i = 0; i < lista.length; i++) if (lista[i].ordem !== i) await App.db.update('ensaio_musicas', lista[i].id, { ordem: i });
            await App.db.insert('ensaio_musicas', { ensaio_id: real.id, musica_id, ordem: lista.length });
            md.fechar(); recarregar();
          },
        }));
      };
      const titulo = util.dataLonga(e.data) + (e.hora ? ' · ' + e.hora : '');
      if (e.cancelado) {
        return h('section.card.ensaio.passado',
          h('div.card-topo',
            h('div', h('h2', titulo), h('p.muted', 'Ensaio cancelado neste dia.')),
            h('button.btn.secundario.pequeno', { type: 'button', onclick: async () => {
              await App.db.update('ensaios', e.id, { cancelado: false }); App.toast('Ensaio de volta.'); recarregar();
            } }, 'Desfazer')));
      }
      return h('section.card.ensaio' + (e.data < hoje ? '.passado' : ''),
        h('div.card-topo',
          h('div',
            h('h2', titulo, e.fixo_id ? h('span.selo', 'Fixo') : null),
            e.culto_data ? h('p.culto-alvo', '🎤 Músicas para o culto de ' + util.dataLonga(e.culto_data).toLowerCase()) : null,
            e.local ? h('p.muted', '📍 ' + e.local) : null,
            App.carimbo(e.virtual ? [] : [e, ...lista])),
          podeEnsaios ? h('button.btn.secundario.pequeno', { type: 'button', onclick: () => editarEnsaio(e, recarregar) }, '✎ Editar') : null),
        e.observacoes ? h('p.obs', e.observacoes) : null,
        lista.length ? h('ol.setlist', lista.map((x, i) => {
          const mu = pmu[x.musica_id] || { titulo: '(música apagada)' };
          return h('li',
            h('button.link.setlist-nome', { type: 'button', onclick: () => pmu[x.musica_id] && verMusica(mu, recarregar) }, mu.titulo),
            mu.tom ? h('span.tom', mu.tom) : null,
            !podeSetlist ? null : h('span.setlist-acoes',
              h('button.btn-icone', { type: 'button', 'aria-label': 'Subir', disabled: i === 0, onclick: () => mover(i, -1) }, '↑'),
              h('button.btn-icone', { type: 'button', 'aria-label': 'Descer', disabled: i === lista.length - 1, onclick: () => mover(i, 1) }, '↓'),
              h('button.btn-icone', { type: 'button', 'aria-label': 'Tirar do ensaio', onclick: async () => {
                await App.db.remove('ensaio_musicas', x.id); recarregar();
              } }, '✕')));
        })) : h('p.muted', 'Nenhuma música escolhida ainda.'),
        podeSetlist ? h('button.btn.secundario.pequeno', { type: 'button', onclick: addMusica }, '+ Música') : null);
    };

    el.appendChild(h('h2.secao-titulo', 'Próximos ensaios'));
    el.appendChild(proximos.length ? h('div.coluna', proximos.map(cartao)) : App.vazio('Nenhum ensaio marcado.'));
    if (passados.length) {
      el.appendChild(h('details.passados', h('summary', `Ensaios anteriores (${passados.length})`), h('div.coluna', passados.map(cartao))));
    }
  }

  App.paginas.louvor = {
    titulo: 'Louvor',
    async render(el, _p, recarregar) {
      el.appendChild(App.cabecalho('Louvor', 'Repertório e ensaios do ministério de louvor.'));
      el.appendChild(App.abas([['ensaios', 'Ensaios'], ['musicas', 'Músicas']], aba, (v) => { aba = v; recarregar(); }));
      if (aba === 'musicas') await abaMusicas(el, recarregar);
      else await abaEnsaios(el, recarregar);
    },
  };
})();
