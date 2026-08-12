const filterEngine = require('../src/filterEngine');

console.log('=== INICIANDO TESTES DO MOTOR DE FILTROS ===\n');

const mockConfig = {
  keywords: ['iphone', 'ps5', 'playstation', 'rtx 4060', 'air fryer'],
  excludedWords: ['usado', 'capinha', 'defeito'],
  maxPriceLimit: 5000
};

// Caso 1: Oferta válida que deve ser filtrada
const sampleMessage1 = `
🔥 PROMOÇÃO IMPERDÍVEL! 🔥
PlayStation 5 Edição Digital 825GB
Por apenas R$ 3.499,00 à vista no Pix!
Vendido e entregue por Amazon Brasil!
Compre aqui: https://www.amazon.com.br/dp/B088685QVI
`;

const result1 = filterEngine.analyzeMessage(sampleMessage1, mockConfig, 'Promoçoes BR');
console.log('--- TESTE 1: Oferta PS5 Válida ---');
if (result1 && result1.matchedKeywords.includes('ps5')) {
  console.log('✅ SUCESSO: Oferta capturada corretamente!');
  console.log('   Título:', result1.title);
  console.log('   Preço:', result1.priceText);
  console.log('   Loja:', result1.store);
  console.log('   Link:', result1.link);
} else {
  console.error('❌ FALHA: Deveria ter capturado a oferta do PS5');
}

// Caso 2: Oferta com palavra excluída ("usado") - Deve ser rejeitada
const sampleMessage2 = `
Vendo iPhone 13 Pro Max Usado com marcas de uso.
Preço: R$ 3.000,00
`;

const result2 = filterEngine.analyzeMessage(sampleMessage2, mockConfig, 'Grupo Desapego');
console.log('\n--- TESTE 2: Oferta com Palavra Excluída ("usado") ---');
if (result2 === null) {
  console.log('✅ SUCESSO: Oferta rejeitada corretamente por conter palavra ignorada!');
} else {
  console.error('❌ FALHA: Oferta deveria ter sido ignorada devido à palavra "usado"');
}

// Caso 3: Oferta acima do limite de preço (Limit = 5000, Oferta = 8999) - Deve ser rejeitada
const sampleMessage3 = `
Notebook Gamer RTX 4090 Top de Linha
Preço R$ 12.999,00
https://www.kabum.com.br/produto/12345
`;

const result3 = filterEngine.analyzeMessage(sampleMessage3, mockConfig, 'Ofertas Hardware');
console.log('\n--- TESTE 3: Oferta Acima do Limite de Preço ---');
if (result3 === null) {
  console.log('✅ SUCESSO: Oferta rejeitada por exceder o preço máximo!');
} else {
  console.error('❌ FALHA: Oferta acima do limite não deveria ter sido filtrada');
}

// Caso 4: Oferta de Air Fryer na Magalu
const sampleMessage4 = `
Air Fryer Fritadeira Sem Óleo Mondia 4L
Por R$ 279,90
Link: https://www.magazineluiza.com.br/air-fryer/p/12345
`;

const result4 = filterEngine.analyzeMessage(sampleMessage4, mockConfig, 'Promoções Casa');
console.log('\n--- TESTE 4: Oferta Air Fryer Magalu ---');
if (result4 && result4.matchedKeywords.includes('air fryer')) {
  console.log('✅ SUCESSO: Air Fryer capturada!');
  console.log('   Preço:', result4.priceText);
  console.log('   Loja:', result4.store);
} else {
  console.error('❌ FALHA: Deveria ter capturado a Air Fryer');
}

console.log('\n===========================================');
console.log('  TODOS OS TESTES UNITÁRIOS CONCLUÍDOS!');
console.log('===========================================');
