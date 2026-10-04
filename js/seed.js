// Dados de exemplo para o modo demonstração (só usados quando não há Supabase configurado).
(function () {
  const App = (window.App = window.App || {});

  App.seed = function () {
    const u = App.util;
    let n = 0;
    const id = (p) => `${p}-${++n}`;
    const agora = new Date().toISOString();
    const hoje = u.hoje();
    const domingo = u.inicioSemana(hoje);
    const quarta = u.somarDias(domingo, 3);
    const proxDomingo = u.somarDias(domingo, 7);

    const nomes = [
      ['Ana Souza', '(11) 98888-1001', 'ativo'], ['Bruno Lima', '(11) 98888-1002', 'ativo'],
      ['Carla Mendes', '(11) 98888-1003', 'ativo'], ['Daniel Rocha', '(11) 98888-1004', 'ativo'],
      ['Eduarda Alves', '(11) 98888-1005', 'ativo'], ['Felipe Santos', '(11) 98888-1006', 'ativo'],
      ['Gabriela Costa', '(11) 98888-1007', 'ativo'], ['Henrique Dias', '(11) 98888-1008', 'ativo'],
      ['Isabela Ferreira', '(11) 98888-1009', 'visitante'], ['João Pereira', '(11) 98888-1010', 'ativo'],
      ['Larissa Ribeiro', '(11) 98888-1011', 'ativo'], ['Marcos Oliveira', '(11) 98888-1012', 'inativo'],
    ];
    const membros = nomes.map(([nome, telefone, status], i) => ({
      id: id('mem'), nome, telefone, status, created_at: agora,
      email: u.normalizar(nome).replace(' ', '.') + '@email.com',
      data_nascimento: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
    }));
    membros.push(
      { id: id('mem'), nome: 'Sebastian Chuliver', cargo: 'Pastor', status: 'ativo', created_at: agora },
      { id: id('mem'), nome: 'Romina Zaninovich', cargo: 'Pastora', status: 'ativo', created_at: agora },
      { id: id('mem'), nome: 'Adriana', cargo: 'Diaconisa', status: 'ativo', created_at: agora },
    );
    const m = (nome) => membros.find((x) => x.nome.startsWith(nome)).id;

    const ministerios = [
      { id: id('min'), nome: 'Louvor', descricao: 'Música e adoração nos cultos.', lider_id: m('Bruno'), cor: '#7c3aed' },
      { id: id('min'), nome: 'Portaria', descricao: 'Recepção e acolhimento na entrada.', lider_id: m('Daniel'), cor: '#0284c7' },
      { id: id('min'), nome: 'Cantina', descricao: 'Lanches após os cultos.', lider_id: m('Carla'), cor: '#ea580c' },
      { id: id('min'), nome: 'Limpeza', descricao: 'Organização e limpeza do templo.', lider_id: m('Eduarda'), cor: '#059669' },
    ].map((x) => ({ ...x, created_at: agora }));
    const min = (nome) => ministerios.find((x) => x.nome === nome).id;

    const participacao = {
      Louvor: ['Bruno', 'Ana', 'Felipe', 'Gabriela', 'João'],
      Portaria: ['Daniel', 'Henrique', 'Larissa'],
      Cantina: ['Carla', 'Ana', 'Larissa'],
      Limpeza: ['Eduarda', 'Henrique', 'Felipe', 'João'],
    };
    const ministerio_membros = [];
    for (const [mn, pessoas] of Object.entries(participacao)) {
      for (const p of pessoas) ministerio_membros.push({ id: id('mm'), ministerio_id: min(mn), membro_id: m(p) });
    }

    const esc = (mn, pessoa, data, funcao) => ({ id: id('esc'), ministerio_id: min(mn), membro_id: m(pessoa), data, funcao, created_at: agora });
    const escalas = [
      esc('Louvor', 'Bruno', domingo, 'Violão'), esc('Louvor', 'Ana', domingo, 'Vocal'),
      esc('Louvor', 'Felipe', domingo, 'Bateria'), esc('Louvor', 'Gabriela', domingo, 'Teclado'),
      esc('Louvor', 'João', quarta, 'Violão'), esc('Louvor', 'Ana', quarta, 'Vocal'),
      esc('Portaria', 'Daniel', domingo, 'Porta principal'), esc('Portaria', 'Larissa', domingo, 'Recepção'),
      esc('Portaria', 'Henrique', quarta, 'Porta principal'),
      esc('Cantina', 'Carla', domingo, 'Caixa'), esc('Cantina', 'Ana', domingo, 'Preparo'),
      esc('Limpeza', 'Eduarda', u.somarDias(domingo, 6), 'Salão'), esc('Limpeza', 'João', u.somarDias(domingo, 6), 'Banheiros'),
      esc('Louvor', 'Bruno', proxDomingo, 'Violão'), esc('Louvor', 'Gabriela', proxDomingo, 'Vocal'),
    ];

    const musicas = [
      ['Bondade de Deus', 'Isaías Saad', 'G', 68], ['Ousado Amor', 'Isaías Saad', 'C', 72],
      ['Lugar Secreto', 'Gabriela Rocha', 'D', 70], ['Me Atraiu', 'Gabriela Rocha', 'A', 76],
      ['Grande é o Senhor', 'Adhemar de Campos', 'E', 80], ['Aquieta Minh\'alma', 'Ministério Zoe', 'B', 64],
    ].map(([titulo, artista, tom, bpm]) => ({ id: id('mus'), titulo, artista, tom, bpm, created_at: agora }));

    const ensaio = { id: id('ens'), data: u.somarDias(domingo, 6), hora: '16:00', local: 'Templo', observacoes: 'Chegar 15 min antes.', created_at: agora };
    const ensaio_musicas = musicas.slice(0, 4).map((mu, i) => ({ id: id('em'), ensaio_id: ensaio.id, musica_id: mu.id, ordem: i }));

    const cantina_itens = [
      ['Coxinha', 7], ['Pão de queijo', 4], ['Refrigerante lata', 6], ['Água', 3], ['Bolo (fatia)', 5], ['Café', 2.5],
    ].map(([nome, preco]) => ({ id: id('item'), nome, preco, disponivel: true, created_at: agora }));

    const cantina_vendas = [
      [0, 3], [1, 5], [2, 2], [5, 4],
    ].map(([i, q]) => ({
      id: id('venda'), data: domingo, item_id: cantina_itens[i].id, item_nome: cantina_itens[i].nome,
      quantidade: q, valor_unitario: cantina_itens[i].preco, created_at: agora,
    }));

    const eventos = [
      { titulo: 'Culto de Celebração', data: proxDomingo, hora: '18:00', local: 'Templo', descricao: 'Venha adorar com a gente! Traga sua família.' },
      { titulo: 'Culto de Oração', data: u.somarDias(proxDomingo, 3), hora: '19:30', local: 'Templo', descricao: 'Uma noite dedicada à oração e intercessão.' },
      { titulo: 'Encontro de Jovens', data: u.somarDias(proxDomingo, 6), hora: '19:00', local: 'Salão anexo', descricao: 'Louvor, palavra e comunhão para a juventude.' },
      { titulo: 'Batismo', data: u.somarDias(proxDomingo, 14), hora: '10:00', local: 'Templo', descricao: 'Inscrições abertas com a secretaria.' },
    ].map((e) => ({ id: id('ev'), imagem_url: '', created_at: agora, ...e }));

    const texto = 'Texto provisório. A liderança vai escrever este conteúdo. Para editar, toque em "Editar".';
    const conteudos = [
      ['abc', 'Quem é Deus', 1], ['abc', 'O que é o pecado', 2], ['abc', 'Jesus, o caminho', 3], ['abc', 'Fé e arrependimento', 4],
      ['fundamentos', 'Oração', 1], ['fundamentos', 'Leitura da Bíblia', 2], ['fundamentos', 'Batismo', 3], ['fundamentos', 'Vida em comunidade', 4],
      ['visao', 'Nossa visão', 1], ['visao', 'Nossa missão', 2], ['visao', 'Nossos valores', 3],
    ].map(([secao, titulo, ordem]) => ({ id: id('cont'), secao, titulo, ordem, corpo: texto, created_at: agora }));

    return { membros, ministerios, ministerio_membros, escalas, musicas, ensaios: [ensaio], ensaio_musicas,
      cantina_itens, cantina_vendas, eventos, conteudos };
  };
})();
