require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const storage = require('./storage');
const filterEngine = require('./filterEngine');
const telegramBot = require('./telegramBot');
const whatsappManager = require('./whatsappClient');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Injeta o Socket.io no gerenciador do WhatsApp
whatsappManager.setSocketIO(io);

// === REST API ENDPOINTS ===

// Retorna o status atual do WhatsApp e estatísticas
app.get('/api/status', (req, res) => {
  res.json(whatsappManager.getStatus());
});

// Retorna as configurações atuais (palavras-chave, ignoradas, etc.)
app.get('/api/config', (req, res) => {
  res.json(storage.getConfig());
});

// Adiciona uma nova palavra-chave de interesse
app.post('/api/config/keywords', (req, res) => {
  const { keyword } = req.body;
  if (!keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'Palavra-chave inválida' });
  }

  const added = storage.addKeyword(keyword);
  if (added) {
    io.emit('config_updated', storage.getConfig());
    return res.json({ success: true, config: storage.getConfig() });
  } else {
    return res.status(400).json({ error: 'Palavra-chave já existe ou é inválida' });
  }
});

// Remove uma palavra-chave
app.delete('/api/config/keywords', (req, res) => {
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Palavra-chave não informada' });
  }

  storage.removeKeyword(keyword);
  io.emit('config_updated', storage.getConfig());
  return res.json({ success: true, config: storage.getConfig() });
});

// Adiciona palavra a ignorar
app.post('/api/config/excluded', (req, res) => {
  const { word } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Palavra inválida' });
  }

  const added = storage.addExcludedWord(word);
  if (added) {
    io.emit('config_updated', storage.getConfig());
    return res.json({ success: true, config: storage.getConfig() });
  } else {
    return res.status(400).json({ error: 'Palavra já existe ou é inválida' });
  }
});

// Remove palavra a ignorar
app.delete('/api/config/excluded', (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'Palavra não informada' });
  }

  storage.removeExcludedWord(word);
  io.emit('config_updated', storage.getConfig());
  return res.json({ success: true, config: storage.getConfig() });
});

// Atualiza configurações gerais (limite de preço, telegramEnabled, etc.)
app.post('/api/config/settings', (req, res) => {
  const { maxPriceLimit, telegramEnabled, onlyGroups } = req.body;
  
  const current = storage.getConfig();
  const updatedConfig = {
    ...current,
    maxPriceLimit: typeof maxPriceLimit === 'number' ? maxPriceLimit : current.maxPriceLimit,
    telegramEnabled: typeof telegramEnabled === 'boolean' ? telegramEnabled : current.telegramEnabled,
    onlyGroups: typeof onlyGroups === 'boolean' ? onlyGroups : current.onlyGroups
  };

  storage.saveConfig(updatedConfig);
  io.emit('config_updated', updatedConfig);
  return res.json({ success: true, config: updatedConfig });
});

// Retorna histórico de promoções filtradas
app.get('/api/deals', (req, res) => {
  res.json(storage.getDeals());
});

// Limpa o histórico de promoções
app.delete('/api/deals', (req, res) => {
  storage.clearDeals();
  io.emit('deals_cleared');
  res.json({ success: true });
});

// Dispara um teste de notificação do Telegram
app.post('/api/telegram/test', async (req, res) => {
  try {
    await telegramBot.sendTestNotification();
    res.json({ success: true, message: 'Notificação de teste enviada com sucesso no Telegram!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simula uma mensagem de teste para verificar se o filtro funciona
app.post('/api/deals/simulate', async (req, res) => {
  const { messageText, groupName } = req.body;
  if (!messageText) {
    return res.status(400).json({ error: 'Insira o texto da mensagem para simular' });
  }

  const config = storage.getConfig();
  const deal = filterEngine.analyzeMessage(
    messageText,
    config,
    groupName || 'Grupo Teste',
    'Remetente Teste'
  );

  if (deal) {
    storage.saveDeal(deal);
    io.emit('new_deal', deal);

    if (config.telegramEnabled) {
      telegramBot.sendDealNotification(deal).catch(console.error);
    }
    return res.json({ matched: true, deal });
  } else {
    return res.json({ matched: false, message: 'Mensagem não corresponde a nenhuma palavra-chave ativa ou contém palavra excluída.' });
  }
});

// WebSocket Events
io.on('connection', (socket) => {
  console.log('[Dashboard] Novo cliente conectado ao WebSocket:', socket.id);

  // Envia estado inicial assim que conecta
  socket.emit('status_change', whatsappManager.getStatus());
  socket.emit('config_updated', storage.getConfig());
  socket.emit('initial_deals', storage.getDeals());

  socket.on('disconnect', () => {
    console.log('[Dashboard] Cliente desconectado:', socket.id);
  });
});

// Inicialização do Servidor HTTP
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVIDOR RODANDO ONLINE EM: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Inicializa o cliente do WhatsApp
  whatsappManager.init();
});
