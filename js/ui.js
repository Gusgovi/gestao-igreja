// Utilidades de interface: criação de elementos, formulários, modais, avisos e datas.
(function () {
  const App = (window.App = window.App || {});

  // ---------- Datas ----------
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const util = {
    DIAS,
    // 'AAAA-MM-DD' no fuso local
    iso(d) {
      const z = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
    },
    hoje() { return util.iso(new Date()); },
    parse(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); },
    somarDias(iso, n) { const d = util.parse(iso); d.setDate(d.getDate() + n); return util.iso(d); },
    // domingo da semana da data
    inicioSemana(iso) { const d = util.parse(iso); d.setDate(d.getDate() - d.getDay()); return util.iso(d); },
    dataCurta(iso) { if (!iso) return ''; const d = util.parse(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; },
    dataLonga(iso) {
      if (!iso) return '';
      const d = util.parse(iso);
      return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
    },
    diaSemana(iso) { return DIAS[util.parse(iso).getDay()]; },
    dinheiro(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
    iniciais(nome) {
      return (nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    },
    porId(lista) { return Object.fromEntries(lista.map((x) => [x.id, x])); },
    normalizar(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },
  };

  // ---------- Criação de elementos ----------
  // h('div#id.card', {onclick}, filhos...)
  function h(tag, attrs, ...filhos) {
    const [nomeId, ...classes] = tag.split('.');
    const [nome, id] = nomeId.split('#');
    const el = document.createElement(nome || 'div');
    if (id) el.id = id;
    if (classes.length) el.className = classes.join(' ');
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      filhos.unshift(attrs);
      attrs = null;
    }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (f) => {
      if (f === null || f === undefined || f === false) return;
      if (Array.isArray(f)) return f.forEach(add);
      el.appendChild(f instanceof Node ? f : document.createTextNode(String(f)));
    };
    filhos.forEach(add);
    return el;
  }

  function avatar(nome, cor) {
    return h('span.avatar', { style: cor ? { background: cor } : null, 'aria-hidden': 'true' }, util.iniciais(nome));
  }

  function vazio(texto, acao) {
    return h('div.vazio', h('p', texto), acao || null);
  }

  // ---------- Aviso rápido ----------
  function toast(msg, tipo = 'ok') {
    const area = document.getElementById('toasts');
    const el = h('div.toast.' + tipo, { role: 'status' }, msg);
    area.appendChild(el);
    setTimeout(() => el.classList.add('sumindo'), 2600);
    setTimeout(() => el.remove(), 3100);
  }

  // ---------- Modal ----------
  function modal(titulo, conteudo, { largo = false } = {}) {
    const fundo = h('div.modal-fundo');
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') fechar(); };
    const caixa = h('div.modal' + (largo ? '.largo' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div.modal-topo',
        h('h2', titulo),
        h('button.btn-icone', { type: 'button', 'aria-label': 'Fechar', onclick: fechar }, '✕')),
      h('div.modal-corpo', conteudo));
    fundo.appendChild(caixa);
    // Clicar fora da janela NÃO fecha: assim ninguém perde o que digitou sem querer.
    // Fecha só pelo X, pelos botões da própria janela (Salvar, Apagar, Cancelar) ou pela tecla Esc.
    document.addEventListener('keydown', esc);
    document.body.appendChild(fundo);
    const foco = caixa.querySelector('input, select, textarea, button.btn');
    if (foco) setTimeout(() => foco.focus(), 30);
    return { fechar, caixa };
  }

  function confirmar(msg, textoBotao = 'Sim, apagar') {
    return new Promise((resolve) => {
      let m;
      const fim = (v) => { m.fechar(); resolve(v); };
      m = modal('Confirmar', [
        h('p.confirmar-texto', msg),
        h('div.acoes',
          h('button.btn.secundario', { type: 'button', onclick: () => fim(false) }, 'Cancelar'),
          h('button.btn.perigo', { type: 'button', onclick: () => fim(true) }, textoBotao)),
      ]);
    });
  }

  // ---------- Formulário a partir de uma lista de campos ----------
  // campos: [{nome, rotulo, tipo: text|date|time|number|select|textarea|checkbox|tel|email|url|color, opcoes:[{valor, texto}], obrigatorio, ajuda}]
  function formulario(campos, valores = {}, { aoSalvar, textoSalvar = 'Salvar', aoApagar } = {}) {
    const form = h('form.form', { novalidate: true });
    for (const c of campos) {
      const id = 'f-' + c.nome;
      const v = valores[c.nome];
      let input;
      if (c.tipo === 'select') {
        input = h('select', { id, name: c.nome },
          c.vazio !== false ? h('option', { value: '' }, c.vazio || '— escolha —') : null,
          (c.opcoes || []).map((o) => h('option', { value: o.valor, selected: String(o.valor) === String(v ?? '') }, o.texto)));
      } else if (c.tipo === 'textarea') {
        input = h('textarea', { id, name: c.nome, rows: c.linhas || 4 });
        input.value = v ?? '';
      } else if (c.tipo === 'checkbox') {
        input = h('input', { id, name: c.nome, type: 'checkbox', checked: v === undefined ? !!c.padrao : !!v });
      } else {
        input = h('input', { id, name: c.nome, type: c.tipo || 'text', step: c.passo, min: c.min, placeholder: c.exemplo });
        input.value = v ?? c.padrao ?? '';
      }
      if (c.obrigatorio) input.required = true;
      const rotulo = h('label', { for: id }, c.rotulo, c.obrigatorio ? h('span.obrig', { 'aria-hidden': 'true' }, ' *') : null);
      form.appendChild(c.tipo === 'checkbox'
        ? h('div.campo.campo-check', input, rotulo)
        : h('div.campo', rotulo, input, c.ajuda ? h('small.ajuda', c.ajuda) : null));
    }
    const erro = h('p.erro-form', { role: 'alert' });
    form.appendChild(erro);
    form.appendChild(h('div.acoes',
      aoApagar ? h('button.btn.perigo.esquerda', { type: 'button', onclick: aoApagar }, 'Apagar') : null,
      h('button.btn', { type: 'submit' }, textoSalvar)));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = {};
      for (const c of campos) {
        const el = form.elements[c.nome];
        let val = c.tipo === 'checkbox' ? el.checked : el.value.trim();
        if (c.tipo === 'number' && val !== '') val = Number(val);
        if (val === '') val = null;
        if (c.obrigatorio && (val === null || val === undefined)) {
          erro.textContent = `Preencha o campo "${c.rotulo}".`;
          el.focus();
          return;
        }
        dados[c.nome] = val;
      }
      erro.textContent = '';
      const botao = form.querySelector('button[type=submit]');
      botao.disabled = true;
      try { await aoSalvar(dados); }
      catch (err) { erro.textContent = 'Não foi possível salvar: ' + err.message; }
      finally { botao.disabled = false; }
    });
    return form;
  }

  // Abre um formulário de cadastro/edição padrão para uma tabela
  function editarRegistro({ tabela, titulo, campos, registro, depois, nomeItem = 'este item' }) {
    let m;
    const form = formulario(campos, registro || {}, {
      aoSalvar: async (dados) => {
        const salvo = registro ? await App.db.update(tabela, registro.id, dados) : await App.db.insert(tabela, dados);
        m.fechar();
        toast(registro ? 'Alterações salvas.' : 'Cadastrado com sucesso.');
        depois && depois(salvo);
      },
      aoApagar: registro ? async () => {
        if (!(await confirmar(`Tem certeza que quer apagar ${nomeItem}? Isso não pode ser desfeito.`))) return;
        await App.db.remove(tabela, registro.id);
        m.fechar();
        toast('Apagado.');
        depois && depois();
      } : null,
    });
    m = modal(titulo, form);
  }

  function cabecalho(titulo, subtitulo, ...acoes) {
    return h('header.pagina-topo',
      h('div', h('h1', titulo), subtitulo ? h('p.subtitulo', subtitulo) : null),
      acoes.length ? h('div.pagina-acoes', acoes) : null);
  }

  function busca(placeholder, aoDigitar) {
    const input = h('input.busca', { type: 'search', placeholder, 'aria-label': placeholder });
    input.addEventListener('input', () => aoDigitar(util.normalizar(input.value)));
    return input;
  }

  function abas(itens, ativo, aoTrocar) {
    return h('div.abas', { role: 'tablist' },
      itens.map(([valor, texto]) => h('button.aba' + (valor === ativo ? '.ativa' : ''), {
        type: 'button', role: 'tab', 'aria-selected': valor === ativo ? 'true' : 'false',
        onclick: () => aoTrocar(valor),
      }, texto)));
  }

  Object.assign(App, { util, h, avatar, vazio, toast, modal, confirmar, formulario, editarRegistro, cabecalho, busca, abas });
})();
