const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER - DEVE ESSERE PRIMA DI TUTTO
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Variabile globale per il bot
let bot = null;

// Health check endpoints OBBLIGATORI per Render
app.get('/', (req, res) => {
    res.json({ 
        status: '🤖 TON Conservative Bot Running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0',
        message: 'Bot is operational on Render'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Conservative Bot',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            isRunning: bot.isRunning || false,
            positions: bot.positions ? bot.positions.size : 0,
            scanCount: bot.scanCount || 0,
            totalTrades: bot.stats.totalTrades || 0,
            totalPnL: bot.stats.totalPnL ? bot.stats.totalPnL.toFixed(4) : '0.0000',
            dailyPnL: bot.stats.dailyPnL ? bot.stats.dailyPnL.toFixed(4) : '0.0000',
            winRate: bot.getWinRate ? bot.getWinRate() : 0
        });
    } else {
        res.json({ 
            status: 'initializing',
            message: 'Bot is starting up...',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/bot/start', (req, res) => {
    if (bot && !bot.isRunning) {
        bot.start();
        res.json({ message: 'Bot started via API' });
    } else if (bot && bot.isRunning) {
        res.json({ message: 'Bot already running' });
    } else {
        res.json({ message: 'Bot not initialized yet' });
    }
});

app.get('/bot/stop', (req, res) => {
    if (bot && bot.isRunning) {
        bot.stop();
        res.json({ message: 'Bot stopped via API' });
    } else {
        res.json({ message: 'Bot not running' });
    }
});

// Avvia server Express IMMEDIATAMENTE
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log('✅ Render può ora rilevare il servizio');
});

// =============================================================================
// BOT CLASS - IL TUO CODICE CONSERVATIVO
// =============================================================================

class ConservativeTONBot {
    constructor(config) {
        this.config = config;
        this.client = new TonClient({
            endpoint: config.endpoint || 'https://toncenter.com/api/v2/jsonRPC'
        });
        this.wallet = null;
        this.isRunning = false;
        this.positions = new Map();
        this.scanCount = 0;
        
        // TELEGRAM BOT SETUP
        this.telegram = null;
        this.telegramChatId = null;
        this.setupTelegram();
        
        // STATISTICHE REALISTICHE
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            totalPnL: 0,
            maxDrawdown: 0,
            currentDrawdown: 0,
            dailyPnL: 0,
            startBalance: 0,
            dayStartPnL: 0,
            lastResetDate: new Date().toDateString()
        };
        
        // BLACKLIST TOKEN PROBLEMATICI
        this.tokenBlacklist = new Set();
        this.suspiciousPatterns = new Set();
        
        // WHITELIST DEX AFFIDABILI
        this.trustedDEXs = new Set(['DeDust', 'STON.fi']);
        
        console.log('🛡️ Conservative TON Bot inizializzato');
        console.log('💡 Focus: Preservazione capitale + piccoli profitti consistenti');
        
        // Invia notifica di avvio
        this.notify('🤖 TON Conservative Bot inizializzato su Render\n💡 Modalità: Preservazione capitale', 'startup');
    }

    setupTelegram() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (botToken && chatId) {
            try {
                this.telegram = new TelegramBot(botToken, { polling: true });
                this.telegramChatId = chatId;
                console.log('📱 Telegram notifications abilitato');
                
                // Setup comandi Telegram
                this.setupTelegramCommands();
                
            } catch (error) {
                console.warn('⚠️ Errore setup Telegram:', error.message);
            }
        } else {
            console.log('📱 Telegram non configurato - Aggiungi TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID');
        }
    }

    setupTelegramCommands() {
        if (!this.telegram) return;
        
        // Comandi disponibili
        this.telegram.onText(/\/status/, (msg) => {
            this.handleTelegramCommand('status', msg);
        });
        
        this.telegram.onText(/\/stats/, (msg) => {
            this.handleTelegramCommand('stats', msg);
        });
        
        this.telegram.onText(/\/positions/, (msg) => {
            this.handleTelegramCommand('positions', msg);
        });
        
        this.telegram.onText(/\/stop/, (msg) => {
            this.handleTelegramCommand('stop', msg);
        });
        
        this.telegram.onText(/\/start/, (msg) => {
            this.handleTelegramCommand('start', msg);
        });
        
        this.telegram.onText(/\/help/, (msg) => {
            this.handleTelegramCommand('help', msg);
        });
        
        console.log('📱 Comandi Telegram configurati');
    }

    async handleTelegramCommand(command, msg) {
        const chatId = msg.chat.id;
        
        // Verifica autorizzazione
        if (chatId.toString() !== this.telegramChatId.toString()) {
            await this.telegram.sendMessage(chatId, '❌ Non autorizzato');
            return;
        }
        
        try {
            switch (command) {
                case 'status':
                    await this.sendBotStatus(chatId);
                    break;
                    
                case 'stats':
                    await this.sendDetailedStats(chatId);
                    break;
                    
                case 'positions':
                    await this.sendPositions(chatId);
                    break;
                    
                case 'stop':
                    this.stop();
                    await this.telegram.sendMessage(chatId, '🛑 Bot fermato');
                    break;
                    
                case 'start':
                    if (!this.isRunning) {
                        this.start();
                        await this.telegram.sendMessage(chatId, '🚀 Bot riavviato');
                    } else {
                        await this.telegram.sendMessage(chatId, '⚠️ Bot già in esecuzione');
                    }
                    break;
                    
                case 'help':
                    await this.sendHelpMessage(chatId);
                    break;
            }
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore: ${error.message}`);
        }
    }

    async sendBotStatus(chatId) {
        const uptime = this.getUptime();
        const status = this.isRunning ? '🟢 Attivo' : '🔴 Fermo';
        
        const message = `
🤖 *TON Conservative Bot Status*

${status} | ⏱️ Uptime: ${uptime}
🌐 Deploy: Render Cloud
📊 Scansioni: ${this.scanCount}
📈 Posizioni aperte: ${this.positions.size}
💰 P&L oggi: ${this.stats.dailyPnL.toFixed(4)} TON
📊 Total P&L: ${this.stats.totalPnL.toFixed(4)} TON
🎯 Win Rate: ${this.getWinRate()}%
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendDetailedStats(chatId) {
        const balance = await this.getWalletBalance();
        const drawdown = ((this.stats.currentDrawdown / this.stats.startBalance) * 100).toFixed(2);
        
        const message = `
📊 *Statistiche Dettagliate*

💰 *Wallet:*
Balance: ${balance.toFixed(4)} TON
Start Balance: ${this.stats.startBalance.toFixed(4)} TON

📈 *Trading:*
Total Trades: ${this.stats.totalTrades}
Winning Trades: ${this.stats.winningTrades}
Win Rate: ${this.getWinRate()}%

💸 *P&L:*
Daily P&L: ${this.stats.dailyPnL.toFixed(4)} TON
Total P&L: ${this.stats.totalPnL.toFixed(4)} TON
Max Drawdown: ${drawdown}%

⏰ *Timing:*
Ultimo reset: ${this.stats.lastResetDate}
Prossimo reset: ${this.getNextResetTime()}
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendPositions(chatId) {
        if (this.positions.size === 0) {
            await this.telegram.sendMessage(chatId, '📭 Nessuna posizione aperta');
            return;
        }
        
        let message = '📈 *Posizioni Aperte:*\n\n';
        
        for (const [address, position] of this.positions) {
            const timeHeld = this.formatTime(Date.now() - position.entryTime);
            const currentPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.2); // Mock
            const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
            const pnlIcon = pnl > 0 ? '📈' : '📉';
            
            message += `${pnlIcon} *${position.symbol}*\n`;
            message += `Amount: ${position.amount.toFixed(4)} TON\n`;
            message += `P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`;
            message += `Time: ${timeHeld}\n`;
            message += `Confidence: ${position.confidence}%\n\n`;
        }
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendHelpMessage(chatId) {
        const message = `
🤖 *TON Conservative Bot Commands*

/status - Status generale del bot
/stats - Statistiche dettagliate
/positions - Posizioni aperte
/stop - Ferma il bot
/start - Riavvia il bot (se fermo)
/help - Questo messaggio

🔔 *Notifiche Automatiche:*
• Nuovi trade aperti/chiusi
• Raggiungimento stop loss/take profit
• Aggiornamenti P&L significativi
• Alert di sicurezza

📊 *Modalità Conservativa:*
• Stop Loss: -${Math.abs(this.config.conservative.stopLossPercent)}%
• Take Profit: +${this.config.conservative.takeProfitPercent}%
• Max Trade Size: ${this.config.conservative.maxTradeSize} TON
• Min Confidence: ${this.config.conservative.minConfidenceScore}%

🌐 *Deploy su Render Cloud*
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async notify(message, type = 'info', silent = false) {
        console.log(`📱 ${message}`);
        
        if (!this.telegram || !this.telegramChatId) return;
        
        try {
            // Emoji per tipo di notifica
            let emoji = '';
            switch (type) {
                case 'trade':
                    emoji = '💰';
                    break;
                case 'profit':
                    emoji = '📈';
                    break;
                case 'loss':
                    emoji = '📉';
                    break;
                case 'warning':
                    emoji = '⚠️';
                    break;
                case 'error':
                    emoji = '❌';
                    break;
                case 'success':
                    emoji = '✅';
                    break;
                case 'startup':
                    emoji = '🚀';
                    break;
                default:
                    emoji = 'ℹ️';
            }
            
            const timestamp = new Date().toLocaleTimeString('it-IT');
            const fullMessage = `${emoji} *[${timestamp}]*\n${message}`;
            
            await this.telegram.sendMessage(
                this.telegramChatId, 
                fullMessage, 
                { 
                    parse_mode: 'Markdown',
                    disable_notification: silent 
                }
            );
            
        } catch (error) {
            console.warn('⚠️ Errore invio notifica Telegram:', error.message);
        }
    }

    async notifyTrade(action, position, pnl = null) {
        let message = '';
        let type = 'trade';
        
        if (action === 'buy') {
            message = `
🛒 *ACQUISTO*
Token: ${position.symbol}
Amount: ${position.amount.toFixed(4)} TON
Confidence: ${position.confidence}%
DEX: ${position.dex}
Stop Loss: ${position.stopLoss.toFixed(1)}%
Take Profit: ${position.takeProfit.toFixed(1)}%
            `.trim();
        } else if (action === 'sell') {
            const pnlPercent = (pnl / position.amount) * 100;
            type = pnlPercent > 0 ? 'profit' : 'loss';
            const pnlIcon = pnlPercent > 0 ? '📈' : '📉';
            
            message = `
${pnlIcon} *VENDITA*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
Time Held: ${this.formatTime(Date.now() - position.entryTime)}
Motivo: ${action === 'stop_loss' ? 'Stop Loss' : action === 'take_profit' ? 'Take Profit' : 'Exit'}
            `.trim();
        }
        
        await this.notify(message, type);
    }

    // Metodi di utilità per Telegram
    getUptime() {
        if (!this.startTime) return '0s';
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    getWinRate() {
        if (this.stats.totalTrades === 0) return 0;
        return Math.round((this.stats.winningTrades / this.stats.totalTrades) * 100);
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    async initialize() {
        try {
            const mnemonicString = process.env.MNEMONIC_WORDS;
            const mnemonic = mnemonicString ? mnemonicString.split(',').map(word => word.trim()) : this.config.mnemonic;
            
            if (!mnemonic || mnemonic.length !== 24) {
                throw new Error('Mnemonic non configurato o non valido (servono 24 parole)');
            }
            
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            this.wallet = WalletContractV4.create({ 
                publicKey: keyPair.publicKey, 
                workchain: 0 
            });
            
            const contract = this.client.open(this.wallet);
            const balance = await contract.getBalance();
            this.stats.startBalance = Number(balance) / 1000000000;
            
            console.log('🏦 TON Wallet inizializzato');
            console.log(`📍 Address: ${this.wallet.address.toString()}`);
            console.log(`💰 Balance: ${this.formatTON(balance)} TON`);
            
            // VERIFICA BALANCE MINIMO
            if (this.stats.startBalance < this.config.conservative.minStartBalance) {
                console.warn(`⚠️ Balance basso: ${this.stats.startBalance} TON (minimo consigliato: ${this.config.conservative.minStartBalance} TON)`);
            }
            
            // Notifica Telegram di successo
            await this.notify(`
🏦 *Wallet Inizializzato*
Address: \`${this.wallet.address.toString()}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ✅ Pronto per trading
Deploy: 🌐 Render Cloud
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚀 Conservative Bot avviato su Render...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            await this.notify('❌ Avvio fallito: impossibile inizializzare wallet', 'error');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        console.log('📊 Configurazione Conservativa:');
        console.log(`- Budget per trade: ${this.config.conservative.maxTradeSize} TON`);
        console.log(`- Stop loss: ${this.config.conservative.stopLossPercent}%`);
        console.log(`- Take profit: ${this.config.conservative.takeProfitPercent}%`);
        console.log(`- Max perdita giornaliera: ${this.config.conservative.maxDailyLoss} TON`);
        console.log(`- Confidence score minimo: ${this.config.conservative.minConfidenceScore}%`);
        console.log('=' .repeat(60));
        
        // Notifica Telegram di avvio
        await this.notify(`
🚀 *Bot Avviato su Render*

📊 *Configurazione Conservativa:*
• Max Trade: ${this.config.conservative.maxTradeSize} TON
• Stop Loss: ${this.config.conservative.stopLossPercent}%
• Take Profit: ${this.config.conservative.takeProfitPercent}%
• Max Loss/Day: ${this.config.conservative.maxDailyLoss} TON
• Min Confidence: ${this.config.conservative.minConfidenceScore}%

🎯 Modalità: Preservazione capitale
🌐 Cloud: Render (24/7)
        `, 'startup');
        
        // Avvia trading (versione semplificata per demo)
        this.startSimulatedTrading();
    }

    // Versione semplificata per demo e test
    async startSimulatedTrading() {
        console.log('📊 Avvio simulazione trading...');
        
        const tradingInterval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(tradingInterval);
                return;
            }
            
            this.scanCount++;
            console.log(`🔍 Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
            
            // Simula trovare token occasionalmente
            if (Math.random() > 0.7) {
                console.log('📈 Token interessante trovato! (simulazione)');
                
                // Simula trade
                if (this.positions.size < this.config.conservative.maxPositions) {
                    await this.simulateRandomTrade();
                }
            } else {
                console.log('💤 Nessun token di qualità rilevato');
            }
            
        }, this.config.conservative.scanInterval || 60000);
    }

    async simulateRandomTrade() {
        const mockToken = {
            name: 'DemoToken',
            symbol: 'DEMO',
            address: `0x${Math.random().toString(16).substr(2, 8)}`,
            dex: 'DeDust'
        };
        
        const position = {
            name: mockToken.name,
            symbol: mockToken.symbol,
            amount: this.config.conservative.maxTradeSize,
            entryPrice: 0.000001 + Math.random() * 0.001,
            entryTime: Date.now(),
            confidence: 75 + Math.floor(Math.random() * 25),
            dex: mockToken.dex,
            stopLoss: this.config.conservative.stopLossPercent,
            takeProfit: this.config.conservative.takeProfitPercent
        };
        
        this.positions.set(mockToken.address, position);
        this.stats.totalTrades++;
        
        console.log(`💰 TRADE SIMULATO: ${position.amount} TON di ${position.symbol}`);
        await this.notifyTrade('buy', position);
        
        // Simula vendita dopo un po'
        setTimeout(async () => {
            if (this.positions.has(mockToken.address)) {
                const pnl = (Math.random() - 0.4) * 0.1; // Bias leggermente negativo (più realistico)
                await this.notifyTrade('sell', position, pnl);
                
                this.stats.totalPnL += pnl;
                this.stats.dailyPnL += pnl;
                if (pnl > 0) this.stats.winningTrades++;
                
                this.positions.delete(mockToken.address);
                
                console.log(`✅ Trade chiuso: P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON`);
            }
        }, 30000 + Math.random() * 60000); // 30 secondi - 1.5 minuti
    }

    // Utility methods
    formatTON(nanotons) {
        return (Number(nanotons) / 1000000000).toFixed(4);
    }
    
    async getWalletBalance() {
        if (!this.wallet) return this.stats.startBalance;
        
        try {
            const contract = this.client.open(this.wallet);
            const balance = await contract.getBalance();
            return Number(balance) / 1000000000;
        } catch (error) {
            return this.stats.startBalance;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    stop() {
        this.isRunning = false;
        console.log('🛑 Conservative Bot fermato');
        this.notify('🛑 Bot fermato manualmente', 'info');
    }

    getNextResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }

    getDailyTrades() {
        if (!this.startTime) return 0;
        const hoursRunning = (Date.now() - this.startTime) / (1000 * 60 * 60);
        return Math.floor(this.stats.totalTrades / Math.max(hoursRunning / 24, 1));
    }
}

// =============================================================================
// CONFIGURAZIONE e AVVIO
// =============================================================================

// Configurazione conservativa con variabili ambiente
const conservativeConfig = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    
    conservative: {
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || 0.5,
        maxPositions: parseInt(process.env.MAX_POSITIONS) || 3,
        minStartBalance: parseFloat(process.env.MIN_START_BALANCE) || 5, // Ridotto per test
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 2,
        maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT) || 15,
        
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || -8,
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 15,
        maxHoldTime: parseInt(process.env.MAX_HOLD_TIME) || 3600000,
        
        minConfidenceScore: parseFloat(process.env.MIN_CONFIDENCE_SCORE) || 75,
        minLiquidity: parseFloat(process.env.MIN_LIQUIDITY) || 100,
        minTokenAge: parseInt(process.env.MIN_TOKEN_AGE) || 1800,
        maxTokenAge: parseInt(process.env.MAX_TOKEN_AGE) || 86400,
        
        strongKeywords: (process.env.STRONG_KEYWORDS || 'doge,pepe,shiba').split(','),
        scanInterval: parseInt(process.env.SCAN_INTERVAL) || 60000,
        sizeMultiplier: parseFloat(process.env.SIZE_MULTIPLIER) || 0.8,
    }
};

// AVVIO AUTOMATICO DEL BOT
console.log('🚀 Inizializzazione TON Conservative Bot su Render...');

// Delay per dare tempo al server di avviarsi
setTimeout(async () => {
    try {
        bot = new ConservativeTONBot(conservativeConfig);
        
        // Avvia il bot automaticamente
        await bot.start();
        
        console.log('✅ Bot avviato con successo su Render!');
        console.log(`🌐 Server disponibile su porta ${PORT}`);
        
    } catch (error) {
        console.error('❌ Errore avvio bot:', error);
        
        // Notifica errore se Telegram è configurato
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const errorBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
                await errorBot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
                    `❌ Errore avvio bot su Render:\n${error.message}`);
            } catch (telegramError) {
                console.error('❌ Errore notifica Telegram:', telegramError);
            }
        }
    }
}, 3000); // 3 secondi di delay

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Ricevuto SIGINT, fermando bot...');
    if (bot) bot.stop();
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Ricevuto SIGTERM, fermando bot...');
    if (bot) bot.stop();
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

module.exports = { ConservativeTONBot, conservativeConfig };
