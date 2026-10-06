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
      const agora = new Date().toISOString();
      const novo = { id: novoId(), created_at: agora, ...obj, atualizado_por: 'Você (demonstração)', atualizado_em: agora };
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
      if (item) Object.assign(item, obj, { atualizado_por: 'Você (demonstração)', atualizado_em: new Date().toISOString() });
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
    // Fotos da Mídia: no modo local a imagem fica guardada no próprio navegador
    async enviarFoto(blob) {
      const url = await new Promise((ok, erro) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = () => erro(new Error('Não deu para ler a foto.'));
        r.readAsDataURL(blob);
      });
      return { caminho: 'local/' + novoId(), url };
    },
    async apagarFoto() {},
    // sem login no modo local
    async usuario() { return { email: 'demonstração' }; },
    async perfil() { return { email: 'demonstração', papel: 'admin', membro_id: null, lidera: [], areas: [] }; },
    async entrar() { return true; },
    async sair() {},
  };

  // ---------- Modo Supabase ----------
  function criarSupabase() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const SEM_PERMISSAO = 'Você não tem permissão para fazer isso. Fale com a secretaria ou com o líder do ministério.';
    // Traduz os erros do banco para mensagens que o usuário entende
    function traduzir(error) {
      const msg = error.message || '';
      if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) return SEM_PERMISSAO;
      if (error.code === 'PGRST116') return SEM_PERMISSAO; // editar uma linha que a regra esconde
      if (error.code === '23505') return 'Este registro já existe.';
      if (error.code === '23514' || error.code === '23502') return 'Confira os campos: algum valor obrigatório está vazio ou inválido.';
      if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com a internet. Tente de novo em instantes.';
      return msg;
    }
    const ok = ({ data, error }) => { if (error) { console.error(error); throw new Error(traduzir(error)); } return data; };
    let perfilCache = null;
    sb.auth.onAuthStateChange(() => { perfilCache = null; });
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
      async remove(tabela, id) {
        // quando a regra não deixa apagar, o banco não dá erro: só não apaga nada
        const apagados = ok(await sb.from(tabela).delete().eq('id', id).select('id'));
        if (!apagados.length) throw new Error(SEM_PERMISSAO);
      },
      async resetar() {},
      // Fotos da Mídia ficam no Storage (bucket "midia"); a tabela guarda o endereço
      async enviarFoto(blob, pasta) {
        const caminho = `${pasta}/${novoId()}.jpg`;
        const { error } = await sb.storage.from('midia').upload(caminho, blob, { contentType: blob.type || 'image/jpeg' });
        if (error) { console.error(error); throw new Error(/row-level|policy|unauthorized/i.test(error.message) ? SEM_PERMISSAO : error.message); }
        return { caminho, url: sb.storage.from('midia').getPublicUrl(caminho).data.publicUrl };
      },
      async apagarFoto(caminho) {
        const { error } = await sb.storage.from('midia').remove([caminho]);
        if (error) console.error(error); // a linha da tabela já foi apagada; o arquivo sobra, sem problema
      },
      // Quem está logado e o que pode fazer:
      // { papel, membro_id, lidera: [ids], areas: ['louvor', ...] (que lidera), participa: ['cantina', ...],
      //   escala: [ids] (ministérios cuja escala pode montar sem ser líder: o Louvor, para quem participa dele) }
      async perfil() {
        if (perfilCache) return perfilCache;
        const user = (await sb.auth.getUser()).data.user;
        if (!user) return null;
        const p = ok(await sb.from('perfis').select('papel, membro_id, nome').eq('id', user.id).maybeSingle())
          || { papel: 'visitante', membro_id: null };
        // "pendente" é o nome antigo de quem tem login mas não é membro
        if (p.papel === 'pendente') p.papel = 'visitante';
        const lideradas = p.membro_id
          ? ok(await sb.from('ministerios').select('id, nome').eq('lider_id', p.membro_id))
          : [];
        const vinculos = p.membro_id
          ? ok(await sb.from('ministerio_membros').select('ministerio_id').eq('membro_id', p.membro_id))
          : [];
        const participadas = vinculos.length
          ? ok(await sb.from('ministerios').select('id, nome').in('id', vinculos.map((v) => v.ministerio_id)))
          : [];
        perfilCache = {
          email: user.email,
          nome: p.nome || (user.user_metadata || {}).nome || '',
          papel: p.papel,
          membro_id: p.membro_id,
          lidera: lideradas.map((m) => m.id),
          areas: lideradas.map((m) => m.nome.toLowerCase()),
          participa: participadas.map((m) => m.nome.toLowerCase()),
          escala: participadas.filter((m) => m.nome.toLowerCase() === 'louvor').map((m) => m.id),
        };
        return perfilCache;
      },
      async usuario() { const { data } = await sb.auth.getUser(); return data.user; },
      async entrar(email, senha) {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error('E-mail ou senha incorretos.');
        return true;
      },
      async sair() { await sb.auth.signOut(); },
      // Cadastro de visitante. Devolve true se já entrou, false se precisa confirmar o e-mail.
      async cadastrar(nome, email, senha) {
        // o link do e-mail de confirmação (se estiver ligado no Supabase) volta para este mesmo site
        const voltar = /^https?:/.test(location.protocol) ? location.origin + location.pathname : undefined;
        const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: voltar } });
        if (error) {
          console.error(error);
          if (/signups? not allowed|disabled/i.test(error.message)) throw new Error('O cadastro de visitantes ainda não foi liberado. Fale com a secretaria.');
          if (/already registered|already exists/i.test(error.message)) throw new Error('Este e-mail já tem cadastro. Use "Entrar".');
          if (/password/i.test(error.message)) throw new Error('A senha precisa ter pelo menos 6 letras ou números.');
          if (/rate limit/i.test(error.message)) throw new Error('Muitos cadastros em pouco tempo. Tente de novo daqui a pouco.');
          throw new Error(error.message);
        }
        // com "confirmar e-mail" ligado no Supabase, não vem sessão: a pessoa precisa abrir o e-mail
        return !!data.session;
      },
    };
  }

  App.db = usarSupabase ? criarSupabase() : local;
})();

// Diz se o perfil logado pode alterar algo — espelha as regras do banco (supabase/schema.sql),
// só para esconder botões. Quem garante a segurança de verdade é o banco.
// Exemplos: App.pode(perfil, 'escalas', { ministerio_id }), App.pode(perfil, 'musicas')
(function () {
  const App = (window.App = window.App || {});
  const AREA = {
    musicas: 'louvor', ensaios: 'louvor', ensaio_musicas: 'louvor',
    cantina_itens: 'cantina', cantina_vendas: 'cantina',
  };
  App.pode = function (perfil, tabela, registro = {}) {
    if (!perfil || perfil.papel === 'pendente' || perfil.papel === 'visitante') return false;
    if (perfil.papel === 'admin') return true;
    if (tabela === 'ministerio_membros') return perfil.lidera.includes(registro.ministerio_id);
    // quem participa do Louvor também monta a escala do Louvor
    if (tabela === 'escalas') return [...perfil.lidera, ...(perfil.escala || [])].includes(registro.ministerio_id);
    // quem participa do Louvor (não só o líder) cadastra músicas e marca ensaios
    if (AREA[tabela] === 'louvor' && (perfil.participa || []).includes('louvor')) return true;
    // quem participa da Cantina (não só o líder) lança vendas no caixa
    if (tabela === 'cantina_vendas' && (perfil.participa || []).includes('cantina')) return true;
    // quem participa da Mídia (não só o líder) envia e apaga as fotos do culto
    if (tabela === 'midia_fotos') return [...perfil.areas, ...(perfil.participa || [])].some((a) => App.util.normalizar(a) === 'midia');
    if (AREA[tabela]) return perfil.areas.includes(AREA[tabela]);
    return false; // membros, ministérios, eventos, conteúdos e pastores: só admin
  };
  // Visitante (criou a conta sozinho, ainda não é membro): não vê escalas, membros, louvor nem o caixa
  App.ehVisitante = (perfil) => !!perfil && (perfil.papel === 'visitante' || perfil.papel === 'pendente');
})();
