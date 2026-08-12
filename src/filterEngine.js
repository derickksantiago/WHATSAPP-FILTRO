/**
 * Motor de Análise e Filtragem de Promoções do WhatsApp
 */

// Função auxiliar para remover acentos e converter para caixa baixa
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Extrai links (URLs) de uma mensagem
function extractLinks(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[.,;)]+$/, '')); // Limpa pontuação no final
}

// Analisa os links na mensagem e separa o Link do Produto do Link do Cupom
function parseSmartLinks(text) {
  const allLinks = extractLinks(text);
  if (allLinks.length === 0) {
    return { productLink: null, couponLink: null, allLinks: [] };
  }

  if (allLinks.length === 1) {
    const norm = normalizeText(text);
    if (norm.includes('resgate o cupom') || norm.includes('pegue o cupom') || norm.includes('link do cupom')) {
      return { productLink: allLinks[0], couponLink: allLinks[0], allLinks };
    }
    return { productLink: allLinks[0], couponLink: null, allLinks };
  }

  // Se houver 2 ou mais links, analisa o contexto das linhas
  const lines = text.split('\n');
  let productLink = null;
  let couponLink = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalizeText(line);
    const lineLinks = extractLinks(line);

    if (lineLinks.length > 0) {
      const url = lineLinks[0];

      // Verifica a própria linha ou a linha anterior para contextualizar o link
      const prevLine = i > 0 ? normalizeText(lines[i - 1]) : '';
      const context = `${prevLine} ${normLine}`;

      if (context.includes('cupom') || context.includes('resgate') || context.includes('pegue o cupom')) {
        if (!couponLink) couponLink = url;
      } else if (context.includes('produto') || context.includes('compre') || context.includes('comprar') || context.includes('link do produto') || context.includes('oferta')) {
        if (!productLink) productLink = url;
      }
    }
  }

  // Caso não tenha conseguido classificar explicitamente pela linha:
  // Em mensagens de promoção brasileiras, quando há 2 links, o link do produto costuma ser o último ou o que contém "produto"
  if (!productLink && couponLink) {
    productLink = allLinks.find(l => l !== couponLink) || allLinks[allLinks.length - 1];
  } else if (!productLink) {
    // Se não encontrou cupom nem produto rotulado, assume o último como produto (ou o 1º se só 1)
    productLink = allLinks[allLinks.length - 1];
    if (allLinks.length > 1 && !couponLink) {
      couponLink = allLinks[0];
    }
  }

  return { productLink, couponLink, allLinks };
}

// Identifica a loja pelo domínio do link
function detectStore(urls) {
  if (!urls || urls.length === 0) return 'Oferta Direct/Geral';
  const firstUrl = urls[0].toLowerCase();
  
  if (firstUrl.includes('amazon.')) return 'Amazon 📦';
  if (firstUrl.includes('mercadolivre.') || firstUrl.includes('mercadolibre.')) return 'Mercado Livre 💛';
  if (firstUrl.includes('kabum.')) return 'KaBuM! 🎮';
  if (firstUrl.includes('magazineluiza.') || firstUrl.includes('magalu.')) return 'Magalu 💙';
  if (firstUrl.includes('shopee.')) return 'Shopee 🧡';
  if (firstUrl.includes('aliexpress.')) return 'AliExpress 🔴';
  if (firstUrl.includes('casasbahia.')) return 'Casas Bahia 🏠';
  if (firstUrl.includes('ponto.')) return 'Ponto 🔴';
  if (firstUrl.includes('fastshop.')) return 'Fast Shop ⚡';
  if (firstUrl.includes('terabyteshop.')) return 'TerabyteShop 🖥️';
  if (firstUrl.includes('pichau.')) return 'Pichau 🚀';
  if (firstUrl.includes('pelando.')) return 'Pelando 🎯';
  if (firstUrl.includes('promobit.')) return 'Promobit 🏷️';
  
  try {
    const parsed = new URL(urls[0]);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return 'Loja Web 🔗';
  }
}

// Extrai o valor em Reais (R$) da mensagem
function extractPrice(text) {
  if (!text) return { priceText: null, value: null };

  // Procura padrões como R$ 1.499,90, R$1500, R$ 99,00, 99.90
  const priceRegex = /R\$\s?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/gi;
  const matches = [...text.matchAll(priceRegex)];

  if (matches.length > 0) {
    // Se houver "Por R$ ...", dá prioridade ao preço "Por" (preço final com desconto)
    const porMatch = text.match(/(?:por|por:)\s*R\$\s?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/i);
    const targetPriceStr = porMatch ? porMatch[1] : matches[matches.length - 1][1];

    let numValue = targetPriceStr.replace(/\./g, '').replace(',', '.');
    let parsedValue = parseFloat(numValue);

    return {
      priceText: `R$ ${targetPriceStr}`,
      value: isNaN(parsedValue) ? null : parsedValue
    };
  }

  return { priceText: null, value: null };
}

// Gera um título limpo para o card da promoção
function extractTitle(text) {
  if (!text) return 'Oferta Filtrada';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return 'Oferta Filtrada';

  let firstLine = lines[0];
  if (firstLine.startsWith('http')) {
    firstLine = lines[1] || lines[0];
  }

  if (firstLine.length > 80) {
    return firstLine.substring(0, 80) + '...';
  }
  return firstLine;
}

/**
 * Avalia se a mensagem atende aos critérios do filtro.
 * @param {string} rawText Texto bruto da mensagem
 * @param {object} config Configurações (keywords, excludedWords, maxPriceLimit)
 * @param {string} groupName Nome do grupo de origem
 * @param {string} sender Nome/Telefone do remetente
 * @returns {object|null} Retorna o objeto Deal ou null se não passar no filtro
 */
function analyzeMessage(rawText, config, groupName = 'Grupo WhatsApp', sender = 'Anônimo') {
  if (!rawText || typeof rawText !== 'string') return null;

  const normalizedText = normalizeText(rawText);

  // 1. Verifica Palavras Excluídas (Falsos Positivos)
  const excludedWords = config.excludedWords || [];
  for (const exWord of excludedWords) {
    const normEx = normalizeText(exWord);
    if (normEx && normalizedText.includes(normEx)) {
      return null; // Ignora oferta se contiver palavra excluída
    }
  }

  // Dicionário de Sinônimos Populares
  const synonyms = {
    'ps5': ['playstation 5', 'playstation5', 'ps5'],
    'playstation': ['playstation', 'ps5', 'ps4', 'playstation 5', 'playstation 4'],
    'ps4': ['playstation 4', 'playstation4', 'ps4'],
    'air fryer': ['air fryer', 'airfryer', 'fritadeira'],
    'notebook': ['notebook', 'laptop'],
    'placa de video': ['placa de video', 'placa de vídeo', 'gpu', 'rtx', 'gtx', 'rx'],
    'tv': ['tv', 'televisao', 'televisor', 'smarttv', 'smart tv']
  };

  // 2. Busca por Palavras-Chave de Interesse
  const keywords = config.keywords || [];
  const matchedKeywords = [];

  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    if (!normKw) continue;

    const termsToSearch = synonyms[normKw] ? [normKw, ...synonyms[normKw]] : [normKw];

    let hasMatched = false;
    for (const term of termsToSearch) {
      const normTerm = normalizeText(term);
      const regex = new RegExp(`\\b${normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalizedText) || normalizedText.includes(normTerm)) {
        hasMatched = true;
        break;
      }
    }

    if (hasMatched) {
      matchedKeywords.push(kw);
    }
  }

  // Se nenhuma palavra-chave bateu, ignora
  if (matchedKeywords.length === 0) {
    return null;
  }

  // 3. Extração de Preço
  const { priceText, value: priceValue } = extractPrice(rawText);

  // 4. Validação de Limite de Preço (se configurado)
  if (config.maxPriceLimit > 0 && priceValue !== null) {
    if (priceValue > config.maxPriceLimit) {
      return null; // Ultrapassa o preço máximo permitido
    }
  }

  // 5. Análise Inteligente de Links (Produto vs Cupom)
  const { productLink, couponLink, allLinks } = parseSmartLinks(rawText);
  const store = detectStore(allLinks);
  const title = extractTitle(rawText);

  // Monta objeto final da Promoção Encontrada
  return {
    id: `deal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    matchedKeywords,
    priceText: priceText || 'Preço não especificado',
    priceValue,
    store,
    link: productLink,        // Link principal apontando DIRETO para o produto
    couponLink: couponLink,   // Link do Cupom (se houver)
    allLinks,
    groupName,
    sender,
    rawText,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  normalizeText,
  extractLinks,
  parseSmartLinks,
  detectStore,
  extractPrice,
  analyzeMessage
};
