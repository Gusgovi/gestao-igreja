// Ajuda: passo a passo de cada tarefa, mostrando primeiro o que a pessoa logada pode fazer.
(function () {
  const App = window.App;
  const { h, util } = App;
  App.paginas = App.paginas || {};

  // Quem pode cada tarefa (mesmas regras de App.pode, que esconde os botões nas telas)
  const TODOS = () => true;
  const MEMBRO = (p) => !App.ehVisitante(p);
  const VISITANTE_OU_ADMIN = (p) => App.ehVisitante(p) || p.papel === 'admin';
  const ADMIN = (p) => p.papel === 'admin';
  const LIDER = (p) => p.papel === 'admin' || (p.lidera || []).length > 0;
  // quem participa do Louvor também monta a escala do Louvor
  const ESCALA = (p) => LIDER(p) || (p.escala || []).length > 0;
  const tabela = (t) => () => App.posso(t);

  // [id, pergunta, rótulo de quem pode, quem pode, link da tela, passos]. **texto** vira negrito.
  const TAREFAS = [
    ['entrar', 'Entrar, sair e usar no celular', 'Todos', TODOS, null, [
      'Na página de boas-vindas, toque em **Entrar** e use o e-mail e a senha que a secretaria cadastrou.',
      'No celular, o menu fica embaixo (Início, Escalas, Louvor, Cantina). Toque em **Menu** para ver todas as telas.',
      'Para sair, abra o menu e toque em **Sair**, no fim da lista.',
    ]],
    ['visitante', 'Criar conta de visitante', 'Visitantes', VISITANTE_OU_ADMIN, null, [
      'Na página de boas-vindas, toque em **Entrar** e depois em **Sou visitante, quero me cadastrar**.',
      'Escreva seu nome, seu e-mail e crie uma senha. Toque em **Criar minha conta**.',
      'O visitante vê os eventos, o cardápio da cantina, as fotos dos cultos, a área Aprender e os pastores. As escalas ficam só para os membros.',
    ]],
    ['ver-escala', 'Ver quando eu sirvo', 'Membros', MEMBRO, 'escalas', [
      'Abra **Escalas**. Aparece a semana atual, dia por dia, com o nome de quem serve e a função.',
      'Use as abas no topo para ver só um ministério.',
      'Toque em **Próxima ›** para ver a semana seguinte, e em **Voltar para hoje** para voltar.',
      'A tela **Início** também mostra as escalas desta semana.',
    ]],
    ['ver-musica', 'Ver a letra, o tom e o próximo ensaio', 'Membros', MEMBRO, 'louvor', [
      'Abra **Louvor**. Na aba **Ensaios** aparecem os próximos ensaios com as músicas na ordem.',
      'Toque no nome de uma música para ver a letra, o tom e o link do YouTube ou da cifra.',
      'Na aba **Músicas** fica o repertório inteiro. Use a busca para achar pelo nome ou artista.',
    ]],
    ['ver-eventos', 'Ver os próximos eventos', 'Todos', TODOS, 'inicio', [
      'Na tela **Início**, os eventos aparecem em bolinhas no topo, igual aos stories do Instagram.',
      'Toque em uma bolinha para abrir. Toque nos lados da tela para passar para o próximo.',
    ]],
    ['ver-fotos', 'Ver as fotos do último culto', 'Todos', TODOS, 'midia', [
      'Abra **Mídia** no menu. As fotos do último culto aparecem primeiro.',
      'Toque em uma foto para ver grande. Use **Próxima ›** para passar.',
      'As fotos dos cultos anteriores ficam em **Cultos anteriores**, mais embaixo.',
    ]],
    ['fotos', 'Enviar as fotos do culto', 'Mídia', tabela('midia_fotos'), 'midia', [
      'Abra **Mídia** e toque em **+ Enviar fotos**.',
      'Confira o **dia do culto** (já vem o último domingo) e, se quiser, escreva uma legenda.',
      'Toque em **Fotos**, escolha uma ou várias fotos e toque em **Enviar**. Espere terminar.',
      'Para apagar uma foto, toque nela e depois em **Apagar**.',
    ]],
    ['vender', 'Lançar uma venda na cantina', 'Cantina', tabela('cantina_vendas'), 'cantina', [
      'Abra **Cantina**. No quadro **Caixa**, toque no item **a cada venda**.',
      'O total do dia vai somando sozinho, embaixo dos botões.',
      'Errou? Toque no **−** ao lado do item no resumo para desfazer uma venda.',
    ]],
    ['escalar', 'Escalar alguém', 'Líderes e Louvor', ESCALA, 'escalas', [
      'Abra **Escalas** (ou entre no seu ministério, em **Ministérios**).',
      'Toque em **+ Escalar pessoa**, ou no **+** ao lado do dia.',
      'Escolha o dia, a pessoa e, se quiser, a função (ex.: Vocal, Porta principal, Caixa). Toque em **Salvar**.',
      'Para mudar ou tirar alguém, toque no nome da pessoa no dia.',
      'Líder só escala no próprio ministério. Quem participa do **Louvor** também escala no Louvor.',
    ]],
    ['copiar-semana', 'Repetir a escala da semana passada', 'Líderes e Louvor', ESCALA, 'ministerios', [
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
      'Ensaio toda semana no mesmo dia? Em **Louvor**, na aba **Ensaios**, toque em **+ Definir** no quadro **Ensaio fixo**. Escolha o dia, o horário e para qual culto são as músicas (quarta ou domingo).',
      'Os ensaios fixos das próximas semanas aparecem sozinhos. Ensaio fora do normal? Toque em **+ Marcar ensaio avulso**.',
      'Não vai ter ensaio num dia? Toque em **✎ Editar** no ensaio e depois em **Cancelar este dia**.',
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
      'O cargo **Pastor** ou **Pastora** dá acesso de admin quando a pessoa tem login.',
      'Para mudar depois, toque no nome da pessoa na lista.',
    ]],
    ['lider', 'Escolher o líder de um ministério', 'Admin', ADMIN, 'ministerios', [
      'Abra **Ministérios** e toque no ministério.',
      'Toque em **✎ Editar**, escolha a pessoa no campo **Líder** e toque em **Salvar**.',
      'O líder só consegue editar se tiver login com o mesmo e-mail do cadastro de membro.',
      'Não mude o nome dos ministérios **Louvor**, **Cantina** e **Mídia**: o sistema usa esses nomes.',
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
    ['pastores', 'Mudar o texto e a foto dos pastores', 'Admin', ADMIN, 'pastores', [
      'Abra **Pastores** no menu.',
      'Toque em **✎ Editar** no cartão do pastor. Cole o link da foto e escreva o texto.',
      'Esses cartões aparecem também na página de boas-vindas, para quem ainda não entrou.',
    ]],
    ['login', 'Dar acesso de membro para alguém', 'Admin', ADMIN, null, [
      'A pessoa cria a conta sozinha em **Sou visitante, quero me cadastrar** (ou você cria no Supabase, em **Authentication › Users › Add user**).',
      'Abra **Membros**, toque na pessoa (ou em **+ Novo membro**) e coloque **o mesmo e-mail** da conta.',
      'Toque em **Salvar**. Pronto: a conta deixa de ser visitante e vira membro.',
      'Se for pastor, escolha **Pastor** ou **Pastora** no campo **Cargo**: a conta vira **admin** sozinha.',
      'Por segurança, a conta só vira membro quando a secretaria salva o cadastro. Digitar o e-mail de outra pessoa não dá acesso.',
    ]],
    ['admin', 'Tornar alguém admin', 'Admin', ADMIN, null, [
      'A pessoa precisa já ter login (veja "Dar acesso ao site para alguém").',
      'No Supabase, abra o **SQL Editor**, cole a linha abaixo trocando o e-mail e toque em **Run**:',
      "update perfis set papel = 'admin' where email = 'pessoa@email.com';",
      'Peça para a pessoa sair e entrar de novo no site.',
    ]],
  ];

  // Passo a passo com imagens, em duas versões (celular e computador):
  // [print, [x, y, largura, altura] em % da imagem (onde tocar), print do PC, marcação no PC, legenda, legenda no PC].
  // Prints do modo demonstração, em assets/img/ajuda/celular e assets/img/ajuda/pc.
  const FOTOS = {
    'entrar': [
      ['entrar-1', [3.5, 45.3, 93.1, 9.4], 'entrar-1', [4.5, 45.5, 9.5, 9.0],
        'Na página de boas-vindas, toque em **Entrar**.',
        'Na página de boas-vindas, clique em **Entrar**.'],
      ['entrar-2', [11.8, 70.0, 76.4, 8.3], 'entrar-2', [35.5, 69.0, 29.1, 7.8],
        'Digite seu e-mail e sua senha e toque em **Entrar**.',
        'Digite seu e-mail e sua senha e clique em **Entrar**.'],
      ['entrar-3', [75.9, 88.5, 21.3, 10.0], 'entrar-3', [0.0, 0.0, 20.9, 101.5],
        'No celular, toque em **Menu** para ver todas as telas.',
        'No computador, o menu fica sempre aqui, na esquerda.'],
      ['entrar-4', [1.9, 91.5, 61.5, 6.9], 'entrar-3', [0.6, 91.9, 18.7, 6.5],
        'Para sair, abra o menu e toque em **Sair**.',
        'Para sair, clique em **Sair**, no fim do menu.'],
    ],
    'ver-escala': [
      ['entrar-3', [21.1, 88.5, 21.3, 10.0], 'entrar-3', [0.6, 30.5, 18.7, 8.3],
        'Toque em **Escalas** no menu de baixo.',
        'Clique em **Escalas** no menu da esquerda.'],
      ['escala-2', [7.4, 46.0, 85.1, 8.0], 'escala-2', [23.9, 46.2, 72.1, 7.6],
        'Cada dia mostra quem serve e a função de cada um.',
        'Cada dia mostra quem serve e a função de cada um.'],
      ['escala-3', [2.8, 15.0, 94.4, 14.1], 'escala-3', [22.5, 18.5, 74.9, 7.0],
        'Toque em um ministério para ver só a escala dele.',
        'Clique em um ministério para ver só a escala dele.'],
      ['escala-4', [67.0, 29.9, 30.2, 7.9], 'escala-3', [86.9, 26.4, 10.5, 7.8],
        'Toque em **Próxima ›** para ver a semana seguinte.',
        'Clique em **Próxima ›** para ver a semana seguinte.'],
    ],
    'ver-musica': [
      ['ensaio-2', [14.8, 36.3, 39, 5], 'ensaio-2', [26.2, 24.6, 11.9, 4.8],
        'Em **Louvor**, toque no nome da música.',
        'Em **Louvor**, clique no nome da música.'],
      ['musica-ver-2', [0.0, 77.7, 102.6, 23.0], 'musica-ver-2', [21.5, 43.9, 57.0, 21.9],
        'Aqui aparecem o tom, o andamento, o link e a letra.',
        'Aqui aparecem o tom, o andamento, o link e a letra.'],
    ],
    'ver-eventos': [
      ['entrar-3', [2.7, 20.0, 26.7, 18.6], 'entrar-3', [22.7, 23.2, 8.1, 17.6],
        'Na tela **Início**, toque em um evento.',
        'Na tela **Início**, clique em um evento.'],
      ['eventos-2', [82.1, 2.6, 15.4, 7.9], 'eventos-2', [94.5, 2.5, 4.7, 7.5],
        'Toque nos lados da tela para passar. Para fechar, toque no **✕**.',
        'Clique nos lados da tela para passar. Para fechar, clique no **✕**.'],
    ],
    'vender': [
      ['vender-1', [8.7, 30.6, 41.5, 13.2], 'vender-1', [24.3, 33.3, 14.0, 12.5],
        'Em **Cantina**, toque no item a cada venda.',
        'Em **Cantina**, clique no item a cada venda.'],
      ['vender-2', [8.7, 44.5, 82.5, 10.9], 'cardapio-1', [24.3, 58.7, 41.8, 10.4],
        'O total do dia vai somando sozinho.',
        'O total do dia vai somando sozinho.'],
      ['vender-3', [79.0, 46.8, 12.3, 6.3], 'cardapio-1', [62.4, 69.2, 3.8, 6.0],
        'Errou? Toque no **−** para desfazer uma venda.',
        'Errou? Clique no **−** para desfazer uma venda.'],
    ],
    'escalar': [
      ['escala-3', [2.8, 38.1, 49.7, 8.3], 'escala-3', [22.5, 34.5, 15.1, 7.8],
        'Em **Escalas**, toque em **+ Escalar pessoa**.',
        'Em **Escalas**, clique em **+ Escalar pessoa**.'],
      ['escalar-2', [4.2, 46.1, 91.7, 19.3], 'escalar-2', [31.0, 42.6, 38.1, 15.4],
        'Escolha o ministério, o dia e a pessoa.',
        'Escolha o ministério, o dia e a pessoa.'],
      ['escalar-3', [68.6, 89.5, 27.3, 8.3], 'escalar-3', [60.7, 83.6, 8.3, 7.8],
        'Se quiser, escreva a função. Depois toque em **Salvar**.',
        'Se quiser, escreva a função. Depois clique em **Salvar**.'],
    ],
    'copiar-semana': [
      ['ministerio-1', [2.8, 27.6, 94.4, 24.3], 'ministerio-1', [22.5, 18.5, 24.7, 23.0],
        'Em **Ministérios**, toque no seu ministério.',
        'Em **Ministérios**, clique no seu ministério.'],
      ['copiar-2', [8.7, 45.9, 68.9, 8.3], 'copiar-2', [39.2, 46.1, 21.0, 7.8],
        'Toque em **⧉ Copiar semana anterior**.',
        'Clique em **⧉ Copiar semana anterior**.'],
    ],
    'participantes': [
      ['ministerio-1', [2.8, 27.6, 94.4, 24.3], 'ministerio-1', [22.5, 18.5, 24.7, 23.0],
        'Em **Ministérios**, toque no seu ministério.',
        'Em **Ministérios**, clique no seu ministério.'],
      ['lider-1', [57.9, 23.0, 33.3, 6.9], 'lider-1', [85.5, 26.1, 10.2, 6.5],
        'Toque em **+ Adicionar** e escolha a pessoa.',
        'Clique em **+ Adicionar** e escolha a pessoa.'],
      ['lider-1', [41.8, 30.8, 10.8, 5.5], 'lider-1', [34.4, 33.5, 3.3, 5.2],
        'Para tirar alguém, toque no **✕** ao lado do nome.',
        'Para tirar alguém, clique no **✕** ao lado do nome.'],
    ],
    'musica': [
      ['musica-1', [2.8, 31.4, 44.9, 8.3], 'musica-1', [83.8, 26.2, 13.7, 7.8],
        'Em **Louvor**, na aba **Músicas**, toque em **+ Nova música**.',
        'Em **Louvor**, na aba **Músicas**, clique em **+ Nova música**.'],
      ['musica-2', [4.2, 20.0, 91.7, 12.4], 'musica-2', [31.0, 13.6, 38.1, 11.8],
        'Escreva o nome da música (o resto é opcional) e toque em **Salvar**.',
        'Escreva o nome da música (o resto é opcional) e clique em **Salvar**.'],
    ],
    'ensaio': [
      ['ensaio-1', [63.2, 25.9, 28, 6.9], 'ensaio-1', [87.1, 28.8, 8.5, 6.5],
        'Ensaio toda semana? Em **Louvor**, toque em **+ Definir** no quadro **Ensaio fixo**.',
        'Ensaio toda semana? Em **Louvor**, clique em **+ Definir** no quadro **Ensaio fixo**.'],
      ['ensaio-fixo', [4.2, 80.2, 91.7, 8.2], 'ensaio-fixo', [31, 66.9, 38.1, 7.8],
        'Escolha o dia, o horário e para qual culto são as músicas. Depois toque em **Salvar**.',
        'Escolha o dia, o horário e para qual culto são as músicas. Depois clique em **Salvar**.'],
      ['ensaio-2', [8.7, 8.6, 82.5, 8.5], 'ensaio-2', [24.3, 8.1, 30.4, 4.8],
        'Os ensaios das próximas semanas aparecem sozinhos, mostrando para qual culto são as músicas.',
        'Os ensaios das próximas semanas aparecem sozinhos, mostrando para qual culto são as músicas.'],
      ['ensaio-2', [8.7, 66.7, 28.6, 6.9], 'ensaio-2', [24.3, 50, 8.7, 6.5],
        'No ensaio, toque em **+ Música** para escolher as músicas.',
        'No ensaio, clique em **+ Música** para escolher as músicas.'],
      ['ensaio-2', [57.9, 46.4, 33.4, 6.3], 'ensaio-2', [85.5, 30.8, 10.2, 6],
        'Use as setas para mudar a ordem. O **✕** tira a música do ensaio.',
        'Use as setas para mudar a ordem. O **✕** tira a música do ensaio.'],
    ],
    'cardapio': [
      ['cardapio-1', [66.9, 46.5, 24.3, 6.9], 'cardapio-1', [88.2, 44.9, 7.4, 6.5],
        'Em **Cantina**, toque em **+ Item** para criar um item.',
        'Em **Cantina**, clique em **+ Item** para criar um item.'],
      ['cardapio-2', [4.2, 79.4, 91.7, 8.9], 'cardapio-2', [31.0, 58.3, 38.1, 8.5],
        'Acabou? Toque no item e desmarque **Disponível para venda**.',
        'Acabou? Clique no item e desmarque **Disponível para venda**.'],
    ],
    'membro': [
      ['membro-1', [2.8, 13.9, 47.2, 8.3], 'membro-1', [83.1, 9.0, 14.4, 7.8],
        'Em **Membros**, toque em **+ Novo membro**.',
        'Em **Membros**, clique em **+ Novo membro**.'],
      ['membro-2', [4.2, 45.9, 91.7, 12.4], 'membro-2', [31.0, 38.2, 38.1, 11.8],
        'Coloque o e-mail se a pessoa for ter login.',
        'Coloque o e-mail se a pessoa for ter login.'],
    ],
    'lider': [
      ['ministerio-1', [2.8, 27.6, 94.4, 24.3], 'ministerio-1', [22.5, 18.5, 24.7, 23.0],
        'Em **Ministérios**, toque no ministério.',
        'Em **Ministérios**, clique no ministério.'],
      ['lider-1', [64.8, 10.2, 32.4, 8.3], 'lider-1', [87.6, 13.9, 9.9, 7.8],
        'Toque em **✎ Editar**.',
        'Clique em **✎ Editar**.'],
      ['lider-2', [4.2, 59.2, 91.7, 12.4], 'lider-2', [31.0, 50.2, 38.1, 11.8],
        'Escolha a pessoa no campo **Líder** e toque em **Salvar**.',
        'Escolha a pessoa no campo **Líder** e clique em **Salvar**.'],
    ],
    'evento': [
      ['evento-1', [44.1, 17.6, 44.1, 8.3], 'evento-1', [84.0, 9.0, 13.4, 7.8],
        'Em **Eventos**, toque em **+ Novo evento**.',
        'Em **Eventos**, clique em **+ Novo evento**.'],
      ['evento-2', [4.2, 59.9, 91.7, 28.4], 'evento-2', [31.0, 62.7, 38.1, 24.1],
        'Para ter imagem, cole aqui o link de uma foto.',
        'Para ter imagem, cole aqui o link de uma foto.'],
    ],
    'texto': [
      ['texto-1', [2.8, 17.6, 40.9, 8.3], 'texto-1', [85.0, 9.0, 12.5, 7.8],
        'Em **Aprender**, toque em **+ Novo texto**.',
        'Em **Aprender**, clique em **+ Novo texto**.'],
    ],
  };

  const DUVIDAS = [
    ['Não aparece o botão para mudar alguma coisa.',
      'Cada pessoa só vê os botões do que pode alterar. Se precisar mudar algo, fale com o líder do ministério ou com a secretaria.'],
    ['Entrei, mas não vejo as escalas.',
      'Sua conta ainda é de visitante. Peça para a secretaria colocar o mesmo e-mail da sua conta no seu cadastro de membro e salvar.'],
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
    if (App.ehVisitante(p)) {
      titulo = 'Você é visitante';
      desc = 'Pode ver os eventos, o cardápio da cantina, as fotos dos cultos, a área Aprender e os pastores. Para ver as escalas, peça à secretaria o acesso de membro.';
    } else if (p.papel === 'admin') {
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

  // Mesma largura em que o site troca o menu de baixo pelo menu lateral (css/style.css)
  const TELA_PC = window.matchMedia('(min-width: 861px)');

  // Mostra um print por vez, com a marcação de onde tocar e botões para passar.
  // No computador usa os prints do computador; no celular, os do celular.
  function verFotos(fotos) {
    let i = 0;
    const img = h('img.ajuda-print', { alt: '' });
    const marca = h('span.ajuda-marca', { 'aria-hidden': 'true' });
    const contador = h('p.ajuda-contador');
    const legenda = h('p.ajuda-legenda', { 'aria-live': 'polite' });
    const anterior = h('button.btn.secundario', { type: 'button', onclick: () => ir(i - 1) }, '‹ Anterior');
    const proximo = h('button.btn', { type: 'button', onclick: () => ir(i + 1) }, 'Próximo ›');
    const caixa = h('div.ajuda-fotos',
      h('div.ajuda-tela', img, marca),
      h('div.ajuda-explica', contador, legenda,
        fotos.length > 1 ? h('div.ajuda-nav', anterior, proximo) : null));
    function ir(n) {
      i = Math.max(0, Math.min(fotos.length - 1, n));
      const pc = TELA_PC.matches;
      const [arqCel, marcaCel, arqPc, marcaPc, legCel, legPc] = fotos[i];
      const [x, y, w, alt] = pc ? marcaPc : marcaCel;
      const leg = pc ? legPc : legCel;
      caixa.classList.toggle('pc', pc);
      img.width = pc ? 1280 : 780;
      img.height = pc ? 800 : 1520;
      img.src = `assets/img/ajuda/${pc ? 'pc/' + arqPc : 'celular/' + arqCel}.webp`;
      img.alt = 'Tela do site: ' + leg.replace(/\*\*/g, '');
      Object.assign(marca.style, { left: x + '%', top: y + '%', width: w + '%', height: alt + '%' });
      contador.textContent = `Passo ${i + 1} de ${fotos.length}`;
      legenda.innerHTML = '';
      legenda.append(...texto(leg));
      anterior.disabled = i === 0;
      proximo.disabled = i === fotos.length - 1;
    }
    // girou o tablet ou mudou o tamanho da janela: troca para a versão certa
    TELA_PC.addEventListener('change', () => { if (caixa.isConnected) ir(i); });
    ir(0);
    return caixa;
  }

  function cartao(t, aberto) {
    const [id, pergunta, quem, , rota, passos] = t;
    const lista = h('ol.ajuda-passos', passos.map((p) => h('li', p.startsWith('update ') ? h('code.ajuda-codigo', p) : texto(p))));
    const corpo = h('div.artigo-corpo');
    const cartao = h('details.artigo', { id: 'ajuda-' + id, open: aberto }, h('summary', h('span', pergunta), h('span.ajuda-quem', quem)), corpo);
    // monta só ao abrir, para não baixar as imagens de todas as tarefas de uma vez
    const montar = () => {
      if (corpo.childNodes.length || !cartao.open) return;
      if (FOTOS[id]) corpo.append(verFotos(FOTOS[id]), h('details.ajuda-texto', h('summary', 'Ver tudo em texto'), lista));
      else corpo.append(lista);
      if (rota) corpo.append(h('a.btn.secundario.pequeno', { href: '#/' + rota }, 'Abrir ' + App.paginas[rota].titulo));
    };
    cartao.addEventListener('toggle', montar);
    montar();
    return cartao;
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
