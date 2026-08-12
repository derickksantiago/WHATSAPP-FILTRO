const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs');
const storage = require('./storage');
const filterEngine = require('./filterEngine');
const telegramBot = require('./telegramBot');

// Detecta o caminho do Chromium automaticamente
function findChromiumPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      console.log(`[WhatsApp] Chromium encontrado em: ${p}`);
      return p;
    }
  }
  console.warn('[WhatsApp] Chromium não encontrado nos caminhos padrão. Usando padrão do Puppeteer.');
  return undefined;
}

class WhatsAppManager {
  constructor() {
    this.client = null;
    this.qrCodeData = null;
    this.status = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, AUTHENTICATED, READY
    this.io = null;
    this.stats = {
      messagesProcessed: 0,
      dealsMatched: 0,
      startTime: new Date()
    };
  }

  setSocketIO(io) {
    this.io = io;
  }

  init() {
    console.log('[WhatsApp] Inicializando cliente WhatsApp Web...');
    this.status = 'INITIALIZING';
    this.emitStatus();

    const isHeadless = process.env.HEADLESS !== 'false';
    const executablePath = findChromiumPath();

    const puppeteerConfig = {
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--window-size=1280,720',
        '--hide-scrollbars',
        '--mute-audio'
      ]
    };

    if (executablePath) {
      puppeteerConfig.executablePath = executablePath;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-deals-session',
        dataPath: '/usr/src/app/.wwebjs_auth'
      }),
      puppeteer: puppeteerConfig
    });

    // Evento de QR Code gerado
    this.client.on('qr', (qr) => {
      console.log('\n[WhatsApp] Novo QR Code gerado! Escaneie pelo celular:');
      qrcodeTerminal.generate(qr, { small: true });
      
      this.qrCodeData = qr;
      this.status = 'QR_READY';
      this.emitStatus();

      if (this.io) {
        this.io.emit('qr_code', { qr });
      }
    });

    // Evento de Autenticação com Sucesso
    this.client.on('authenticated', () => {
      console.log('[WhatsApp] Autenticado com sucesso!');
      this.status = 'AUTHENTICATED';
      this.qrCodeData = null;
      this.emitStatus();
    });

    // Evento de Falha de Autenticação
    this.client.on('auth_failure', (msg) => {
      console.error('[WhatsApp] Falha na autenticação:', msg);
      this.status = 'DISCONNECTED';
      this.emitStatus();
    });

    // Evento de Cliente Pronto para Uso
    this.client.on('ready', () => {
      console.log('[WhatsApp] Cliente está PRONTO e escutando grupos!');
      this.status = 'READY';
      this.qrCodeData = null;
      this.emitStatus();
    });

    // Evento de Desconexão
    this.client.on('disconnected', (reason) => {
      console.log('[WhatsApp] Cliente desconectado. Motivo:', reason);
      this.status = 'DISCONNECTED';
      this.emitStatus();
      this.retryInit(15000);
    });

    // Evento Principal: Mensagem Recebida
    this.client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (err) {
        console.error('[WhatsApp] Erro ao processar mensagem recebida:', err.message);
      }
    });

    this.client.initialize().catch(err => {
      console.error('[WhatsApp] Erro ao inicializar cliente:', err.message);
      this.status = 'DISCONNECTED';
      this.emitStatus();
      // Tenta novamente em 30 segundos após erro de inicialização
      this.retryInit(30000);
    });
  }

  retryInit(delayMs = 15000) {
    if (this._retryTimer) return; // Já existe um retry agendado
    console.log(`[WhatsApp] Tentando reconectar em ${delayMs / 1000}s...`);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this.init();
    }, delayMs);
  }

  async handleIncomingMessage(message) {

    this.stats.messagesProcessed++;
    if (this.io) {
      this.io.emit('stats_update', this.stats);
    }

    const config = storage.getConfig();

    // Se a opção de ignorar mensagens privadas estiver ativa
    const isGroupMsg = message.from.endsWith('@g.us');
    if (config.onlyGroups && !isGroupMsg) {
      return;
    }

    // Busca detalhes do chat (nome do grupo e remetente)
    let groupName = 'Mensagem Privada';
    let senderName = 'Contato';

    try {
      const chat = await message.getChat();
      if (chat.isGroup) {
        groupName = chat.name || 'Grupo WhatsApp';

        // Se houver filtro de grupos específicos
        if (config.monitoredGroups && config.monitoredGroups.length > 0) {
          const matchedGroup = config.monitoredGroups.some(g => 
            chat.id._serialized === g || chat.name.toLowerCase().includes(g.toLowerCase())
          );
          if (!matchedGroup) return; // Ignora grupo não monitorado
        }
      }

      const contact = await message.getContact();
      senderName = contact.pushname || contact.name || contact.number || 'Integrante';
    } catch (e) {
      // Ignora falha de metadados se a mensagem existir
    }

    const rawText = message.body;

    // Analisa a mensagem com o motor de filtro
    const deal = filterEngine.analyzeMessage(rawText, config, groupName, senderName);

    if (deal) {
      this.stats.dealsMatched++;
      console.log(`\n🎉 [FILTRO] Oferta Encontrada! [${deal.matchedKeywords.join(', ')}] em "${groupName}"`);
      console.log(`   Produto: ${deal.title}`);
      console.log(`   Preço: ${deal.priceText}`);
      console.log(`   Link: ${deal.link || 'Nenhum link encontrado'}\n`);

      // 1. Salva no histórico
      storage.saveDeal(deal);

      // 2. Transmite via Socket.io para o Dashboard em tempo real
      if (this.io) {
        this.io.emit('new_deal', deal);
        this.io.emit('stats_update', this.stats);
      }

      // 3. Envia Notificação no Telegram se ativado
      if (config.telegramEnabled) {
        telegramBot.sendDealNotification(deal).catch(err => {
          console.error('[WhatsApp] Falha no disparo do Telegram:', err.message);
        });
      }
    }
  }

  emitStatus() {
    if (this.io) {
      this.io.emit('status_change', {
        status: this.status,
        qrCode: this.qrCodeData,
        stats: this.stats
      });
    }
  }

  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCodeData,
      stats: this.stats
    };
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.logout();
        this.status = 'DISCONNECTED';
        this.emitStatus();
      } catch (e) {
        console.error('[WhatsApp] Erro ao fazer logout:', e.message);
      }
    }
  }
}

module.exports = new WhatsAppManager();
