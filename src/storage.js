const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DEALS_FILE = path.join(DATA_DIR, 'deals.json');

// Garante que o diretório de dados exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configurações padrão
const defaultConfig = {
  keywords: [
    'iphone',
    'ps5',
    'playstation',
    'rtx',
    'notebook',
    'air fryer',
    'monitor',
    'placa de video',
    'tv 4k',
    'ssd',
    'nintendo switch',
    'smartwatch'
  ],
  excludedWords: [
    'usado',
    'defeito',
    'recondicionado',
    'capinha',
    'pelicula',
    'troca'
  ],
  maxPriceLimit: 0, // 0 = sem limite
  telegramEnabled: true,
  onlyGroups: true, // Filtrar apenas mensagens vindas de grupos
  monitoredGroups: [] // Lista de IDs/nomes de grupos específicos (vazio = todos os grupos)
};

class Storage {
  constructor() {
    this.config = this.loadConfig();
    this.deals = this.loadDeals();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('[Storage] Erro ao carregar config.json:', err.message);
    }
    this.saveConfig(defaultConfig);
    return { ...defaultConfig };
  }

  saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Storage] Erro ao salvar config.json:', err.message);
      return false;
    }
  }

  getConfig() {
    return this.config;
  }

  addKeyword(word) {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord || this.config.keywords.includes(cleanWord)) return false;
    this.config.keywords.push(cleanWord);
    this.saveConfig(this.config);
    return true;
  }

  removeKeyword(word) {
    const cleanWord = word.trim().toLowerCase();
    this.config.keywords = this.config.keywords.filter(w => w !== cleanWord);
    this.saveConfig(this.config);
    return true;
  }

  addExcludedWord(word) {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord || this.config.excludedWords.includes(cleanWord)) return false;
    this.config.excludedWords.push(cleanWord);
    this.saveConfig(this.config);
    return true;
  }

  removeExcludedWord(word) {
    const cleanWord = word.trim().toLowerCase();
    this.config.excludedWords = this.config.excludedWords.filter(w => w !== cleanWord);
    this.saveConfig(this.config);
    return true;
  }

  loadDeals() {
    try {
      if (fs.existsSync(DEALS_FILE)) {
        const raw = fs.readFileSync(DEALS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Storage] Erro ao carregar deals.json:', err.message);
    }
    return [];
  }

  saveDeal(deal) {
    try {
      // Adiciona no início
      this.deals.unshift(deal);
      // Limita o histórico aos 200 mais recentes
      if (this.deals.length > 200) {
        this.deals = this.deals.slice(0, 200);
      }
      fs.writeFileSync(DEALS_FILE, JSON.stringify(this.deals, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Storage] Erro ao salvar deal:', err.message);
      return false;
    }
  }

  getDeals() {
    return this.deals;
  }

  clearDeals() {
    this.deals = [];
    fs.writeFileSync(DEALS_FILE, JSON.stringify([], null, 2), 'utf-8');
    return true;
  }
}

module.exports = new Storage();
