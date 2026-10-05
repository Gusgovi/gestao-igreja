// Mídia: fotos tiradas nos cultos e quem serve na Mídia e no Som.
// As fotos ficam no Supabase Storage (bucket "midia"); no modo demonstração, no navegador.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  // Diminui a foto antes de enviar (foto de celular tem 3 a 8 MB; assim fica com uns 300 KB)
  async function comprimir(arquivo, maximo = 1600) {
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, erro) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => erro(new Error(`"${arquivo.name}" não parece ser uma foto.`));
        i.src = url;
      });
      const escala = Math.min(1, maximo / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * escala);
      canvas.height = Math.round(img.naturalHeight * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Domingo mais recente (o dia do "último culto" sugerido ao enviar)
  function ultimoDomingo() {
    return util.inicioSemana(util.hoje());
  }

  function enviarFotos(depois) {
    const campoData = h('input#f-data', { type: 'date', required: true });
    campoData.value = ultimoDomingo();
    const campoLegenda = h('input#f-legenda', { type: 'text', placeholder: 'Ex.: Culto de Celebração' });
    const campoArquivos = h('input#f-fotos', { type: 'file', accept: 'image/*', multiple: true, required: true });
    const erro = h('p.erro-form', { role: 'alert' });
    const progresso = h('p.muted', { 'aria-live': 'polite' });
    const botao = h('button.btn', { type: 'submit' }, 'Enviar');
    let m;
    const form = h('form.form', { novalidate: true },
      h('div.campo', h('label', { for: 'f-data' }, 'Dia do culto', h('span.obrig', { 'aria-hidden': 'true' }, ' *')), campoData),
      h('div.campo', h('label', { for: 'f-legenda' }, 'Legenda (opcional)'), campoLegenda),
      h('div.campo', h('label', { for: 'f-fotos' }, 'Fotos', h('span.obrig', { 'aria-hidden': 'true' }, ' *')), campoArquivos,
        h('small.ajuda', 'Pode escolher várias de uma vez. As fotos são diminuídas antes de enviar.')),
      progresso, erro,
      h('div.acoes', botao));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const arquivos = [...campoArquivos.files];
      if (!campoData.value) { erro.textContent = 'Escolha o dia do culto.'; return campoData.focus(); }
      if (!arquivos.length) { erro.textContent = 'Escolha pelo menos uma foto.'; return campoArquivos.focus(); }
      erro.textContent = '';
      botao.disabled = true;
      let enviadas = 0;
      try {
        for (const arq of arquivos) {
          progresso.textContent = `Enviando ${enviadas + 1} de ${arquivos.length}…`;
          const blob = await comprimir(arq);
          const { caminho, url } = await App.db.enviarFoto(blob, campoData.value);
          await App.db.insert('midia_fotos', { data: campoData.value, caminho, url, legenda: campoLegenda.value.trim() || null });
          enviadas++;
        }
        m.fechar();
        App.toast(enviadas === 1 ? 'Foto enviada.' : `${enviadas} fotos enviadas.`);
        depois();
      } catch (err) {
        console.error(err);
        progresso.textContent = '';
        erro.textContent = (enviadas ? `${enviadas} foto(s) enviada(s), mas parou: ` : 'Não foi possível enviar: ') + err.message;
        if (enviadas) depois();
      } finally {
        botao.disabled = false;
      }
    });
    m = App.modal('Enviar fotos do culto', form);
  }

  // Foto em tamanho grande, com setas para passar
  function verFoto(fotos, inicio, podeApagar, depois) {
    let i = inicio;
    const img = h('img.foto-grande', { alt: '' });
    const legenda = h('p.foto-legenda');
    const contador = h('span.muted');
    const anterior = h('button.btn.secundario', { type: 'button', onclick: () => ir(i - 1) }, '‹ Anterior');
    const proxima = h('button.btn.secundario', { type: 'button', onclick: () => ir(i + 1) }, 'Próxima ›');
    const abrir = h('a.btn.secundario', { target: '_blank', rel: 'noopener' }, 'Abrir original');
    const apagar = podeApagar ? h('button.btn.perigo.esquerda', { type: 'button', onclick: async () => {
      if (!(await App.confirmar('Apagar esta foto? Isso não pode ser desfeito.'))) return;
      const f = fotos[i];
      await App.db.remove('midia_fotos', f.id);
      await App.db.apagarFoto(f.caminho);
      m.fechar();
      App.toast('Foto apagada.');
      depois();
    } }, 'Apagar') : null;
    function ir(n) {
      i = Math.max(0, Math.min(fotos.length - 1, n));
      const f = fotos[i];
      img.src = f.url;
      img.alt = f.legenda || 'Foto do culto de ' + util.dataLonga(f.data);
      legenda.textContent = [util.dataLonga(f.data), f.legenda].filter(Boolean).join(' · ');
      contador.textContent = `${i + 1} de ${fotos.length}`;
      abrir.href = f.url;
      anterior.disabled = i === 0;
      proxima.disabled = i === fotos.length - 1;
    }
    const m = App.modal('Foto', [
      h('div.foto-palco', img),
      legenda,
      h('div.foto-nav', anterior, contador, proxima),
      h('div.acoes', apagar, abrir),
    ], { largo: true });
    ir(inicio);
  }

  function galeria(fotos, podeApagar, depois) {
    return h('div.galeria', fotos.map((f, i) => h('button.galeria-foto', {
      type: 'button', onclick: () => verFoto(fotos, i, podeApagar, depois),
      'aria-label': 'Ver foto' + (f.legenda ? ': ' + f.legenda : ''),
    }, h('img', { src: f.url, alt: '', loading: 'lazy' }))));
  }

  // Quem serve na Mídia e no Som: líder e quem está escalado no próximo culto
  async function quemServe(el) {
    const [ministerios, membros] = await Promise.all([App.db.list('ministerios', { order: 'nome' }), App.db.list('membros')]);
    const pm = util.porId(membros);
    const alvos = ministerios.filter((m) => ['midia', 'som'].includes(util.normalizar(m.nome)));
    if (!alvos.length) return;
    const hoje = util.hoje();
    const cards = await Promise.all(alvos.map(async (mi) => {
      // próximo culto com escala; se ainda não montaram, mostra o último que teve
      const todas = await App.db.list('escalas', { eq: { ministerio_id: mi.id }, order: 'data' });
      const futuras = todas.filter((e) => e.data >= hoje);
      const dia = futuras.length ? futuras[0].data : (todas[todas.length - 1] || {}).data;
      const doDia = todas.filter((e) => e.data === dia);
      const lider = pm[mi.lider_id];
      return h('section.card', { style: { borderTop: `4px solid ${mi.cor || '#7c3aed'}` } },
        h('div.card-topo', h('h2', mi.nome), h('a.link', { href: '#/ministerios/' + mi.id }, 'Escala')),
        mi.descricao ? h('p.muted', mi.descricao) : null,
        lider ? h('p', 'Líder: ', h('strong', lider.nome)) : null,
        dia
          ? [h('p.muted', (dia >= hoje ? 'Próximo culto: ' : 'Último culto: ') + util.dataLonga(dia)),
            h('ul.lista-simples', doDia.map((e) => h('li', App.avatar((pm[e.membro_id] || {}).nome, mi.cor),
              h('span', (pm[e.membro_id] || {}).nome || 'A definir'), e.funcao ? h('span.muted', ' · ' + e.funcao) : null)))]
          : h('p.muted', 'Ninguém escalado ainda.'));
    }));
    el.appendChild(h('h2.secao-titulo', 'Quem serve em quê'));
    el.appendChild(h('div.grade-2', cards));
  }

  App.paginas.midia = {
    titulo: 'Mídia',
    async render(el, _p, recarregar) {
      const fotos = await App.db.list('midia_fotos', { order: 'created_at' });
      const podeFotos = App.posso('midia_fotos');
      el.appendChild(App.cabecalho('Mídia', 'Fotos dos cultos e quem cuida da mídia e do som.',
        podeFotos ? h('button.btn', { type: 'button', onclick: () => enviarFotos(recarregar) }, '+ Enviar fotos') : null));

      // agrupa por dia do culto, do mais novo para o mais antigo
      const porDia = {};
      for (const f of fotos) (porDia[f.data] = porDia[f.data] || []).push(f);
      const dias = Object.keys(porDia).sort().reverse();
      if (!dias.length) {
        el.appendChild(App.vazio(podeFotos ? 'Nenhuma foto ainda. Toque em "+ Enviar fotos" depois do culto.' : 'Nenhuma foto ainda. Depois do culto, as fotos aparecem aqui.'));
      } else {
        const [ultimo, ...anteriores] = dias;
        el.appendChild(h('section.card',
          h('h2', '📸 Último culto ', h('span.muted', '· ' + util.dataLonga(ultimo))),
          galeria(porDia[ultimo], podeFotos, recarregar)));
        if (anteriores.length) {
          el.appendChild(h('details.passados', h('summary', `Cultos anteriores (${anteriores.length})`),
            anteriores.map((d) => h('section.card', h('h3', util.dataLonga(d)), galeria(porDia[d], podeFotos, recarregar)))));
        }
      }

      // escala é só para membros
      if (!App.ehVisitante(App.perfil)) await quemServe(el);
    },
  };
})();
