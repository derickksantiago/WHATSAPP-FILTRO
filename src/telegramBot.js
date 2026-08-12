const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
  constructor() {
    this.bot = null;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.init();
  }

  init() {
    if (this.botToken && this.botToken !== 'seu_token_do_botfather_aqui') {
      try {
        this.bot = new TelegramBot(this.botToken, { polling: false });
        console.log('[TelegramBot] Inicializado com sucesso!');
      } catch (err) {
        console.error('[TelegramBot] Erro ao inicializar bot:', err.message);
        this.bot = null;
      }
    } else {
      console.log('[TelegramBot] Token não configurado no .env. Notificações Telegram desativadas por padrão.');
    }
  }

  isConfigured() {
    return !!(this.bot && this.chatId && this.chatId !== 'seu_chat_id_aqui');
  }

  async sendDealNotification(deal) {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const keywordsTag = deal.matchedKeywords.map(k => `#${k.replace(/\s+/g, '_')}`).join(' ');

      let messageHtml = `🔥 <b>PROMOÇÃO ENCONTRADA!</b> 🔥\n\n`;
      messageHtml += `📦 <b>Produto:</b> ${this.escapeHtml(deal.title)}\n`;
      messageHtml += `💰 <b>Preço:</b> <code>${this.escapeHtml(deal.priceText)}</code>\n`;
      messageHtml += `🏪 <b>Loja:</b> ${deal.store}\n`;
      messageHtml += `👥 <b>Origem:</b> ${this.escapeHtml(deal.groupName)}\n`;
      messageHtml += `🎯 <b>Filtros:</b> ${keywordsTag}\n\n`;

      if (deal.link) {
        messageHtml += `🛒 <a href="${deal.link}"><b>LINK DO PRODUTO</b></a>\n`;
      }
      if (deal.couponLink && deal.couponLink !== deal.link) {
        messageHtml += `🎟️ <a href="${deal.couponLink}"><b>LINK DO CUPOM</b></a>\n`;
      }

      const options = {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };

      // Adiciona botões interativos
      const buttons = [];
      if (deal.link) {
        buttons.push({ text: '🛍️ Abrir Produto', url: deal.link });
      }
      if (deal.couponLink && deal.couponLink !== deal.link) {
        buttons.push({ text: '🎟️ Resgatar Cupom', url: deal.couponLink });
      }

      if (buttons.length > 0) {
        options.reply_markup = {
          inline_keyboard: [buttons]
        };
      }

      await this.bot.sendMessage(this.chatId, messageHtml, options);
      console.log(`[TelegramBot] Notificação enviada para o chat ${this.chatId}`);
      return true;
    } catch (err) {
      console.error('[TelegramBot] Erro ao enviar notificação:', err.message);
      return false;
    }
  }

  async sendTestNotification() {
    if (!this.isConfigured()) {
      throw new Error('Telegram BotToken ou ChatID não estão configurados no arquivo .env!');
    }

    const testMessage = `✅ <b>TESTE DE INTEGRAÇÃO TELEGRAM</b> ✅\n\nSua automação de filtro de promoções do WhatsApp está pronta para enviar alertas 24/7 neste chat!`;
    await this.bot.sendMessage(this.chatId, testMessage, { parse_mode: 'HTML' });
    return true;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

module.exports = new TelegramNotifier();
