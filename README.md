# 🤖 Bot WhatsApp Simples - Cozil

Bot WhatsApp direto usando Baileys, sem Evolution API. Muito mais simples de configurar!

## 🚀 Como usar

### Opção 1: Rodar Localmente (Recomendado para testar)

1. **Instale Node.js** (se não tiver)

2. **Abra o terminal na pasta `whatsapp-bot-simples`**

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Execute o bot:**
   ```bash
   npm start
   ```

5. **Escaneie o QR Code** que aparecerá no terminal com seu WhatsApp

6. **Pronto!** Agora é só enviar códigos de produtos para o número conectado

### Opção 2: Deploy no Render

1. **Crie um repositório no GitHub** e faça upload da pasta `whatsapp-bot-simples`

2. **No Render:**
   - Clique em "Novo" → "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Name:** `cozil-bot-simples`
     - **Build Command:** `cd whatsapp-bot-simples && npm install`
     - **Start Command:** `cd whatsapp-bot-simples && npm start`
     - **Plan:** Free
   
3. **Aguarde o deploy**

4. **Veja os logs** e escaneie o QR Code que aparecer

## 📱 Como usar o bot

1. Envie uma mensagem para o número conectado
2. Digite apenas o código do produto (ex: `11772`)
3. Receba automaticamente todas as informações!

## ⚠️ Importante

- O QR Code aparece nos logs do Render
- Você precisa escanear apenas uma vez
- O bot funciona 24/7 enquanto o serviço estiver rodando
- Os dados de autenticação ficam salvos na pasta `auth_info`

## 🐛 Problemas?

- Se o bot desconectar, ele reconecta automaticamente
- Se o QR Code expirar, reinicie o serviço no Render

