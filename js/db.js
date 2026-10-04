// Camada de dados. As telas só conversam com App.db, que funciona de dois jeitos:
// - Supabase (quando js/config.js tem URL e chave)
// - Local (localStorage), para demonstração sem internet
(function () {
  const App = (window.App = window.App || {});
  const cfg = window.APP_CONFIG || {};
  const usarSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);

  function novoId() {
    if (window.crypto && crypto.randomUUID) {
      try { return crypto.randomUUID(); } catch (e) { /* contexto inseguro */ }
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function ordenar(lista, order) {
    if (!order) return lista;
    const [col, dir] = order.split('.');
    const sinal = dir === 'desc' ? -1 : 1;
    return lista.slice().sort((a, b) => {
      const va = a[col] ?? '', vb = b[col] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * sinal;
    });
  }

  function filtrar(lista, opts) {
    let r = lista;
    if (opts.eq) r = r.filter((x) => Object.entries(opts.eq).every(([k, v]) => x[k] === v));
    if (opts.gte) r = r.filter((x) => Object.entries(opts.gte).every(([k, v]) => (x[k] ?? '') >= v));
    if (opts.lte) r = r.filter((x) => Object.entries(opts.lte).every(([k, v]) => (x[k] ?? '') <= v));
    return r;
  }

  // ---------- Modo local ----------
  const CHAVE = 'gestao-igreja-db-v1';
  const local = {
    modo: 'local',
    _ler() {
      try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch (e) { return null; }
    },
    _gravar(dados) { localStorage.setItem(CHAVE, JSON.stringify(dados)); },
    _dados() {
      let d = this._ler();
      if (!d) { d = App.seed ? App.seed() : {}; this._gravar(d); }
      return d;
    },
    async list(tabela, opts = {}) {
      const lista = this._dados()[tabela] || [];
      return ordenar(filtrar(lista, opts), opts.order);
    },
    async get(tabela, id) {
      return (this._dados()[tabela] || []).find((x) => x.id === id) || null;
    },
    async insert(tabela, obj) {
      const d = this._dados();
      const novo = { id: novoId(), created_at: new Date().toISOString(), ...obj };
      (d[tabela] = d[tabela] || []).push(novo);
      this._gravar(d);
      return novo;
    },
    async insertMany(tabela, objs) {
      const r = [];
      for (const o of objs) r.push(await this.insert(tabela, o));
      return r;
    },
    async update(tabela, id, obj) {
      const d = this._dados();
      const item = (d[tabela] || []).find((x) => x.id === id);
      if (item) Object.assign(item, obj);
      this._gravar(d);
      return item;
    },
    async remove(tabela, id) {
      const d = this._dados();
      d[tabela] = (d[tabela] || []).filter((x) => x.id !== id);
      // apaga em cascata o que depende do registro (igual ao banco)
      const cascata = {
        ministerios: [['ministerio_membros', 'ministerio_id'], ['escalas', 'ministerio_id']],
        membros: [['ministerio_membros', 'membro_id']],
        ensaios: [['ensaio_musicas', 'ensaio_id']],
        musicas: [['ensaio_musicas', 'musica_id']],
      }[tabela] || [];
      for (const [t, col] of cascata) d[t] = (d[t] || []).filter((x) => x[col] !== id);
      this._gravar(d);
    },
    async resetar() { localStorage.removeItem(CHAVE); },
    // sem login no modo local
    async usuario() { return { email: 'demonstração' }; },
    async entrar() { return true; },
    async sair() {},
  };

  // ---------- Modo Supabase ----------
  function criarSupabase() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    return {
      modo: 'supabase',
      client: sb,
      async list(tabela, opts = {}) {
        let q = sb.from(tabela).select('*');
        for (const [k, v] of Object.entries(opts.eq || {})) q = q.eq(k, v);
        for (const [k, v] of Object.entries(opts.gte || {})) q = q.gte(k, v);
        for (const [k, v] of Object.entries(opts.lte || {})) q = q.lte(k, v);
        if (opts.order) {
          const [col, dir] = opts.order.split('.');
          q = q.order(col, { ascending: dir !== 'desc' });
        }
        return ok(await q);
      },
      async get(tabela, id) { return ok(await sb.from(tabela).select('*').eq('id', id).maybeSingle()); },
      async insert(tabela, obj) { return ok(await sb.from(tabela).insert(obj).select().single()); },
      async insertMany(tabela, objs) { return objs.length ? ok(await sb.from(tabela).insert(objs).select()) : []; },
      async update(tabela, id, obj) { return ok(await sb.from(tabela).update(obj).eq('id', id).select().single()); },
      async remove(tabela, id) { ok(await sb.from(tabela).delete().eq('id', id)); },
      async resetar() {},
      async usuario() { const { data } = await sb.auth.getUser(); return data.user; },
      async entrar(email, senha) {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error('E-mail ou senha incorretos.');
        return true;
      },
      async sair() { await sb.auth.signOut(); },
    };
  }

  App.db = usarSupabase ? criarSupabase() : local;
})();
