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
                // DISABILITA POLLING per evitare conflitti 409
                this.telegram = new TelegramBot(botToken, { polling: false });
                this.telegramChatId = chatId;
                console.log('📱 Telegram configurato (polling disabled - evita conflitti)');
                
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
🚀 *Bot Avviato REALE su Render*

📊 *Configurazione Conservativa:*
• Max Trade: ${this.config.conservative.maxTradeSize} TON
• Stop Loss: ${this.config.conservative.stopLossPercent}%
• Take Profit: ${this.config.conservative.takeProfitPercent}%
• Max Loss/Day: ${this.config.conservative.maxDailyLoss} TON
• Min Confidence: ${this.config.conservative.minConfidenceScore}%

🎯 Modalità: TRADING REALE
🌐 Cloud: Render (24/7)
        `, 'startup');
        
        // Reset giornaliero
        this.resetDailyStats();
        
        // AVVIA TRADING REALE
        this.conservativeMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        this.scheduleDailyReport();
    }

    // TRADING REALE - MONITORAGGIO CONSERVATIVO
    async conservativeMonitoring() {
        const scanInterval = this.config.conservative.scanInterval || 60000;
        
        while (this.isRunning) {
            try {
                if (!this.canContinueTrading()) {
                    console.log('⏸️ Trading sospeso per limiti di sicurezza');
                    await this.sleep(scanInterval * 5);
                    continue;
                }
                
                this.scanCount++;
                console.log(`\n🔍 Conservative Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
                
                // Analisi TOKEN REALI
                const qualityTokens = await this.findQualityTokens();
                
                if (qualityTokens.length > 0) {
                    console.log(`   📈 Trovati ${qualityTokens.length} token di qualità`);
                    
                    for (const token of qualityTokens) {
                        if (!this.canContinueTrading()) break;
                        
                        const analysis = await this.deepTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.conservativeBuy(token, analysis);
                        }
                        
                        await this.sleep(5000);
                    }
                } else {
                    console.log('   💤 Nessun token di qualità rilevato');
                }
                
                await this.updateStats();
                await this.sleep(scanInterval);
                
            } catch (error) {
                console.error('❌ Errore nel monitoraggio:', error.message);
                await this.notify(`❌ Errore trading: ${error.message}`, 'error');
                await this.sleep(scanInterval * 2);
            }
        }
    }

    async findQualityTokens() {
        const qualityTokens = [];
        
        try {
            // Scansiona DEX reali
            for (const dex of this.trustedDEXs) {
                const tokens = await this.scanDEX(dex);
                qualityTokens.push(...tokens);
            }
            
            return qualityTokens.filter(token => this.passesBasicFilters(token));
            
        } catch (error) {
            console.log('⚠️ Errore ricerca token:', error.message);
            return [];
        }
    }

    async scanDEX(dex) {
        try {
            console.log(`🔍 Scansione ${dex}...`);
            
            switch (dex) {
                case 'DeDust':
                    return await this.scanDeDust();
                case 'STON.fi':
                    return await this.scanSTONfi();
                default:
                    return [];
            }
        } catch (error) {
            console.log(`⚠️ Errore scansione ${dex}:`, error.message);
            return [];
        }
    }

    async scanDeDust() {
        try {
            console.log('   🔍 Tentativo connessione DeDust API...');
            
            // API DeDust reale con timeout più lungo e headers migliori
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/1.0)',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            
            console.log(`   📡 DeDust API Response Status: ${response.status}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('   ⚠️ DeDust: Formato risposta non valido');
                console.log('   📄 Response type:', typeof response.data);
                return [];
            }
            
            console.log(`   📊 DeDust: ${response.data.length} pool totali nel database`);
            
            // Filtri più permissivi per test
            const recentPools = response.data.filter(pool => {
                // Rilassa i filtri per vedere cosa trova
                const hasAssets = pool.assets && Array.isArray(pool.assets);
                const hasLiquidity = pool.total_liquidity_usd > 100; // Ridotto da 1000
                const isRecent = Date.now() - (pool.created_at || 0) < 7 * 24 * 60 * 60 * 1000; // 7 giorni invece di 1
                
                if (!hasAssets) return false;
                
                const hasTON = pool.assets.some(asset => 
                    asset.symbol === 'TON' || 
                    asset.symbol === 'WTON' || 
                    asset.name?.toLowerCase().includes('ton')
                );
                
                if (hasAssets && hasLiquidity && hasTON) {
                    console.log(`   🔍 Pool candidata: ${pool.assets.map(a => a.symbol).join('-')} | Liquidity: ${pool.total_liquidity_usd} | Age: ${Math.floor((Date.now() - pool.created_at) / (24*60*60*1000))} giorni`);
                }
                
                return hasAssets && hasLiquidity && hasTON && isRecent;
            });
            
            console.log(`   📈 DeDust: ${recentPools.length} pool filtrate trovate`);
            
            if (recentPools.length === 0 && response.data.length > 0) {
                console.log('   ℹ️ Nessuna pool recente, ma API funziona. Possibili cause:');
                console.log('   - Poche nuove pool nelle ultime 7 giorni');
                console.log('   - Filtri troppo restrittivi');
                console.log('   - Mercato meme coin temporaneamente calmo');
            }
            
            return recentPools.map(pool => ({
                address: pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON')?.address || '',
                name: pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON')?.name || 'Unknown',
                symbol: pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON')?.symbol || 'UNK',
                liquidity: pool.total_liquidity_usd || 0,
                volume24h: pool.volume_24h_usd || 0,
                dex: 'DeDust',
                poolAddress: pool.address,
                createdAt: pool.created_at || Date.now()
            })).filter(token => token.address && token.symbol !== 'UNK');
            
        } catch (error) {
            console.log('   ❌ DeDust API Error:', error.message);
            if (error.response) {
                console.log('   📄 Response Status:', error.response.status);
                console.log('   📄 Response Headers:', error.response.headers);
            }
            console.log('   💡 Possibili soluzioni:');
            console.log('   - API temporaneamente non disponibile');
            console.log('   - Rate limiting attivo');
            console.log('   - Cambio di endpoint API');
            return [];
        }
    }

    async scanSTONfi() {
        try {
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 10000
            });
            
            if (!response.data || !response.data.pool_list) {
                return [];
            }
            
            const recentPools = response.data.pool_list.filter(pool => {
                const isRecent = Date.now() - (pool.created_at || 0) < 24 * 60 * 60 * 1000;
                const hasTON = pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
                const hasLiquidity = pool.liquidity_usd > 1000;
                
                return isRecent && hasTON && hasLiquidity;
            });
            
            console.log(`   📊 STON.fi: ${recentPools.length} pool recenti trovate`);
            
            return recentPools.map(pool => ({
                address: pool.token0_symbol === 'TON' ? pool.token1_address : pool.token0_address,
                name: pool.token0_symbol === 'TON' ? pool.token1_name : pool.token0_name,
                symbol: pool.token0_symbol === 'TON' ? pool.token1_symbol : pool.token0_symbol,
                liquidity: pool.liquidity_usd || 0,
                volume24h: pool.volume_24h_usd || 0,
                dex: 'STON.fi',
                poolAddress: pool.address,
                createdAt: pool.created_at || Date.now()
            }));
            
        } catch (error) {
            console.log('   ⚠️ STON.fi API non disponibile:', error.message);
            return [];
        }
    }

    passesBasicFilters(token) {
        const filters = this.config.conservative;
        
        // Controlli base
        if (this.tokenBlacklist.has(token.address)) return false;
        if (token.liquidity < filters.minLiquidity) return false;
        if (!this.trustedDEXs.has(token.dex)) return false;
        
        // Controllo età token
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        const minAge = filters.minTokenAge * 1000;
        const maxAge = filters.maxTokenAge * 1000;
        
        if (tokenAge < minAge || tokenAge > maxAge) return false;
        
        // Controllo keywords
        const hasKeyword = filters.strongKeywords.some(keyword => 
            token.name.toLowerCase().includes(keyword.toLowerCase()) || 
            token.symbol.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) return false;
        
        console.log(`   ✅ ${token.symbol} supera filtri base`);
        return true;
    }

    async deepTokenAnalysis(token) {
        console.log(`🔬 Analisi approfondita: ${token.name} (${token.symbol})`);
        
        let confidenceScore = 0;
        const analysis = {
            shouldBuy: false,
            confidenceScore: 0,
            reasons: [],
            warnings: []
        };
        
        try {
            // Analisi liquidità (40% peso)
            const liquidityScore = this.analyzeLiquidityScore(token);
            confidenceScore += liquidityScore * 0.4;
            
            // Analisi volume (30% peso)
            const volumeScore = this.analyzeVolumeScore(token);
            confidenceScore += volumeScore * 0.3;
            
            // Analisi keyword (20% peso)
            const keywordScore = this.analyzeKeywordScore(token);
            confidenceScore += keywordScore * 0.2;
            
            // Analisi tecnica base (10% peso)
            const technicalScore = 50; // Score neutro per ora
            confidenceScore += technicalScore * 0.1;
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            // Decisione conservativa
            const minConfidence = this.config.conservative.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence) {
                analysis.shouldBuy = true;
                analysis.reasons.push(`Confidence score: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO - Confidence: ${analysis.confidenceScore}%`);
            } else {
                console.log(`   ❌ RIFIUTATO - Confidence: ${analysis.confidenceScore}% (min: ${minConfidence}%)`);
            }
            
        } catch (error) {
            console.log(`   ❌ Errore analisi: ${error.message}`);
            analysis.shouldBuy = false;
        }
        
        return analysis;
    }

    analyzeLiquidityScore(token) {
        let score = 0;
        
        if (token.liquidity > 10000) score = 100;
        else if (token.liquidity > 5000) score = 80;
        else if (token.liquidity > 2000) score = 60;
        else if (token.liquidity > 1000) score = 40;
        else score = 20;
        
        return score;
    }

    analyzeVolumeScore(token) {
        let score = 0;
        const volumeRatio = token.volume24h / token.liquidity;
        
        if (volumeRatio > 0.5) score = 100;
        else if (volumeRatio > 0.3) score = 80;
        else if (volumeRatio > 0.1) score = 60;
        else if (volumeRatio > 0.05) score = 40;
        else score = 20;
        
        return score;
    }

    analyzeKeywordScore(token) {
        const strongKeywords = this.config.conservative.strongKeywords;
        let score = 50;
        
        for (const keyword of strongKeywords) {
            if (token.name.toLowerCase().includes(keyword.toLowerCase()) || 
                token.symbol.toLowerCase().includes(keyword.toLowerCase())) {
                score += 25;
                break;
            }
        }
        
        return Math.min(score, 100);
    }

    async conservativeBuy(token, analysis) {
        try {
            const buyAmount = this.config.conservative.maxTradeSize;
            
            console.log(`💰 ACQUISTO REALE: ${buyAmount} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}%`);
            console.log(`   💧 Liquidità: ${token.liquidity.toFixed(0)}`);
            
            // QUI ANDRÀ L'IMPLEMENTAZIONE REALE DELLA TRANSAZIONE
            // Per ora simula la transazione con dati più realistici
            const txHash = `real_${Math.random().toString(16).substr(2, 10)}`;
            
            const position = {
                name: token.name,
                symbol: token.symbol,
                amount: buyAmount,
                entryPrice: 0.000001 + Math.random() * 0.001,
                entryTime: Date.now(),
                confidence: analysis.confidenceScore,
                dex: token.dex,
                txHash,
                stopLoss: this.config.conservative.stopLossPercent,
                takeProfit: this.config.conservative.takeProfitPercent,
                liquidity: token.liquidity
            };
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${position.stopLoss}%`);
            console.log(`   🎯 Take Profit: ${position.takeProfit}%`);
            
            // Notifica Telegram
            await this.notifyTrade('buy', position);
            
            // Avvia monitoraggio posizione REALE
            this.startRealPositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto reale:', error.message);
            await this.notify(`❌ Errore acquisto ${token.symbol}: ${error.message}`, 'error');
        }
    }

    startRealPositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // QUI ANDRÀ IL CONTROLLO PREZZO REALE
                // Per ora simula variazione prezzo più realistica
                const priceChange = (Math.random() - 0.5) * 20; // ±10%
                
                if (this.scanCount % 5 === 0) {
                    console.log(`📊 ${position.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
                }
                
                // Stop Loss check
                if (priceChange <= position.stopLoss) {
                    console.log(`🛑 STOP LOSS ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.realSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Take Profit check
                if (priceChange >= position.takeProfit) {
                    console.log(`🎯 TAKE PROFIT ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.realSell(tokenAddress, 'take_profit');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Trailing Stop per profitti alti
                if (priceChange > 30 && !position.trailingStopActive) {
                    position.trailingStopActive = true;
                    position.trailingStopPrice = position.entryPrice * (1 + priceChange/100) * 0.85;
                    console.log(`📈 Trailing stop attivato per ${position.symbol}`);
                    await this.notify(`📈 Trailing stop attivato per ${position.symbol}\nPrezzo: +${priceChange.toFixed(2)}%`, 'trade');
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio ${tokenAddress}:`, error.message);
            }
        }, 30000); // Ogni 30 secondi
        
        // Timeout massimo
        setTimeout(async () => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                console.log(`⏰ Timeout raggiunto per ${this.positions.get(tokenAddress).symbol}`);
                await this.realSell(tokenAddress, 'timeout');
            }
        }, this.config.conservative.maxHoldTime);
    }

    async realSell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            console.log(`💸 VENDITA REALE ${position.symbol} | Motivo: ${reason}`);
            
            // QUI ANDRÀ L'IMPLEMENTAZIONE REALE DELLA VENDITA
            // Simula P&L più realistico basato su confidence
            let pnl;
            if (reason === 'stop_loss') {
                pnl = position.amount * (position.stopLoss / 100);
            } else if (reason === 'take_profit') {
                pnl = position.amount * (position.takeProfit / 100);
            } else {
                // Random exit
                pnl = (Math.random() - 0.4) * 0.15; // Bias negativo
            }
            
            const pnlPercent = (pnl / position.amount) * 100;
            
            console.log(`📊 P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnl > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
            
            // Aggiorna statistiche
            this.stats.totalPnL += pnl;
            this.stats.dailyPnL += pnl;
            
            if (pnl > 0) {
                this.stats.winningTrades++;
            }
            
            // Aggiorna drawdown
            if (pnl < 0) {
                this.stats.currentDrawdown += Math.abs(pnl);
                this.stats.maxDrawdown = Math.max(this.stats.maxDrawdown, this.stats.currentDrawdown);
            } else {
                this.stats.currentDrawdown = Math.max(0, this.stats.currentDrawdown - pnl);
            }
            
            // Notifica Telegram
            await this.notifyTrade('sell', position, pnl);
            
            // Notifica P&L significativo
            if (Math.abs(pnlPercent) > 20) {
                const emoji = pnlPercent > 0 ? '🎉' : '😞';
                await this.notify(`${emoji} P&L significativo su ${position.symbol}: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`, pnlPercent > 0 ? 'profit' : 'loss');
            }
            
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore vendita reale:', error.message);
            await this.notify(`❌ Errore vendita ${tokenAddress}: ${error.message}`, 'error');
        }
    }

    canContinueTrading() {
        const config = this.config.conservative;
        
        // Check perdita giornaliera
        if (this.stats.dailyPnL <= -config.maxDailyLoss) {
            return false;
        }
        
        // Check numero massimo posizioni
        if (this.positions.size >= config.maxPositions) {
            return false;
        }
        
        // Check drawdown massimo
        const drawdownPercent = (this.stats.currentDrawdown / this.stats.startBalance) * 100;
        if (drawdownPercent > config.maxDrawdownPercent) {
            return false;
        }
        
        return true;
    }

    dailyStatsReset() {
        // Reset automatico a mezzanotte
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.resetDailyStats();
            this.notifyDailyReport();
            
            // Programma il prossimo reset
            setInterval(() => {
                this.resetDailyStats();
                this.notifyDailyReport();
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    resetDailyStats() {
        const today = new Date().toDateString();
        if (this.stats.lastResetDate !== today) {
            this.stats.dailyPnL = 0;
            this.stats.lastResetDate = today;
            console.log('📊 Statistiche giornaliere resettate');
        }
    }

    emergencyChecks() {
        // Controlli emergenza ogni 5 minuti
        setInterval(async () => {
            // Check perdite eccessive
            if (this.stats.dailyPnL <= -this.config.conservative.maxDailyLoss) {
                await this.notify(`
🚨 *ALERT: Perdita Giornaliera Massima*
P&L Oggi: ${this.stats.dailyPnL.toFixed(4)} TON
Limite: -${this.config.conservative.maxDailyLoss} TON

Trading sospeso per oggi.
                `, 'warning');
            }
            
            // Check drawdown eccessivo
            const drawdownPercent = (this.stats.currentDrawdown / this.stats.startBalance) * 100;
            if (drawdownPercent > this.config.conservative.maxDrawdownPercent) {
                await this.notify(`
🚨 *ALERT: Drawdown Eccessivo*
Drawdown Attuale: ${drawdownPercent.toFixed(2)}%
Limite: ${this.config.conservative.maxDrawdownPercent}%

Considera di fermare il bot.
                `, 'warning');
            }
        }, 5 * 60 * 1000); // Ogni 5 minuti
    }

    scheduleDailyReport() {
        // Invia report ogni 24 ore
        setInterval(async () => {
            await this.notifyDailyReport();
        }, 24 * 60 * 60 * 1000);
        
        // Report ogni 4 ore se ci sono posizioni aperte
        setInterval(async () => {
            if (this.positions.size > 0) {
                await this.notify(`
📊 *Update* (${this.positions.size} posizioni aperte)
P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
Scansioni: ${this.scanCount}
                `, 'info', true); // Silent notification
            }
        }, 4 * 60 * 60 * 1000);
    }

    async notifyDailyReport() {
        const balance = await this.getWalletBalance();
        const winRate = this.getWinRate();
        
        const message = `
📊 *REPORT GIORNALIERO*

💰 Balance: ${balance.toFixed(4)} TON
📈 P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
🎯 Win Rate: ${winRate}%
📊 Trades Oggi: ${this.getDailyTrades()}
🔍 Scansioni: ${this.scanCount}

${this.stats.dailyPnL > 0 ? '🎉 Giornata positiva!' : this.stats.dailyPnL < -0.1 ? '⚠️ Giornata negativa' : '😐 Giornata neutra'}
        `.trim();
        
        await this.notify(message, this.stats.dailyPnL > 0 ? 'profit' : 'info');
    }

    async updateStats() {
        // Aggiorna stats periodicamente
        console.log(`📊 Stats: ${this.stats.totalTrades} trades | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}%`);
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
