/**
 * Bot WhatsApp Simples - Cozil
 * Usa Baileys diretamente, sem Evolution API
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuração
const SHEET_ID = '15K5WzKZYYKzjurApRX2aAepMcRqrpanj8a4oyp56rW4';
const API_KEY = 'AIzaSyAmBJ_fvl3s0h94P0kOEIUSUOPv0b1U18g';
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Busca produto na planilha
 */
async function buscarProduto(codigo) {
  try {
    const range = 'Dados!A1:Z10000';
    const url = `${BASE_URL}/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const response = await axios.get(url);
    
    if (!response.data.values || response.data.values.length === 0) {
      return null;
    }

    const headers = response.data.values[0];
    const rows = response.data.values.slice(1);

    const dados = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const codigoStr = String(codigo).trim();
    const codigoNum = parseInt(codigoStr);
    
    const resultado = dados.find(row => {
      const produto = String(row.PRODUTO || '').trim();
      const numeroSC = String(row.NUMERO_SC || '').trim();
      const item = String(row.ITEM || '').trim();
      const numeroPC = String(row.NUMERO_PC || '').trim();
      
      if (produto === codigoStr || numeroSC === codigoStr || 
          item === codigoStr || numeroPC === codigoStr) {
        return true;
      }
      
      if (!isNaN(codigoNum)) {
        const produtoNum = parseInt(produto.replace(/^0+/, '')) || 0;
        const numeroSCNum = parseInt(numeroSC.replace(/^0+/, '')) || 0;
        const itemNum = parseInt(item.replace(/^0+/, '')) || 0;
        const numeroPCNum = parseInt(numeroPC.replace(/^0+/, '')) || 0;
        
        if (produtoNum === codigoNum || numeroSCNum === codigoNum || 
            itemNum === codigoNum || numeroPCNum === codigoNum) {
          return true;
        }
      }
      
      return false;
    });

    return resultado || null;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

/**
 * Formata resposta do produto
 */
function formatarResposta(produto) {
  const status = String(produto.STATUS || '').trim();
  const diasAtraso = parseInt(produto.DIAS_ATRASO || 0);
  const dataEntrega = produto.DATA_ENTREGA || 'Não informado';
  const dataEmissao = produto.DATA_EMISSAO || 'Não informado';
  const valorTotal = formatarMoeda(produto.VALOR_TOTAL || 0);
  const fornecedor = produto.FORNECEDOR || produto.RAZAO_SOCIAL || 'Não informado';
  const comprador = produto.COMPRADOR || 'Não informado';
  
  let statusEmoji = '✅';
  let statusText = 'OK';
  
  if (status === 'ATRASADO' || diasAtraso > 0) {
    statusEmoji = '🔴';
    statusText = 'ATRASADO';
  }
  
  let resposta = `📦 *Consulta de Produto*\n\n`;
  resposta += `🔢 *Código:* ${produto.NUMERO_PC || produto.PRODUTO || 'N/A'}\n`;
  resposta += `📋 *Produto:* ${produto.PRODUTO || 'Não informado'}\n`;
  resposta += `📊 *Status:* ${statusEmoji} ${statusText}\n`;
  
  if (diasAtraso > 0) {
    resposta += `⏰ *Dias de Atraso:* ${diasAtraso} dias\n`;
  }
  
  resposta += `📅 *Data Emissão:* ${dataEmissao}\n`;
  resposta += `📅 *Data Entrega:* ${dataEntrega}\n`;
  resposta += `🏢 *Fornecedor:* ${fornecedor}\n`;
  resposta += `👤 *Comprador:* ${comprador}\n`;
  resposta += `💰 *Valor Total:* ${valorTotal}\n`;
  
  if (produto.DESCRICAO) {
    resposta += `\n📝 *Descrição:* ${String(produto.DESCRICAO).substring(0, 100)}${String(produto.DESCRICAO).length > 100 ? '...' : ''}`;
  }
  
  return resposta;
}

/**
 * Formata valor em moeda
 */
function formatarMoeda(value) {
  if (!value || value === 0) return 'R$ 0,00';
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) 
    : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
}

/**
 * Inicializa o bot
 */
async function iniciarBot() {
  const authDir = path.join(__dirname, 'auth_info');
  
  // Cria diretório de autenticação se não existir
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Cozil Bot', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada devido a', lastDisconnect?.error, ', reconectando', shouldReconnect);
      
      if (shouldReconnect) {
        iniciarBot();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    
    if (!message.key.fromMe && message.message) {
      const texto = message.message.conversation || 
                   message.message.extendedTextMessage?.text || 
                   '';
      
      if (texto.trim()) {
        const remetente = message.key.remoteJid;
        const codigo = texto.trim();
        
        console.log(`📨 Mensagem recebida de ${remetente}: ${codigo}`);
        
        // Verifica se é um código numérico
        if (!/^\d+$/.test(codigo)) {
          await sock.sendMessage(remetente, { 
            text: '❌ Por favor, envie apenas o código numérico do produto.\n\nExemplo: 11772' 
          });
          return;
        }
        
        // Busca o produto
        const produto = await buscarProduto(codigo);
        
        if (!produto) {
          await sock.sendMessage(remetente, { 
            text: `❌ Produto com código *${codigo}* não encontrado na planilha.\n\nVerifique o código e tente novamente.` 
          });
          return;
        }
        
        // Envia resposta formatada
        const resposta = formatarResposta(produto);
        await sock.sendMessage(remetente, { text: resposta });
      }
    }
  });
}

// Cria servidor HTTP simples para o Render não reclamar
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot WhatsApp Cozil está rodando!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// Inicia o bot
console.log('🚀 Iniciando bot WhatsApp...');
iniciarBot().catch(err => {
  console.error('Erro ao iniciar bot:', err);
  process.exit(1);
});

