# 🚀 Automação de Filtro de Promoções do WhatsApp (24/7 Online)

Automação inteligente e de alta performance para monitorar mensagens enviadas em **grupos de promoções do WhatsApp**, filtrar automaticamente ofertas de seu interesse (por palavras-chave, marca, modelo e preço) e **enviar alertas instantâneos no seu Telegram** e em um **Dashboard Web em tempo real**.

---

## 🌟 Recursos Principais

- ⚡ **Execução 100% Online & em Segundo Plano (24/7)**: Não precisa manter nada aberto no computador. Escaneie o QR Code uma única vez e o robô roda sozinho.
- 📱 **Notificações Push no Celular via Telegram Bot**: Receba o nome da promoção, o valor em R$ e o **botão com link direto para a loja** (Amazon, Mercado Livre, Magalu, KaBuM!, Shopee, AliExpress, etc.) no seu Telegram.
- 🏷️ **Filtro Inteligente com Sinônimos**: Suporte automático a termos semelhantes (ex: buscar `ps5` encontra `PlayStation 5`, `air fryer` encontra `fritadeira`, etc.).
- 🚫 **Filtro de Falsos Positivos**: Adicione palavras para ignorar ofertas indesejadas (ex: `usado`, `capinha`, `película`, `defeito`).
- 💰 **Limite de Preço Máximo**: Defina um teto de valor em Reais (ex: filtrar apenas ofertas até R$ 3.000).
- 🖥️ **Dashboard Web Futurista (Dark Mode)**: Acesse via navegador no computador ou celular para gerenciar palavras-chave, simular mensagens e ver o histórico de ofertas.

---

## 📁 Estrutura do Projeto

```
whatsapp/
├── public/                 # Interface Web do Dashboard (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/                    # Código Fonte Backend (Node.js)
│   ├── filterEngine.js     # Motor de Inteligência & Filtros de Promoção
│   ├── storage.js          # Persistência de Dados e Histórico (JSON)
│   ├── telegramBot.js      # Integração e Disparo de Alertas no Telegram
│   ├── whatsappClient.js   # Conexão Headless WhatsApp Web (whatsapp-web.js)
│   └── server.js           # Servidor Web Express & Socket.io
├── data/                   # Armazenamento de Configurações e Promoções
├── tests/                  # Testes Unitários Automáticos
│   └── testFilterEngine.js
├── .env.example            # Modelo de Variáveis de Ambiente
├── package.json
└── README.md
```

---

## 🛠️ Passo a Passo para Execução Local

### 1. Requisitos
- Node.js instalado (versão 18+ recomendada)

### 2. Instalação das Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```

### 3. Configuração do Telegram Bot (Opcional, mas Recomendado)
1. No Telegram, procure por **`@BotFather`** e envie o comando `/newbot`.
2. Siga as instruções para criar o bot e copie o **HTTP API Token** gerado.
3. Abra o bot **`@userinfobot`** no Telegram para descobrir o seu **ID numérico do chat**.
4. Crie ou edite o arquivo `.env` na raiz do projeto com as suas credenciais:
   ```env
   PORT=3000
   HEADLESS=true
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   TELEGRAM_CHAT_ID=seu_chat_id_aqui
   ```

### 4. Executando o Servidor
```bash
npm start
```

### 5. Pareando o WhatsApp
1. Abra no seu navegador o endereço: `http://localhost:3000`
2. No seu celular, abra o **WhatsApp** &gt; menu de 3 pontos &gt; **Aparelhos Conectados** &gt; **Conectar um Aparelho**.
3. Escaneie o QR Code exibido na tela (ou no terminal).
4. Pronto! O status mudará para **`WhatsApp 24/7 Conectado`**. O login fica salvo permanentemente na pasta `.wwebjs_auth`.

---

## 🌐 Como Rodar 100% Online na Nuvem (Deploy 24/7 Gratuito)

Para manter o robô rodando **24 horas por dia sem depender do seu computador**, você pode hospedá-lo gratuitamente em plataformas como **Render**, **Railway**, **Fly.io** ou em uma VPS:

### Opção A: Deploy no Render.com (Gratuito)
1. Faça upload deste projeto para o seu repositório no GitHub.
2. Acesse [Render.com](https://render.com) e crie um novo **Web Service**.
3. Conecte seu repositório do GitHub.
4. Defina o comando de build: `npm install`
5. Defina o comando de início: `npm start`
6. Adicione as variáveis de ambiente (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HEADLESS=true`).
7. Após a inicialização, acesse a URL gerada pelo Render para escanear o QR Code pelo navegador!

### Opção B: Rodar em Segundo Plano no Seu Computador com PM2
Se preferir rodar no seu próprio PC sem abrir janelas:
```bash
npm install -g pm2
pm2 start src/server.js --name "whatsapp-deals"
pm2 save
```
O serviço rodará em segundo plano de forma totalmente invisível.

---

## 🧪 Testando os Filtros
Você pode testar a lógica dos filtros sem precisar esperar uma mensagem real nos seus grupos:
1. Abra o Dashboard Web (`http://localhost:3000`).
2. Clique no botão **`Simular Mensagem`**.
3. Cole o texto de uma promoção e clique em **`Testar Filtro`**.

Ou execute o script de testes automatizados via terminal:
```bash
npm test
```

---

## 📜 Licença
Licença MIT - Antigravity AI
