// Conexão WebSocket via Socket.io
const socket = io();

// Referências DOM
const statusPill = document.getElementById('statusPill');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const qrContainer = document.getElementById('qrContainer');
const qrCard = document.getElementById('qrCard');
const qrInstructions = document.getElementById('qrInstructions');

const statProcessed = document.getElementById('statProcessed');
const statDeals = document.getElementById('statDeals');

const keywordsTags = document.getElementById('keywordsTags');
const excludedTags = document.getElementById('excludedTags');
const addKeywordForm = document.getElementById('addKeywordForm');
const newKeywordInput = document.getElementById('newKeywordInput');
const addExcludedForm = document.getElementById('addExcludedForm');
const newExcludedInput = document.getElementById('newExcludedInput');

const maxPriceInput = document.getElementById('maxPriceInput');
const telegramToggle = document.getElementById('telegramToggle');
const onlyGroupsToggle = document.getElementById('onlyGroupsToggle');
const testTelegramBtn = document.getElementById('testTelegramBtn');
const telegramStatusMsg = document.getElementById('telegramStatusMsg');

const dealsFeed = document.getElementById('dealsFeed');
const emptyFeed = document.getElementById('emptyFeed');
const dealCountBadge = document.getElementById('dealCountBadge');
const clearDealsBtn = document.getElementById('clearDealsBtn');

const simulateBtn = document.getElementById('simulateBtn');
const simulateModal = document.getElementById('simulateModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const runSimulateBtn = document.getElementById('runSimulateBtn');
const simulateText = document.getElementById('simulateText');
const simulateResult = document.getElementById('simulateResult');

let currentQRCodeObj = null;
let currentDeals = [];

// === INICIALIZAÇÃO SOCKET.IO ===

socket.on('connect', () => {
  console.log('[Socket.io] Conectado ao servidor');
});

// Evento de mudança de status da conexão WhatsApp
socket.on('status_change', (data) => {
  updateStatusUI(data.status, data.qrCode);
  if (data.stats) {
    updateStatsUI(data.stats);
  }
});

// Recebe novo QR Code
socket.on('qr_code', (data) => {
  renderQRCode(data.qr);
});

// Atualização de Estatísticas
socket.on('stats_update', (stats) => {
  updateStatsUI(stats);
});

// Atualização de Configuração (Palavras-chave, etc)
socket.on('config_updated', (config) => {
  renderKeywords(config.keywords || []);
  renderExcluded(config.excludedWords || []);
  maxPriceInput.value = config.maxPriceLimit || '';
  telegramToggle.checked = config.telegramEnabled !== false;
  onlyGroupsToggle.checked = config.onlyGroups !== false;
});

// Recebe histórico inicial de promoções
socket.on('initial_deals', (deals) => {
  currentDeals = deals || [];
  renderDeals();
});

// Recebe nova promoção em tempo real
socket.on('new_deal', (deal) => {
  currentDeals.unshift(deal);
  renderDeals();
  playNotificationSound();
});

// Histórico limpo
socket.on('deals_cleared', () => {
  currentDeals = [];
  renderDeals();
});

// === FUNÇÕES DE INTERFACE (UI) ===

function updateStatusUI(status, qrCode) {
  statusDot.className = 'status-dot';
  
  if (status === 'READY') {
    statusDot.classList.add('green');
    statusText.textContent = 'WhatsApp 24/7 Conectado';
    qrCard.style.display = 'none';
  } else if (status === 'QR_READY') {
    statusDot.classList.add('yellow');
    statusText.textContent = 'Aguardando Escanear QR Code';
    qrCard.style.display = 'block';
    if (qrCode) renderQRCode(qrCode);
  } else if (status === 'AUTHENTICATED') {
    statusDot.classList.add('green');
    statusText.textContent = 'Autenticado! Carregando grupos...';
    qrCard.style.display = 'none';
  } else {
    statusDot.classList.add('red');
    statusText.textContent = 'Desconectado';
    qrCard.style.display = 'block';
  }
}

function renderQRCode(qrText) {
  qrContainer.innerHTML = '';
  if (!qrText) return;

  new QRCode(qrContainer, {
    text: qrText,
    width: 200,
    height: 200,
    colorDark: "#0f172a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  qrInstructions.innerHTML = 'Abra o WhatsApp no celular &gt; <b>Aparelhos Conectados</b> &gt; <b>Conectar Aparelho</b> e escaneie o código acima.';
}

function updateStatsUI(stats) {
  statProcessed.textContent = stats.messagesProcessed || 0;
  statDeals.textContent = stats.dealsMatched || 0;
}

function renderKeywords(keywords) {
  keywordsTags.innerHTML = '';
  keywords.forEach(kw => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `
      ${escapeHtml(kw)}
      <i class="fa-solid fa-xmark remove-tag" onclick="removeKeyword('${escapeHtml(kw)}')"></i>
    `;
    keywordsTags.appendChild(tag);
  });
}

function renderExcluded(words) {
  excludedTags.innerHTML = '';
  words.forEach(w => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `
      ${escapeHtml(w)}
      <i class="fa-solid fa-xmark remove-tag" onclick="removeExcluded('${escapeHtml(w)}')"></i>
    `;
    excludedTags.appendChild(tag);
  });
}

function renderDeals() {
  dealCountBadge.textContent = `${currentDeals.length} Ofertas`;

  if (currentDeals.length === 0) {
    emptyFeed.style.display = 'block';
    const oldCards = dealsFeed.querySelectorAll('.deal-card');
    oldCards.forEach(c => c.remove());
    return;
  }

  emptyFeed.style.display = 'none';

  const oldCards = dealsFeed.querySelectorAll('.deal-card');
  oldCards.forEach(c => c.remove());

  currentDeals.forEach(deal => {
    const card = document.createElement('div');
    card.className = 'deal-card';

    const formattedTime = new Date(deal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const keywordsHtml = deal.matchedKeywords.map(k => `<span class="keyword-badge">#${escapeHtml(k)}</span>`).join(' ');

    const productBtn = deal.link ? `<a href="${deal.link}" target="_blank" rel="noopener noreferrer" class="btn-buy"><i class="fa-solid fa-cart-shopping"></i> Abrir Produto</a>` : '';
    const couponBtn = (deal.couponLink && deal.couponLink !== deal.link) ? `<a href="${deal.couponLink}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="text-decoration:none; padding:0.5rem 1rem; border-radius:8px; font-weight:700; font-size:0.85rem;"><i class="fa-solid fa-ticket"></i> Resgatar Cupom</a>` : '';

    card.innerHTML = `
      <div class="deal-card-header">
        <div>
          <h3 class="deal-title">${escapeHtml(deal.title)}</h3>
          <div class="deal-keywords">${keywordsHtml}</div>
        </div>
        <div class="deal-price-badge">${escapeHtml(deal.priceText)}</div>
      </div>

      <div class="deal-meta">
        <div class="deal-meta-item"><i class="fa-solid fa-store"></i> ${escapeHtml(deal.store)}</div>
        <div class="deal-meta-item"><i class="fa-solid fa-users"></i> ${escapeHtml(deal.groupName)}</div>
        <div class="deal-meta-item"><i class="fa-regular fa-clock"></i> ${formattedTime}</div>
      </div>

      <div class="deal-text-preview">${escapeHtml(deal.rawText)}</div>

      <div class="deal-card-footer">
        <span class="deal-store">${escapeHtml(deal.store)}</span>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          ${productBtn}
          ${couponBtn}
        </div>
      </div>
    `;

    dealsFeed.appendChild(card);
  });
}

// === HANDLERS DE FORMULÁRIO E AÇÕES ===

addKeywordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const keyword = newKeywordInput.value.trim();
  if (!keyword) return;

  try {
    const res = await fetch('/api/config/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword })
    });
    if (res.ok) {
      newKeywordInput.value = '';
    }
  } catch (err) {
    console.error('Erro ao adicionar palavra-chave:', err);
  }
});

async function removeKeyword(keyword) {
  try {
    await fetch('/api/config/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword })
    });
  } catch (err) {
    console.error('Erro ao remover palavra-chave:', err);
  }
}

addExcludedForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const word = newExcludedInput.value.trim();
  if (!word) return;

  try {
    const res = await fetch('/api/config/excluded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    if (res.ok) {
      newExcludedInput.value = '';
    }
  } catch (err) {
    console.error('Erro ao adicionar palavra excluída:', err);
  }
});

async function removeExcluded(word) {
  try {
    await fetch('/api/config/excluded', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
  } catch (err) {
    console.error('Erro ao remover palavra excluída:', err);
  }
}

maxPriceInput.addEventListener('change', updateSettings);
telegramToggle.addEventListener('change', updateSettings);
onlyGroupsToggle.addEventListener('change', updateSettings);

async function updateSettings() {
  const maxPriceLimit = parseFloat(maxPriceInput.value) || 0;
  const telegramEnabled = telegramToggle.checked;
  const onlyGroups = onlyGroupsToggle.checked;

  try {
    await fetch('/api/config/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPriceLimit, telegramEnabled, onlyGroups })
    });
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  }
}

testTelegramBtn.addEventListener('click', async () => {
  telegramStatusMsg.style.display = 'block';
  telegramStatusMsg.textContent = 'Enviando teste...';
  telegramStatusMsg.style.color = '#3b82f6';

  try {
    const res = await fetch('/api/telegram/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      telegramStatusMsg.textContent = '✅ Notificação enviada para o seu Telegram!';
      telegramStatusMsg.style.color = '#10b981';
    } else {
      telegramStatusMsg.textContent = `❌ ${data.error || 'Erro ao enviar. Verifique o .env'}`;
      telegramStatusMsg.style.color = '#ef4444';
    }
  } catch (err) {
    telegramStatusMsg.textContent = '❌ Erro de conexão com o servidor';
    telegramStatusMsg.style.color = '#ef4444';
  }
});

clearDealsBtn.addEventListener('click', async () => {
  if (confirm('Deseja realmente limpar todo o histórico de promoções filtradas?')) {
    await fetch('/api/deals', { method: 'DELETE' });
  }
});

// === MODAL DE SIMULAÇÃO ===
simulateBtn.addEventListener('click', () => {
  simulateModal.classList.add('active');
  simulateResult.style.display = 'none';
  simulateText.value = '';
});

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

function closeModal() {
  simulateModal.classList.remove('active');
}

runSimulateBtn.addEventListener('click', async () => {
  const text = simulateText.value.trim();
  if (!text) return;

  simulateResult.style.display = 'block';
  simulateResult.className = 'simulate-result';
  simulateResult.textContent = 'Analisando mensagem...';

  try {
    const res = await fetch('/api/deals/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageText: text, groupName: 'Grupo Simulação' })
    });
    const data = await res.json();

    if (data.matched) {
      simulateResult.className = 'simulate-result success';
      simulateResult.innerHTML = `
        ✅ <b>OFERTA FILTRADA COM SUCESSO!</b><br>
        • Palavras-Chave: ${data.deal.matchedKeywords.join(', ')}<br>
        • Preço: ${data.deal.priceText}<br>
        • Loja: ${data.deal.store}<br>
        • Link Produto: <a href="${data.deal.link}" target="_blank" style="color:#fff;">${data.deal.link}</a><br>
        ${data.deal.couponLink ? `• Link Cupom: <a href="${data.deal.couponLink}" target="_blank" style="color:#fff;">${data.deal.couponLink}</a>` : ''}
      `;
    } else {
      simulateResult.className = 'simulate-result failed';
      simulateResult.textContent = `❌ ${data.message || 'Não correspondeu ao seu filtro.'}`;
    }
  } catch (err) {
    simulateResult.className = 'simulate-result failed';
    simulateResult.textContent = 'Erro ao processar simulação.';
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}
