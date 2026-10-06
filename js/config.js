// Configuração do Supabase.
// Deixe vazio para usar o "modo demonstração": os dados ficam salvos só neste navegador.
// Para usar o banco de verdade, cole aqui a URL do projeto e a chave PÚBLICA
// (Supabase > Project Settings > API Keys: a "Publishable key", que começa com sb_publishable_,
// ou a antiga "anon public"). Essa chave pode ficar no site: quem protege os dados são as
// regras do banco (supabase/schema.sql).
// NUNCA cole aqui a "Secret key" nem a "service_role": elas passam por cima de todas as regras.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://qvmstuybexoaljopbjpb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_6d8NGt4SFBn0VLZl4fYyvA_kVU18HWg',
  NOME_IGREJA: 'Paixão Por Jesus',
  // Aparecem na página de boas-vindas. Deixe a hora vazia ('') para mostrar "Horário em breve".
  CULTOS: [
    { dia: 'Quarta-feira', hora: '', nome: 'Culto de quarta' },
    { dia: 'Domingo', hora: '', nome: 'Culto de domingo' },
  ],
  ENDERECO: '',  // ex.: 'Rua Tal, 123 - Bairro, Cidade - UF' (vira um botão "Ver no mapa")
  // Redes e contato (aparecem no rodapé da página de boas-vindas)
  INSTAGRAM: 'paixaoporjesus_1', // só o @, sem o endereço
  FACEBOOK: 'https://www.facebook.com/GrupoJovemPaixaoPorJesus',
  WHATSAPP: '(21) 99967-8599',
};
