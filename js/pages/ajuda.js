// Ajuda: passo a passo de cada tarefa, mostrando primeiro o que a pessoa logada pode fazer.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  // Quem pode cada tarefa (mesmas regras de App.pode, que esconde os botões nas telas)
  const TODOS = () => true;
  const ADMIN = (p) => p.papel === 'admin';
  const LIDER = (p) => p.papel === 'admin' || (p.lidera || []).length > 0;
  const tabela = (t) => () => App.posso(t);

  // [id, pergunta, rótulo de quem pode, quem pode, link da tela, passos]. **texto** vira negrito.
  const TAREFAS = [
    ['entrar', 'Entrar, sair e usar no celular', 'Todos', TODOS, null, [
      'Na página de boas-vindas, toque em **Entrar** e use o e-mail e a senha que a secretaria cadastrou.',
      'No celular, o menu fica embaixo (Início, Escalas, Louvor, Cantina). Toque em **Menu** para ver todas as telas.',
      'Para sair, abra o menu e toque em **Sair**, no fim da lista.',
    ]],
    ['ver-escala', 'Ver quando eu sirvo', 'Todos', TODOS, 'escalas', [
      'Abra **Escalas**. Aparece a semana atual, dia por dia, com o nome de quem serve e a função.',
      'Use as abas no topo para ver só um ministério.',
      'Toque em **Próxima ›** para ver a semana seguinte, e em **Voltar para hoje** para voltar.',
      'A tela **Início** também mostra as escalas desta semana.',
    ]],
    ['ver-musica', 'Ver a letra, o tom e o próximo ensaio', 'Todos', TODOS, 'louvor', [
      'Abra **Louvor**. Na aba **Ensaios** aparecem os próximos ensaios com as músicas na ordem.',
      'Toque no nome de uma música para ver a letra, o tom e o link do YouTube ou da cifra.',
      'Na aba **Músicas** fica o repertório inteiro. Use a busca para achar pelo nome ou artista.',
    ]],
    ['ver-eventos', 'Ver os próximos eventos', 'Todos', TODOS, 'inicio', [
      'Na tela **Início**, os eventos aparecem em bolinhas no topo, igual aos stories do Instagram.',
      'Toque em uma bolinha para abrir. Toque nos lados da tela para passar para o próximo.',
    ]],
    ['vender', 'Lançar uma venda na cantina', 'Cantina', tabela('cantina_vendas'), 'cantina', [
      'Abra **Cantina**. No quadro **Caixa**, toque no item **a cada venda**.',
      'O total do dia vai somando sozinho, embaixo dos botões.',
      'Errou? Toque no **−** ao lado do item no resumo para desfazer uma venda.',
    ]],
    ['escalar', 'Escalar alguém', 'Líderes', LIDER, 'escalas', [
      'Abra **Escalas** (ou entre no seu ministério, em **Ministérios**).',
      'Toque em **+ Escalar pessoa**, ou no **+** ao lado do dia.',
      'Escolha o dia, a pessoa e, se quiser, a função (ex.: Vocal, Porta principal, Caixa). Toque em **Salvar**.',
      'Para mudar ou tirar alguém, toque no nome da pessoa no dia.',
      'Líder só escala no próprio ministério.',
    ]],
    ['copiar-semana', 'Repetir a escala da semana passada', 'Líderes', LIDER, 'ministerios', [
      'Entre no seu ministério em **Ministérios**, ou abra **Escalas** se você for admin.',
      'Vá para a semana que quer preencher e toque em **⧉ Copiar semana anterior**.',
      'Confira os nomes e ajuste quem não puder servir.',
    ]],
    ['participantes', 'Colocar ou tirar alguém do ministério', 'Líderes', LIDER, 'ministerios', [
      'Abra **Ministérios** e toque no seu ministério.',
      'Em **Participantes**, toque em **+ Adicionar** e escolha a pessoa.',
      'Para tirar alguém, toque no **✕** ao lado do nome.',
    ]],
    ['musica', 'Cadastrar uma música', 'Louvor', tabela('musicas'), 'louvor', [
      'Abra **Louvor** e vá na aba **Músicas**.',
      'Toque em **+ Nova música** e preencha o nome. Tom, link e letra são opcionais.',
      'Para mudar depois, toque na música e em **✎ Editar**.',
    ]],
    ['ensaio', 'Marcar um ensaio e escolher as músicas', 'Louvor', tabela('ensaios'), 'louvor', [
      'Abra **Louvor**, na aba **Ensaios**, e toque em **+ Marcar ensaio**.',
      'Preencha o dia, o horário e o local e toque em **Salvar**.',
      'No ensaio, toque em **+ Música** para escolher as músicas do repertório.',
      'Use **↑** e **↓** para mudar a ordem e **✕** para tirar uma música.',
    ]],
    ['cardapio', 'Mudar o cardápio e os preços', 'Cantina', tabela('cantina_itens'), 'cantina', [
      'Abra **Cantina**. No quadro **Cardápio**, toque em **+ Item** para criar um novo.',
      'Toque em um item para mudar o preço.',
      'Acabou? Desmarque **Disponível para venda**. O item some do caixa até você marcar de novo.',
    ]],
    ['membro', 'Cadastrar um membro', 'Admin', ADMIN, 'membros', [
      'Abra **Membros** e toque em **+ Novo membro**.',
      'Só o nome é obrigatório. Coloque o **e-mail** se a pessoa for ter login.',
      'Para mudar depois, toque no nome da pessoa na lista.',
    ]],
    ['lider', 'Escolher o líder de um ministério', 'Admin', ADMIN, 'ministerios', [
      'Abra **Ministérios** e toque no ministério.',
      'Toque em **✎ Editar**, escolha a pessoa no campo **Líder** e toque em **Salvar**.',
      'O líder só consegue editar se tiver login com o mesmo e-mail do cadastro de membro.',
      'Não mude o nome dos ministérios **Louvor** e **Cantina**: o sistema usa esses nomes.',
    ]],
    ['evento', 'Criar um evento (story)', 'Admin', ADMIN, 'eventos', [
      'Abra **Eventos** e toque em **+ Novo evento**.',
      'Preencha título e dia. Para ter imagem, cole o link de uma foto, de preferência em pé.',
      'Os próximos eventos aparecem sozinhos como stories na tela **Início** e na página de boas-vindas.',
    ]],
    ['texto', 'Escrever um texto na área Aprender', 'Admin', ADMIN, 'aprender', [
      'Abra **Aprender** e toque em **+ Novo texto**.',
      'Escolha a seção, escreva o título e o texto. Deixe uma linha em branco entre os parágrafos.',
    ]],
    ['login', 'Dar acesso ao site para alguém', 'Admin', ADMIN, null, [
      'Cadastre a pessoa em **Membros** com o e-mail dela.',
      'No painel do Supabase, vá em **Authentication › Users › Add user › Create new user**.',
      'Use **o mesmo e-mail**, crie uma senha, marque **Auto Confirm User** e toque em **Create user**.',
      'Passe o e-mail e a senha para a pessoa. Ela já entra como membro.',
    ]],
    ['admin', 'Tornar alguém admin', 'Admin', ADMIN, null, [
      'A pessoa precisa já ter login (veja "Dar acesso ao site para alguém").',
      'No Supabase, abra o **SQL Editor**, cole a linha abaixo trocando o e-mail e toque em **Run**:',
      "update perfis set papel = 'admin' where email = 'pessoa@email.com';",
      'Peça para a pessoa sair e entrar de novo no site.',
    ]],
  ];

  const DUVIDAS = [
    ['Não aparece o botão para mudar alguma coisa.',
      'Cada pessoa só vê os botões do que pode alterar. Se precisar mudar algo, fale com o líder do ministério ou com a secretaria.'],
    ['Entrei, mas não aparece nada.',
      'Seu login ainda não está ligado ao seu cadastro. Peça para a secretaria conferir se o e-mail do cadastro é igual ao do login.'],
    ['Esqueci minha senha.',
      'Fale com a secretaria: ela cria uma senha nova para você.'],
  ];

  // "**negrito**" vira <strong>
  function texto(t) {
    return t.split(/\*\*(.+?)\*\*/).map((parte, i) => (i % 2 ? h('strong', parte) : parte));
  }

  async function resumoPapel(p) {
    if (!p) return null;
    let titulo, desc;
    if (p.papel === 'admin') {
      titulo = 'Você é admin';
      desc = 'Pode cadastrar e alterar tudo no site.';
    } else if ((p.lidera || []).length) {
      const ministerios = await App.db.list('ministerios', { order: 'nome' });
      const nomes = ministerios.filter((m) => p.lidera.includes(m.id)).map((m) => m.nome);
      titulo = 'Você é líder de ' + nomes.join(', ');
      desc = 'Pode montar a escala e cuidar dos participantes do seu ministério. Nas outras telas, você consulta.';
    } else {
      titulo = 'Você é membro';
      desc = 'Pode consultar escalas, músicas, eventos e a cantina. Quem altera são os líderes e a secretaria.';
    }
    return h('section.card.ajuda-papel', h('h2', titulo), h('p', desc));
  }

  function cartao(t, aberto) {
    const [id, pergunta, quem, , rota, passos] = t;
    return h('details.artigo', { id: 'ajuda-' + id, open: aberto },
      h('summary', h('span', pergunta), h('span.ajuda-quem', quem)),
      h('div.artigo-corpo',
        h('ol.ajuda-passos', passos.map((p) => h('li', p.startsWith('update ') ? h('code.ajuda-codigo', p) : texto(p)))),
        rota ? h('a.btn.secundario.pequeno', { href: '#/' + rota }, 'Abrir ' + App.paginas[rota].titulo) : null));
  }

  App.paginas.ajuda = {
    titulo: 'Ajuda',
    async render(el) {
      const p = App.perfil || { papel: 'membro', lidera: [] };
      const minhas = TAREFAS.filter((t) => t[3](p));

      el.appendChild(App.cabecalho('Ajuda', 'Escolha o que você quer fazer e siga o passo a passo.'));
      const papel = await resumoPapel(App.perfil);
      if (papel) el.appendChild(papel);

      const lista = h('div.artigos');
      let termo = '';
      const desenhar = () => {
        lista.innerHTML = '';
        const achadas = minhas.filter((t) => !termo || util.normalizar(t[1] + ' ' + t[5].join(' ')).includes(termo));
        if (!achadas.length) return lista.appendChild(App.vazio('Nada encontrado. Tente outra palavra, como "escala" ou "música".'));
        achadas.forEach((t) => lista.appendChild(cartao(t, !!termo && achadas.length === 1)));
      };
      el.appendChild(h('div.barra-filtros', App.busca('Buscar: escala, música, venda…', (t) => { termo = t; desenhar(); })));
      el.appendChild(lista);
      desenhar();

      el.appendChild(h('h2.secao-titulo', 'Dúvidas comuns'));
      el.appendChild(h('div.artigos', DUVIDAS.map(([pergunta, resposta]) =>
        h('details.artigo', h('summary', pergunta), h('div.artigo-corpo', h('p', resposta))))));
      el.appendChild(h('p.muted.ajuda-rodape', 'Ainda com dúvida? Fale com a secretaria da igreja.'));
    },
  };
})();
