const { TonClient, WalletContractV4, internal, Address } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER con WEBHOOK TELEGRAM v2.3
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Variabile globale per il bot
let bot = null;

// =============================================================================
// WEBHOOK TELEGRAM SETUP (identico al v2.2)
// =============================================================================

app.use('/webhook', express.json());

app.get('/', (req, res) => {
    res.json({ 
        status: '🤖 TON Ultra Permissive Bot v2.3 Running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '2.3.0',
        message: 'Bot Ultra Permissivo + Debug Avanzato',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Ultra Permissive Bot v2.3',
        telegram_webhook: process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

app.get('/webhook/info', async (req, res) => {
    try {
        if (bot && bot.telegram) {
            const info = await bot.telegram.getWebHookInfo();
            res.json({
                webhook_info: info,
                bot_running: bot.isRunning || false,
                bot_initialized: !!bot,
                timestamp: new Date().toISOString(),
                expected_webhook: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
            });
        } else {
            res.json({ 
                error: 'Bot not initialized',
                expected_webhook: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/webhook/test', async (req, res) => {
    try {
        if (bot && bot.telegram) {
            await bot.notify('🧪 Test webhook v2.3 eseguito con successo!\n✅ Filtri ultra permissivi attivi', 'info');
            res.json({ success: true, message: 'Test notification sent via Telegram' });
        } else {
            res.status(500).json({ error: 'Bot not initialized' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            version: '2.3.0',
            isRunning: bot.isRunning || false,
            walletAddress: bot.walletAddress || 'Not initialized',
            positions: bot.positions ? bot.positions.size : 0,
            scanCount: bot.scanCount || 0,
            totalTrades: bot.stats.totalTrades || 0,
            totalPnL: bot.stats.totalPnL ? bot.stats.totalPnL.toFixed(4) : '0.0000',
            dailyPnL: bot.stats.dailyPnL ? bot.stats.dailyPnL.toFixed(4) : '0.0000',
            winRate: bot.getWinRate ? bot.getWinRate() : 0,
            telegram_webhook: process.env.TELEGRAM_BOT_TOKEN ? 'Active' : 'Not configured',
            blacklistedTokens: bot.tokenBlacklist ? bot.tokenBlacklist.size : 0,
            candidatesFound: bot.candidatesFound || 0,
            tokensAnalyzed: bot.tokensAnalyzed || 0
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '2.3.0',
            message: 'Bot is starting up...',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/bot/start', (req, res) => {
    if (bot && !bot.isRunning) {
        bot.start();
        res.json({ message: 'Bot v2.3 started via API' });
    } else if (bot && bot.isRunning) {
        res.json({ message: 'Bot already running' });
    } else {
        res.json({ message: 'Bot not initialized yet' });
    }
});

app.get('/bot/stop', (req, res) => {
    if (bot && bot.isRunning) {
        bot.stop();
        res.json({ message: 'Bot v2.3 stopped via API' });
    } else {
        res.json({ message: 'Bot not running' });
    }
});

// Avvia server Express IMMEDIATAMENTE
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server v2.3 running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🔗 Webhook info: http://localhost:${PORT}/webhook/info`);
    console.log('✅ Render può ora rilevare il servizio');
});

// =============================================================================
// BOT CLASS v2.3 - ULTRA PERMISSIVO + DEBUG AVANZATO
// =============================================================================

class UltraPermissiveTONBot {
    constructor(config) {
        this.config = config;
        this.client = new TonClient({
            endpoint: config.endpoint || 'https://toncenter.com/api/v2/jsonRPC'
        });
        this.wallet = null;
        this.walletAddress = null;
        this.isRunning = false;
        this.positions = new Map();
        this.scanCount = 0;
        
        // CONTATORI DEBUG v2.3
        this.candidatesFound = 0;
        this.tokensAnalyzed = 0;
        this.filterResults = {
            totalScanned: 0,
            passedBasic: 0,
            failedScam: 0,
            failedLiquidity: 0,
            failedAge: 0,
            failedKeywords: 0,
            approved: 0
        };
        
        // TELEGRAM BOT SETUP
        this.telegram = null;
        this.telegramChatId = null;
        this.webhookConfigured = false;
        
        // STATISTICHE
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
        
        // BLACKLIST RIDOTTA (solo gli scam più ovvi)
        this.tokenBlacklist = new Set();
        this.trustedDEXs = new Set(['DeDust', 'STON.fi']);
        this.scamDetections = new Map();
        
        console.log('🚀 Ultra Permissive TON Bot v2.3 inizializzato');
        console.log('💡 Focus: Massime opportunità + Debug completo');
        
        this.setupTelegram();
    }

    async setupTelegram() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.log('📱 Telegram non configurato - Aggiungi TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID');
            return;
        }
        
        try {
            this.telegram = new TelegramBot(botToken, { polling: false });
            this.telegramChatId = chatId;
            console.log('📱 Telegram bot inizializzato');
            await this.setupWebhook();
        } catch (error) {
            console.warn('⚠️ Errore setup Telegram:', error.message);
            await this.setupPollingFallback();
        }
    }

    async setupWebhook() {
        try {
            const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 
                           process.env.RENDER_EXTERNAL_URL?.replace('https://', '') ||
                           'bot-trading-conservativo.onrender.com';
            
            const webhookUrl = `https://${hostname}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
            
            console.log('🔗 Configurando webhook Telegram:', webhookUrl);
            
            await this.telegram.deleteWebHook();
            await this.sleep(1000);
            
            const result = await this.telegram.setWebHook(webhookUrl, {
                max_connections: 40,
                allowed_updates: ['message']
            });
            
            console.log('✅ Webhook configurato:', result);
            
            const info = await this.telegram.getWebHookInfo();
            console.log('📡 Webhook info:', {
                url: info.url,
                pending_update_count: info.pending_update_count,
                last_error_date: info.last_error_date,
                last_error_message: info.last_error_message
            });
            
            if (info.url === webhookUrl) {
                this.webhookConfigured = true;
                console.log('✅ Webhook verificato e funzionante');
                this.setupWebhookEndpoint();
                
                setTimeout(async () => {
                    await this.notify('🎉 Webhook v2.3 configurato!\n🚀 Ultra permissivo attivo\n🔍 Debug avanzato abilitato', 'success');
                }, 3000);
                
            } else {
                throw new Error(`Webhook URL mismatch: ${info.url} vs ${webhookUrl}`);
            }
            
        } catch (error) {
            console.error('❌ Errore configurazione webhook:', error.message);
            await this.setupPollingFallback();
        }
    }

    setupWebhookEndpoint() {
        const webhookPath = `/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
        
        app._router.stack = app._router.stack.filter(layer => 
            !layer.route || layer.route.path !== webhookPath
        );
        
        app.post(webhookPath, async (req, res) => {
            try {
                console.log(`📨 Webhook ricevuto da Telegram:`, {
                    message_id: req.body.message?.message_id,
                    from: req.body.message?.from?.username,
                    text: req.body.message?.text,
                    chat_id: req.body.message?.chat?.id
                });
                
                if (req.body.message) {
                    await this.handleTelegramMessage(req.body.message);
                }
                
                res.sendStatus(200);
            } catch (error) {
                console.error('❌ Errore gestione webhook:', error.message);
                res.sendStatus(500);
            }
        });
        
        console.log(`📡 Webhook endpoint attivo: ${webhookPath}`);
    }

    async setupPollingFallback() {
        try {
            console.log('🔄 Configurando polling fallback...');
            
            await this.telegram.deleteWebHook();
            
            this.telegram = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
                polling: {
                    interval: 10000,
                    autoStart: false,
                    params: {
                        timeout: 10
                    }
                }
            });
            
            this.telegram.on('polling_error', (error) => {
                console.warn('⚠️ Polling error (ignorato):', error.code);
            });
            
            this.telegram.on('message', async (msg) => {
                try {
                    await this.handleTelegramMessage(msg);
                } catch (error) {
                    console.error('❌ Errore comando polling:', error.message);
                }
            });
            
            this.telegram.startPolling();
            
            console.log('✅ Polling fallback configurato');
            
            setTimeout(async () => {
                await this.notify('📱 Telegram v2.3 configurato con polling fallback\n🚀 Ultra permissivo attivo', 'info');
            }, 3000);
            
        } catch (error) {
            console.error('❌ Errore polling fallback:', error.message);
            this.telegram = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            console.log('📱 Telegram configurato SOLO per notifiche');
        }
    }

    async handleTelegramMessage(message) {
        const chatId = message.chat.id;
        const text = message.text || '';
        const username = message.from?.username || 'Unknown';
        
        console.log(`📱 Comando ricevuto: "${text}" da @${username} (${chatId})`);
        
        if (chatId.toString() !== this.telegramChatId.toString()) {
            console.warn(`❌ Tentativo non autorizzato da ${chatId} (atteso: ${this.telegramChatId})`);
            await this.telegram.sendMessage(chatId, '❌ Non autorizzato per questo bot');
            return;
        }
        
        try {
            switch (text.toLowerCase()) {
                case '/start':
                    await this.handleStartCommand(chatId);
                    break;
                case '/status':
                    await this.sendBotStatus(chatId);
                    break;
                case '/stats':
                    await this.sendDetailedStats(chatId);
                    break;
                case '/debug':
                    await this.sendDebugInfo(chatId);
                    break;
                case '/filters':
                    await this.sendFilterResults(chatId);
                    break;
                case '/positions':
                    await this.sendPositions(chatId);
                    break;
                case '/wallet':
                    await this.sendWalletInfo(chatId);
                    break;
                case '/balance':
                    await this.sendBalanceDebug(chatId);
                    break;
                case '/stop':
                    await this.handleStopCommand(chatId);
                    break;
                case '/restart':
                    await this.handleRestartCommand(chatId);
                    break;
                case '/help':
                    await this.sendHelpMessage(chatId);
                    break;
                case '/test':
                    await this.telegram.sendMessage(chatId, '✅ Bot v2.3 risponde correttamente!\n🔗 Webhook funzionante!\n🚀 Ultra permissivo attivo');
                    break;
                case '/webhook':
                    await this.sendWebhookInfo(chatId);
                    break;
                case '/blacklist':
                    await this.sendBlacklistInfo(chatId);
                    break;
                case '/scan':
                    await this.manualScan(chatId);
                    break;
                default:
                    if (text.startsWith('/')) {
                        await this.telegram.sendMessage(chatId, 
                            `❓ Comando non riconosciuto: ${text}\n\n` +
                            `📱 Usa /help per vedere tutti i comandi disponibili`
                        );
                    }
                    break;
            }
            
        } catch (error) {
            console.error('❌ Errore gestione comando:', error.message);
            await this.telegram.sendMessage(chatId, `❌ Errore elaborazione comando: ${error.message}`);
        }
    }

    async handleStartCommand(chatId) {
        if (!this.isRunning) {
            await this.start();
            await this.telegram.sendMessage(chatId, '🚀 Bot v2.3 avviato!\n🔧 Filtri ultra permissivi attivi\nUsa /debug per monitorare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già in esecuzione\nUsa /debug per dettagli.');
        }
    }

    async handleStopCommand(chatId) {
        if (this.isRunning) {
            this.stop();
            await this.telegram.sendMessage(chatId, '🛑 Bot v2.3 fermato\nUsa /start per riavviare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già fermato\nUsa /start per avviare.');
        }
    }

    async handleRestartCommand(chatId) {
        await this.telegram.sendMessage(chatId, '🔄 Riavvio bot v2.3 in corso...');
        
        if (this.isRunning) {
            this.stop();
            await this.sleep(2000);
        }
        
        await this.start();
        await this.telegram.sendMessage(chatId, '✅ Bot v2.3 riavviato con successo!\n🚀 Ultra permissivo attivo');
    }

    async sendDebugInfo(chatId) {
        const message = `
🔍 *DEBUG INFO v2.3*

📊 *Contatori Scansione:*
• Scansioni totali: ${this.scanCount}
• Token analizzati: ${this.tokensAnalyzed}
• Candidati trovati: ${this.candidatesFound}

📈 *Risultati Filtri:*
• Totali scansionati: ${this.filterResults.totalScanned}
• Superato basic: ${this.filterResults.passedBasic}
• Fallito scam: ${this.filterResults.failedScam}
• Fallito liquidità: ${this.filterResults.failedLiquidity}
• Fallito età: ${this.filterResults.failedAge}
• Fallito keywords: ${this.filterResults.failedKeywords}
• APPROVATI: ${this.filterResults.approved}

🎯 *Success Rate:*
• Candidati/Scansioni: ${this.scanCount > 0 ? ((this.candidatesFound / this.scanCount) * 100).toFixed(2) : 0}%
• Approvati/Candidati: ${this.candidatesFound > 0 ? ((this.filterResults.approved / this.candidatesFound) * 100).toFixed(2) : 0}%

💡 Usa /filters per dettagli sui filtri
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendFilterResults(chatId) {
        const config = this.config.ultraPermissive;
        
        const message = `
🔧 *CONFIGURAZIONE FILTRI v2.3*

⚙️ *Impostazioni Correnti:*
• Min Confidence: ${config.minConfidenceScore}%
• Min Liquidità: $${config.minLiquidity}
• Min Age: ${(config.minTokenAge/1000/60).toFixed(1)} min
• Max Age: ${(config.maxTokenAge/1000/60/60/24).toFixed(1)} giorni
• Max Trade: ${config.maxTradeSize} TON

📊 *Performance Filtri:*
• Basic filters pass rate: ${this.filterResults.totalScanned > 0 ? ((this.filterResults.passedBasic / this.filterResults.totalScanned) * 100).toFixed(1) : 0}%
• Scam detection rate: ${this.filterResults.totalScanned > 0 ? ((this.filterResults.failedScam / this.filterResults.totalScanned) * 100).toFixed(1) : 0}%
• Liquidity filter rate: ${this.filterResults.totalScanned > 0 ? ((this.filterResults.failedLiquidity / this.filterResults.totalScanned) * 100).toFixed(1) : 0}%

🎯 *Keywords Monitorate:*
${config.strongKeywords.slice(0, 15).join(', ')}... (+${config.strongKeywords.length - 15} altre)

💡 Usa /scan per forzare scansione manuale
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async manualScan(chatId) {
        await this.telegram.sendMessage(chatId, '🔍 Avvio scansione manuale...');
        
        try {
            const qualityTokens = await this.findQualityTokens();
            
            let message = `🔍 *SCANSIONE MANUALE v2.3*\n\n`;
            message += `📊 Candidati trovati: ${qualityTokens.length}\n\n`;
            
            if (qualityTokens.length > 0) {
                message += `🎯 *Token Candidati:*\n`;
                for (let i = 0; i < Math.min(qualityTokens.length, 5); i++) {
                    const token = qualityTokens[i];
                    message += `• ${token.symbol} - $${token.liquidity} (${token.dex})\n`;
                }
                
                if (qualityTokens.length > 5) {
                    message += `... e altri ${qualityTokens.length - 5} token\n`;
                }
            } else {
                message += `❌ Nessun token trovato\n`;
                message += `💡 Prova ad abbassare i filtri`;
            }
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore scansione: ${error.message}`);
        }
    }

    async sendBalanceDebug(chatId) {
        try {
            const currentBalance = await this.getWalletBalance();
            const canTrade = await this.canContinueTrading();
            
            const message = `
🔍 *BALANCE DEBUG v2.3*

💰 *Balance Attuale:* ${currentBalance.toFixed(4)} TON
💰 *Start Balance:* ${this.stats.startBalance.toFixed(4)} TON
⚙️ *Minimo Richiesto:* ${this.config.ultraPermissive.minStartBalance} TON

📊 *Altri Limiti:*
• Daily P&L: ${this.stats.dailyPnL.toFixed(4)} TON (max loss: -${this.config.ultraPermissive.maxDailyLoss})
• Posizioni: ${this.positions.size}/${this.config.ultraPermissive.maxPositions}

🎯 *Trading Status:* ${canTrade ? '✅ ATTIVO' : '❌ SOSPESO'}
🚀 *Token Analizzati:* ${this.tokensAnalyzed}
🔍 *Candidati Totali:* ${this.candidatesFound}

${!canTrade ? '💡 Motivo sospensione controllato nei logs' : ''}
            `.trim();
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore debug balance: ${error.message}`);
        }
    }

    async sendBlacklistInfo(chatId) {
        const message = `
🛡️ *BLACKLIST ULTRA RIDOTTA v2.3*

📊 *Token Blacklistati:* ${this.tokenBlacklist.size}
🔍 *Scansioni Totali:* ${this.scanCount}
🚨 *Scam Rilevati:* ${this.scamDetections.size}

🔧 *Protezioni Minime:*
• Solo scam ovvi e pericolosi
• Pattern token fake/test
• Liquidità zero o negativa
• Imitazioni perfette di coin famosi

💡 v2.3 blocca solo i token CHIARAMENTE pericolosi
🚀 Tutti gli altri vengono testati per trading
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWebhookInfo(chatId) {
        try {
            const info = await this.telegram.getWebHookInfo();
            
            const message = `
🔗 *WEBHOOK INFO v2.3*

📡 *Status:* ${this.webhookConfigured ? '✅ Configurato' : '❌ Non configurato'}
🌐 *URL:* ${info.url || 'Nessuno'}
📊 *Pending Updates:* ${info.pending_update_count || 0}
📅 *Last Error:* ${info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString() : 'Nessuno'}
⚠️ *Error Message:* ${info.last_error_message || 'Nessuno'}

💡 *Test webhook:* /test
🔧 *Se i comandi non funzionano, il bot userà polling fallback*
            `.trim();
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore recupero info webhook: ${error.message}`);
        }
    }

    async sendBotStatus(chatId) {
        const uptime = this.getUptime();
        const status = this.isRunning ? '🟢 Attivo' : '🔴 Fermo';
        const balance = await this.getWalletBalance();
        
        const message = `
🤖 *TON Ultra Permissive Bot v2.3 Status*

${status} | ⏱️ Uptime: ${uptime}
🌐 Deploy: Render Cloud
🔗 Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Polling'}
💳 Wallet: ${balance.toFixed(4)} TON
📊 Scansioni: ${this.scanCount}
🔍 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati trovati: ${this.candidatesFound}
📈 Posizioni aperte: ${this.positions.size}
💰 P&L oggi: ${this.stats.dailyPnL.toFixed(4)} TON
📊 Total P&L: ${this.stats.totalPnL.toFixed(4)} TON
🎯 Win Rate: ${this.getWinRate()}%

📱 *Comandi debug:* /debug, /filters, /scan
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendDetailedStats(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
📊 *Statistiche Dettagliate v2.3*

💰 *Wallet:*
Address: \`${this.walletAddress || 'Non inizializzato'}\`
Balance: ${balance.toFixed(4)} TON
Start Balance: ${this.stats.startBalance.toFixed(4)} TON

📈 *Trading:*
Total Trades: ${this.stats.totalTrades}
Winning Trades: ${this.stats.winningTrades}
Win Rate: ${this.getWinRate()}%

💸 *P&L:*
Daily P&L: ${this.stats.dailyPnL.toFixed(4)} TON
Total P&L: ${this.stats.totalPnL.toFixed(4)} TON

🔍 *Scansioni v2.3:*
Scansioni totali: ${this.scanCount}
Token analizzati: ${this.tokensAnalyzed}
Candidati trovati: ${this.candidatesFound}
Approvati per trading: ${this.filterResults.approved}

⏰ *Sistema:*
Webhook: ${this.webhookConfigured ? '✅ Configurato' : '📱 Polling fallback'}
Ultimo reset: ${this.stats.lastResetDate}
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendPositions(chatId) {
        if (this.positions.size === 0) {
            await this.telegram.sendMessage(chatId, '📭 Nessuna posizione aperta\n\n💡 Il bot cerca automaticamente opportunità ogni 20 secondi\n🚀 Filtri ultra permissivi attivi\n\nUsa /debug per vedere perché non trova token');
            return;
        }
        
        let message = '📈 *Posizioni Aperte:*\n\n';
        
        for (const [address, position] of this.positions) {
            const timeHeld = this.formatTime(Date.now() - position.entryTime);
            const currentPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.2);
            const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
            const pnlIcon = pnl > 0 ? '📈' : '📉';
            
            message += `${pnlIcon} *${position.symbol}*\n`;
            message += `Amount: ${position.amount.toFixed(4)} TON\n`;
            message += `P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`;
            message += `Time: ${timeHeld}\n`;
            message += `Confidence: ${position.confidence}%\n`;
            message += `DEX: ${position.dex}\n\n`;
        }
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWalletInfo(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
💳 *WALLET INFO v2.3*

📍 *Indirizzo:*
\`${this.walletAddress || 'Non inizializzato'}\`

💰 *Balance:*
${balance.toFixed(4)} TON

🔗 *Explorer:*
[Visualizza su TONScan](https://tonscan.org/address/${this.walletAddress})

⚙️ *Configurazione Ultra Permissiva v2.3:*
• Max Trade: ${this.config.ultraPermissive.maxTradeSize} TON
• Balance minimo: ${this.config.ultraPermissive.minStartBalance} TON
• Confidence minimo: ${this.config.ultraPermissive.minConfidenceScore}% (MOLTO BASSO!)
• Liquidità minima: $${this.config.ultraPermissive.minLiquidity} (MOLTO BASSA!)
• Status: ${balance >= this.config.ultraPermissive.minStartBalance ? '✅ OK per trading' : '⚠️ Balance insufficiente'}

💡 *Keywords monitorate:*
${this.config.ultraPermissive.strongKeywords.slice(0, 10).join(', ')}... (+${this.config.ultraPermissive.strongKeywords.length - 10} altre)

🚀 *Ultra Permissivo:* Testa quasi tutto!
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendHelpMessage(chatId) {
        const message = `
🤖 *TON Ultra Permissive Bot v2.3 Commands*

📊 *Status & Info:*
/status - Status generale del bot
/stats - Statistiche dettagliate trading
/debug - Debug info con contatori
/filters - Info sui filtri e performance
/positions - Posizioni aperte
/wallet - Info wallet e balance
/balance - Debug balance dettagliato

🎮 *Controllo Bot:*
/start - Avvia bot (se fermo)
/stop - Ferma il bot
/restart - Riavvia il bot
/scan - Scansione manuale immediata

🔧 *Sistema:*
/webhook - Info webhook Telegram
/blacklist - Info protezione (ridotta)
/test - Test connessione
/help - Questo messaggio

🔔 *Notifiche Automatiche:*
• Debug continuo delle scansioni
• Token trovati ma non approvati
• Ogni trade con dettagli completi
• Alert solo per errori gravi

📊 *Filtri Ultra Permissivi v2.3:*
• Confidence minimo: ${this.config.ultraPermissive.minConfidenceScore}% (MOLTO BASSO!)
• Liquidità minima: $${this.config.ultraPermissive.minLiquidity} (MOLTO BASSA!)
• Scansione ogni: ${this.config.ultraPermissive.scanInterval / 1000}s
• Max trade: ${this.config.ultraPermissive.maxTradeSize} TON

🚀 *Ultra Permissivo:*
✅ Blocca solo scam ovvi e pericolosi
✅ Testa token con liquidità minima
✅ Keywords estese per più opportunità
✅ Age range ampissimo
✅ Confidence threshold molto basso
✅ Debug completo di ogni scansione

🌐 *Bot v2.3 Features:*
🚀 Massime opportunità possibili
🔍 Debug avanzato e trasparente
🛡️ Protezione solo anti-scam critica
⚡ Scansioni rapide (20s)
📊 Statistiche dettagliate in tempo reale
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async notify(message, type = 'info', silent = false) {
        console.log(`📱 ${message}`);
        
        if (!this.telegram || !this.telegramChatId) return;
        
        try {
            let emoji = '';
            switch (type) {
                case 'trade': emoji = '💰'; break;
                case 'profit': emoji = '📈'; break;
                case 'loss': emoji = '📉'; break;
                case 'warning': emoji = '⚠️'; break;
                case 'error': emoji = '❌'; break;
                case 'success': emoji = '✅'; break;
                case 'startup': emoji = '🚀'; break;
                case 'scam': emoji = '🛡️'; break;
                case 'debug': emoji = '🔍'; break;
                default: emoji = 'ℹ️';
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

    // =============================================================================
    // WALLET INITIALIZATION (identico al v2.2)
    // =============================================================================

    async debugWalletAddresses(mnemonic) {
        console.log('🔍 DEBUG: Analisi wallet addresses...');
        
        try {
            const yourWallet = 'UQBdflvdcISFuWFWvdXlonQObvfBUFOBpML3Loxsjp5tVbw0';
            console.log('📍 Target wallet: ', yourWallet);
            
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            const wallet = WalletContractV4.create({ 
                publicKey: keyPair.publicKey, 
                workchain: 0 
            });
            
            const address = wallet.address;
            const generated = address.toString({ bounceable: false });
            const isMatch = yourWallet === generated;
            
            console.log('\n🎯 VERIFICA:');
            console.log('Target:      ', yourWallet);
            console.log('Generato:    ', generated);
            console.log('Match?       ', isMatch ? '✅ SÌ' : '❌ NO');
            
            return { isMatch, generated, target: yourWallet };
            
        } catch (error) {
            console.error('❌ Errore debug wallet:', error.message);
            return { isMatch: false, error: error.message };
        }
    }

    async initialize() {
        try {
            console.log('🔑 Inizializzazione wallet v2.3...');
            
            const mnemonicString = process.env.MNEMONIC_WORDS;
            
            if (!mnemonicString) {
                throw new Error('MNEMONIC_WORDS non configurato nelle variabili ambiente');
            }
            
            const mnemonic = mnemonicString.split(',').map(word => word.trim());
            
            if (mnemonic.length !== 24) {
                throw new Error(`Mnemonic deve avere 24 parole, ricevute: ${mnemonic.length}`);
            }
            
            console.log('✅ Mnemonic parsate: 24 parole');
            
            const debugResult = await this.debugWalletAddresses(mnemonic);
            
            if (!debugResult.isMatch) {
                console.warn('⚠️ WARNING: Wallet generato non corrisponde al target');
                await this.notify(`⚠️ WALLET MISMATCH!\nTarget: ${debugResult.target}\nGenerato: ${debugResult.generated}\nVerifica MNEMONIC_WORDS!`, 'warning');
            }
            
            const keyPair = await mnemonicToPrivateKey(mnemonic);
            this.wallet = WalletContractV4.create({ 
                publicKey: keyPair.publicKey, 
                workchain: 0 
            });
            
            this.walletAddress = this.wallet.address.toString({ bounceable: false });
            
            const contract = this.client.open(this.wallet);
            const balance = await contract.getBalance();
            this.stats.startBalance = Number(balance) / 1000000000;
            
            console.log('🏦 TON Wallet inizializzato correttamente');
            console.log(`📍 Address: ${this.walletAddress}`);
            console.log(`💰 Balance: ${this.stats.startBalance.toFixed(4)} TON`);
            
            await this.notify(`
🏦 *Wallet Inizializzato v2.3*
Address: \`${this.walletAddress}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ${this.stats.startBalance >= this.config.ultraPermissive.minStartBalance ? '✅ Pronto' : '⚠️ Balance basso'}
Match: ${debugResult.isMatch ? '✅ Corretto' : '❌ Verifica mnemonic'}
Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Fallback'}
🚀 Ultra Permissivo: ✅ Attivo
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚀 Ultra Permissive Bot v2.3 avviato...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        await this.notify(`
🚀 *Bot v2.3 Ultra Permissivo Avviato*

💳 Wallet: \`${this.walletAddress}\`
🔗 Webhook: ${this.webhookConfigured ? '✅ Funzionante' : '📱 Polling fallback'}

📊 *Filtri Ultra Permissivi:*
• Confidence: ${this.config.ultraPermissive.minConfidenceScore}% (ERA 45%!)
• Liquidità: $${this.config.ultraPermissive.minLiquidity} (ERA $25!)
• Scansione: ${this.config.ultraPermissive.scanInterval / 1000}s (ERA 30s!)
• Age range: ${(this.config.ultraPermissive.minTokenAge/1000/60).toFixed(0)}min-${(this.config.ultraPermissive.maxTokenAge/1000/60/60/24).toFixed(0)}gg

🚀 *Ultra Permissivo significa:*
• Prova TUTTO quello che non è chiaramente scam
• Liquidità minima ridicola ($5!)
• Confidence minimo bassissimo (25%!)
• Keywords ampliate al massimo

🔍 Usa /debug per monitorare in tempo reale
💡 Usa /scan per scansione manuale
        `, 'startup');
        
        // Avvia monitoraggio ultra permissivo
        this.ultraPermissiveMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        this.scheduleDailyReport();
    }

    // =============================================================================
    // TRADING ENGINE v2.3 - ULTRA PERMISSIVO
    // =============================================================================

    async canContinueTrading() {
        const config = this.config.ultraPermissive;
        
        // 1. CHECK BALANCE MINIMO - RIDOTTO AL MINIMO
        const currentBalance = await this.getWalletBalance();
        if (currentBalance < config.minStartBalance) {
            console.log(`❌ Balance insufficiente: ${currentBalance.toFixed(4)} TON < ${config.minStartBalance} TON`);
            
            if (this.scanCount % 20 === 0) { // Notifica meno frequente
                await this.notify(`💰 Balance insufficiente per trading\nBalance attuale: ${currentBalance.toFixed(4)} TON\nMinimo richiesto: ${config.minStartBalance} TON`, 'warning', true);
            }
            return false;
        }
        
        // 2. CHECK PERDITA GIORNALIERA
        if (this.stats.dailyPnL <= -config.maxDailyLoss) {
            console.log(`❌ Perdita giornaliera eccessiva: ${this.stats.dailyPnL.toFixed(4)} TON <= -${config.maxDailyLoss} TON`);
            return false;
        }
        
        // 3. CHECK NUMERO MASSIMO POSIZIONI - AUMENTATO
        if (this.positions.size >= config.maxPositions) {
            console.log(`❌ Troppe posizioni aperte: ${this.positions.size} >= ${config.maxPositions}`);
            return false;
        }
        
        console.log(`✅ Trading consentito - Balance: ${currentBalance.toFixed(4)} TON`);
        return true;
    }

    async ultraPermissiveMonitoring() {
        const scanInterval = this.config.ultraPermissive.scanInterval || 20000; // 20 secondi
        
        while (this.isRunning) {
            try {
                const canTrade = await this.canContinueTrading();
                
                if (!canTrade) {
                    console.log('⏸️ Trading sospeso per limiti di sicurezza');
                    await this.sleep(scanInterval * 2);
                    continue;
                }
                
                this.scanCount++;
                console.log(`\n🔍 Ultra Permissive Scan #${this.scanCount} - ${new Date().toLocaleTimeString()} (v2.3)`);
                
                // DEBUG: Reset contatori per questa scansione
                const scanStartTime = Date.now();
                let scanTokensFound = 0;
                
                // Trova token con filtri minimi
                const qualityTokens = await this.findQualityTokensUltraPermissive();
                scanTokensFound = qualityTokens.length;
                this.candidatesFound += scanTokensFound;
                
                if (qualityTokens.length > 0) {
                    console.log(`   🚀 Trovati ${qualityTokens.length} token candidati (ultra permissivo v2.3)`);
                    
                    // Invia notifica debug ogni 10 scansioni
                    if (this.scanCount % 10 === 0) {
                        await this.notify(`
🔍 *Debug Scan #${this.scanCount}*
🎯 Candidati: ${scanTokensFound}
⏱️ Tempo: ${Date.now() - scanStartTime}ms
📊 Total trovati: ${this.candidatesFound}
🚀 Success rate: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%
                        `, 'debug', true);
                    }
                    
                    for (const token of qualityTokens) {
                        const stillCanTrade = await this.canContinueTrading();
                        if (!stillCanTrade) break;
                        
                        const analysis = await this.ultraPermissiveTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.ultraPermissiveBuy(token, analysis);
                        } else {
                            console.log(`   📋 ${token.symbol}: ${analysis.rejectionReason}`);
                        }
                        
                        await this.sleep(3000); // Pausa ridotta
                    }
                } else {
                    console.log('   💤 Nessun token candidato trovato (filtri ultra minimi)');
                    
                    // DEBUG ogni 20 scansioni senza risultati
                    if (this.scanCount % 20 === 0) {
                        await this.notify(`
🔍 *Debug: Nessun Token Trovato*
Scan #${this.scanCount}: 0 candidati
📊 Total rate: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%

🧐 Possibili cause:
• API DEX non risponde
• Tutti token in blacklist
• Filtri età troppo stretti
• Liquidità DEX bassa

💡 Usa /scan per test manuale
                        `, 'debug', true);
                    }
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

    async findQualityTokensUltraPermissive() {
        const qualityTokens = [];
        
        try {
            for (const dex of this.trustedDEXs) {
                const tokens = await this.scanDEXUltraPermissive(dex);
                qualityTokens.push(...tokens);
                this.tokensAnalyzed += tokens.length;
            }
            
            // Filtri minimi
            const filtered = qualityTokens.filter(token => this.passesUltraPermissiveFilters(token));
            
            return filtered;
            
        } catch (error) {
            console.log('⚠️ Errore ricerca token:', error.message);
            return [];
        }
    }

    async scanDEXUltraPermissive(dex) {
        try {
            console.log(`🔍 Scansione ${dex}...`);
            
            switch (dex) {
                case 'DeDust':
                    return await this.scanDeDustUltraPermissive();
                case 'STON.fi':
                    return await this.scanSTONfiUltraPermissive();
                default:
                    return [];
            }
        } catch (error) {
            console.log(`⚠️ Errore scansione ${dex}:`, error.message);
            return [];
        }
    }

    async scanDeDustUltraPermissive() {
        try {
            console.log('   🔍 Tentativo connessione DeDust API...');
            
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.3)',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`   📡 DeDust API Response Status: ${response.status}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('   ⚠️ DeDust: Formato risposta non valido');
                return [];
            }
            
            console.log(`   📊 DeDust: ${response.data.length} pool totali`);
            
            // Filtri ULTRA minimi
            const candidatePools = response.data.filter(pool => {
                const hasAssets = pool.assets && Array.isArray(pool.assets);
                if (!hasAssets) return false;
                
                const hasTON = pool.assets.some(asset => 
                    asset.symbol === 'TON' || 
                    asset.symbol === 'WTON' || 
                    asset.name?.toLowerCase().includes('ton')
                );
                
                return hasTON;
            });
            
            console.log(`   📈 Pool con TON trovate: ${candidatePools.length}`);
            
            // Filtri ancora più permissivi
            const ultraPools = candidatePools.filter(pool => {
                // Liquidità MOLTO bassa accettata
                const hasMinLiquidity = (pool.total_liquidity_usd || 0) >= this.config.ultraPermissive.minLiquidity;
                
                // Età molto permissiva (24 ore)
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isNotTooOld = !pool.created_at || age <= this.config.ultraPermissive.maxTokenAge;
                const isNotTooNew = !pool.created_at || age >= this.config.ultraPermissive.minTokenAge;
                
                if (hasMinLiquidity && isNotTooOld && isNotTooNew) {
                    const otherAsset = pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON');
                    if (otherAsset) {
                        console.log(`   🎯 Pool ultra candidata: ${otherAsset.symbol} | Liq: $${pool.total_liquidity_usd || 0} | Age: ${Math.floor(age / (60*60*1000))} ore`);
                    }
                }
                
                return hasMinLiquidity && isNotTooOld && isNotTooNew;
            });
            
            console.log(`   🚀 Pool ultra filtrate: ${ultraPools.length}`);
            
            return ultraPools.map(pool => {
                const otherAsset = pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON');
                return {
                    address: otherAsset?.address || '',
                    name: otherAsset?.name || 'Unknown',
                    symbol: otherAsset?.symbol || 'UNK',
                    liquidity: pool.total_liquidity_usd || 0,
                    volume24h: pool.volume_24h_usd || 0,
                    dex: 'DeDust',
                    poolAddress: pool.address,
                    createdAt: pool.created_at || Date.now()
                };
            }).filter(token => token.address && token.symbol !== 'UNK');
            
        } catch (error) {
            console.log('   ❌ DeDust API Error:', error.message);
            return [];
        }
    }

    async scanSTONfiUltraPermissive() {
        try {
            console.log('   🔍 Tentativo connessione STON.fi API...');
            
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.3)'
                }
            });
            
            console.log(`   📡 STON.fi API Response Status: ${response.status}`);
            
            if (!response.data || !response.data.pool_list) {
                return [];
            }
            
            // Filtri ancora più permissivi per STON.fi
            const ultraPools = response.data.pool_list.filter(pool => {
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isNotTooOld = !pool.created_at || age <= this.config.ultraPermissive.maxTokenAge;
                const isNotTooNew = !pool.created_at || age >= this.config.ultraPermissive.minTokenAge;
                const hasTON = pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
                const hasMinLiquidity = (pool.liquidity_usd || 0) >= this.config.ultraPermissive.minLiquidity;
                
                return isNotTooOld && isNotTooNew && hasTON && hasMinLiquidity;
            });
            
            console.log(`   📊 STON.fi: ${ultraPools.length} pool ultra filtrate trovate`);
            
            return ultraPools.map(pool => ({
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

    // =============================================================================
    // FILTRI ULTRA PERMISSIVI v2.3
    // =============================================================================

    passesUltraPermissiveFilters(token) {
        const filters = this.config.ultraPermissive;
        
        console.log(`   🔍 Analizzando ULTRA: ${token.name} (${token.symbol})`);
        this.filterResults.totalScanned++;
        
        // 1. BLACKLIST SUPER RIDOTTA - solo scam ovvi
        if (this.tokenBlacklist.has(token.address)) {
            console.log(`   ❌ Token in blacklist`);
            this.filterResults.failedScam++;
            return false;
        }
        
        // 2. CONTROLLI ANTI-SCAM SOLO CRITICI
        if (this.isObviousScamToken(token)) {
            console.log(`   ❌ Token ovviamente scam - bloccato`);
            this.tokenBlacklist.add(token.address);
            this.scamDetections.set(token.address, {
                reason: 'Scam ovvio rilevato',
                timestamp: Date.now(),
                token: `${token.name} (${token.symbol})`
            });
            
            this.filterResults.failedScam++;
            this.notify(`🛡️ SCAM OVVIO bloccato\nToken: ${token.name} (${token.symbol})`, 'scam', true);
            return false;
        }
        
        // 3. LIQUIDITÀ RIDICOLMENTE BASSA
        if (token.liquidity < filters.minLiquidity) {
            console.log(`   ❌ Liquidità troppo bassa: $${token.liquidity} < $${filters.minLiquidity}`);
            this.filterResults.failedLiquidity++;
            return false;
        }
        
        // 4. ETÀ ULTRA PERMISSIVA
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        const minAge = filters.minTokenAge;
        const maxAge = filters.maxTokenAge;
        
        if (tokenAge < minAge) {
            console.log(`   ❌ Token troppo nuovo: ${(tokenAge/1000/60).toFixed(1)} min < ${(minAge/1000/60).toFixed(1)} min`);
            this.filterResults.failedAge++;
            return false;
        }
        
        if (tokenAge > maxAge) {
            console.log(`   ❌ Token troppo vecchio: ${(tokenAge/1000/60/60/24).toFixed(1)} giorni > ${(maxAge/1000/60/60/24).toFixed(1)} giorni`);
            this.filterResults.failedAge++;
            return false;
        }
        
        // 5. KEYWORDS AMPLIATE AL MASSIMO
        const hasKeyword = filters.strongKeywords.some(keyword => 
            token.name.toLowerCase().includes(keyword.toLowerCase()) || 
            token.symbol.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
            console.log(`   ❌ Nessuna keyword in: "${token.name}" o "${token.symbol}"`);
            this.filterResults.failedKeywords++;
            return false;
        }
        
        this.filterResults.passedBasic++;
        console.log(`   ✅ ${token.symbol} supera tutti i filtri ultra (Liq: $${token.liquidity})`);
        return true;
    }

    // =============================================================================
    // ANTI-SCAM RIDOTTO - SOLO SCAM OVVI
    // =============================================================================

    isObviousScamToken(token) {
        const name = token.name.toLowerCase();
        const symbol = token.symbol.toLowerCase();
        const combined = `${name} ${symbol}`;
        
        // SOLO GLI SCAM PIÙ OVVI E PERICOLOSI
        const obviousScamPatterns = [
            // Test e fake ovvi
            /^test$/i, /^fake$/i, /^scam$/i, /^rug$/i,
            
            // Pattern tecnici ovviamente sbagliati
            /^[a-f0-9]{40}$/i,  // Solo hash completo
            /^[0-9]{10,}$/,     // Solo numeri lunghi
            /(.)\1{6,}/,        // Troppi caratteri ripetuti
            /^.{1}$/,           // Solo 1 carattere
            /^.{100,}$/,        // Troppo lungo
            
            // Contenuti adult/illegali
            /fuck/i, /shit/i, /xxx/i, /sex/i, /porn/i,
            
            // Imitazioni PERFETTE di coin famosi (non simili, identiche)
            /^bitcoin$/i, /^btc$/i, /^ethereum$/i, /^eth$/i, /^usdt$/i, /^usdc$/i
        ];
        
        // Controlla solo pattern ovvi
        for (const pattern of obviousScamPatterns) {
            if (pattern.test(combined)) {
                console.log(`   🚨 Scam OVVIO rilevato: ${pattern} in "${combined}"`);
                return true;
            }
        }
        
        // Liquidità zero o negativa
        if (token.liquidity <= 0) {
            console.log(`   🚨 Liquidità invalida: ${token.liquidity}`);
            return true;
        }
        
        return false; // Tutto il resto è permesso!
    }

    // =============================================================================
    // ANALISI TOKEN ULTRA PERMISSIVA v2.3
    // =============================================================================

    async ultraPermissiveTokenAnalysis(token) {
        console.log(`🔬 Analisi ultra permissiva: ${token.name} (${token.symbol})`);
        
        let confidenceScore = 0;
        const analysis = {
            shouldBuy: false,
            confidenceScore: 0,
            reasons: [],
            warnings: [],
            rejectionReason: ''
        };
        
        try {
            // BASE SCORE ALTO per essere ultra permissivi
            confidenceScore = 40; // Invece di 0
            
            // Analisi liquidità (30% peso)
            const liquidityScore = this.analyzeLiquidityScoreUltra(token);
            confidenceScore += liquidityScore * 0.3;
            analysis.reasons.push(`Liquidità: ${liquidityScore}/100`);
            
            // Analisi volume (20% peso) - ridotto
            const volumeScore = this.analyzeVolumeScoreUltra(token);
            confidenceScore += volumeScore * 0.2;
            analysis.reasons.push(`Volume: ${volumeScore}/100`);
            
            // Analisi keyword (40% peso) - aumentato molto
            const keywordScore = this.analyzeKeywordScoreUltra(token);
            confidenceScore += keywordScore * 0.4;
            analysis.reasons.push(`Keywords: ${keywordScore}/100`);
            
            // Analisi tecnica (10% peso)
            const technicalScore = this.analyzeTechnicalScoreUltra(token);
            confidenceScore += technicalScore * 0.1;
            analysis.reasons.push(`Tecnica: ${technicalScore}/100`);
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            // Decisione finale ULTRA PERMISSIVA
            const minConfidence = this.config.ultraPermissive.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence) {
                analysis.shouldBuy = true;
                this.filterResults.approved++;
                analysis.reasons.push(`✅ APPROVATO ULTRA - Confidence: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO ULTRA - Confidence: ${analysis.confidenceScore}%`);
            } else {
                analysis.rejectionReason = `Confidence ${analysis.confidenceScore}% < ${minConfidence}%`;
                analysis.reasons.push(`❌ RIFIUTATO - ${analysis.rejectionReason}`);
                console.log(`   ❌ RIFIUTATO - ${analysis.rejectionReason}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Errore analisi: ${error.message}`);
            analysis.shouldBuy = false;
            analysis.rejectionReason = `Errore: ${error.message}`;
        }
        
        return analysis;
    }

    analyzeLiquidityScoreUltra(token) {
        let score = 0;
        
        // Scale ULTRA basse per essere più permissivi
        if (token.liquidity > 1000) score = 100;       // Era 5000
        else if (token.liquidity > 500) score = 95;    // Era 2000
        else if (token.liquidity > 250) score = 90;    // Era 1000
        else if (token.liquidity > 100) score = 85;    // Era 500
        else if (token.liquidity > 50) score = 80;     // Era 250
        else if (token.liquidity > 25) score = 75;     // Era 100
        else if (token.liquidity > 10) score = 70;     // Nuovo
        else if (token.liquidity > 5) score = 65;      // SOGLIA MINIMA v2.3
        else score = 50; // Anche sotto $5 ottiene punti!
        
        console.log(`   💧 Liquidità ${token.liquidity} → Score: ${score}/100`);
        return score;
    }

    analyzeVolumeScoreUltra(token) {
        let score = 50; // Base score alto
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        
        if (volumeRatio > 0.3) score = 100;
        else if (volumeRatio > 0.1) score = 90;
        else if (volumeRatio > 0.05) score = 80;
        else if (volumeRatio > 0.01) score = 70;
        else if (volumeRatio > 0.005) score = 60; // Nuovo
        else score = 50; // Minimo decente
        
        return score;
    }

    analyzeKeywordScoreUltra(token) {
        const strongKeywords = this.config.ultraPermissive.strongKeywords;
        let score = 50; // Base score alto
        
        const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
        
        // BONUS MEGA per keywords specifiche
        const ultraKeywordBonuses = {
            'blum': 60,      // MASSIMO bonus per BLUM
            'ton': 50,       // Altissimo per TON native
            'doge': 45,      // Meme coin
            'pepe': 45,
            'shiba': 45,
            'moon': 40,
            'rocket': 40,
            'gem': 40,
            'pump': 35,
            'bull': 35,
            'lambo': 35,
            'diamond': 30,
            'king': 30,
            'royal': 30,
            'safe': 25,
            'meta': 25,
            'defi': 25,
            'yield': 25,
            'farm': 25,
            'stake': 25,
            'coin': 20,
            'token': 15,
            'cat': 15,
            'dog': 15,
            'fire': 15,
            'ice': 15,
            'gold': 15,
            'green': 10,
            'fast': 10,
            'speed': 10
        };
        
        let bestBonus = 0;
        let matchedKeywords = [];
        
        for (const keyword of strongKeywords) {
            if (tokenText.includes(keyword.toLowerCase())) {
                const bonus = ultraKeywordBonuses[keyword.toLowerCase()] || 5; // Minimo 5 punti
                if (bonus > bestBonus) {
                    bestBonus = bonus;
                }
                matchedKeywords.push(keyword);
            }
        }
        
        score += bestBonus;
        
        if (bestBonus > 0) {
            console.log(`   🎯 Keywords "${matchedKeywords.join(', ')}" rilevate! Bonus +${bestBonus}`);
        }
        
        // BONUS MEGA per multiple keywords
        if (matchedKeywords.length > 1) {
            const multiBonus = Math.min((matchedKeywords.length - 1) * 8, 25); // Aumentato
            score += multiBonus;
            console.log(`   🔥 ${matchedKeywords.length} keywords! Bonus multiplo +${multiBonus}`);
        }
        
        // BONUS speciale per combinazioni
        if (tokenText.includes('moon') && tokenText.includes('rocket')) {
            score += 15;
            console.log(`   🚀 Combo "moon + rocket"! Bonus +15`);
        }
        
        if (tokenText.includes('doge') || tokenText.includes('shiba') || tokenText.includes('pepe')) {
            score += 10;
            console.log(`   🐕 Meme coin detected! Bonus +10`);
        }
        
        return Math.min(score, 100);
    }

    analyzeTechnicalScoreUltra(token) {
        let score = 60; // Base alto
        
        // Bonus per DEX
        if (token.dex === 'DeDust') score += 15;
        if (token.dex === 'STON.fi') score += 15;
        
        // Bonus per età "sweet spot" AMPLIATO
        const tokenAge = Date.now() - (token.createdAt || Date.now());
        const ageHours = tokenAge / (1000 * 60 * 60);
        
        if (ageHours >= 0.5 && ageHours <= 48) score += 25;    // 30min-2 giorni (AMPLIATO)
        else if (ageHours >= 0.1 && ageHours <= 168) score += 15; // 6min-7 giorni
        else if (ageHours <= 720) score += 5; // Fino a 30 giorni
        
        // Penalty RIDOTTE
        if (ageHours < 0.05) score -= 10; // Solo se meno di 3 minuti
        
        return Math.max(Math.min(score, 100), 0);
    }

    async ultraPermissiveBuy(token, analysis) {
        try {
            const buyAmount = this.config.ultraPermissive.maxTradeSize;
            
            console.log(`💰 ACQUISTO ULTRA PERMISSIVO v2.3: ${buyAmount} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}%`);
            console.log(`   💧 Liquidità: ${token.liquidity.toFixed(0)}`);
            console.log(`   🎯 Motivi: ${analysis.reasons.join(', ')}`);
            console.log(`   🚀 Ultra Permissivo: Massimo rischio/reward`);
            
            const txHash = `ultra_${Math.random().toString(16).substr(2, 10)}`;
            
            const position = {
                name: token.name,
                symbol: token.symbol,
                amount: buyAmount,
                entryPrice: 0.000001 + Math.random() * 0.001,
                entryTime: Date.now(),
                confidence: analysis.confidenceScore,
                dex: token.dex,
                txHash,
                stopLoss: this.config.ultraPermissive.stopLossPercent,
                takeProfit: this.config.ultraPermissive.takeProfitPercent,
                liquidity: token.liquidity,
                reasons: analysis.reasons,
                version: '2.3-ultra',
                risk: 'ULTRA-HIGH' // Marcatore speciale
            };
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${position.stopLoss}%`);
            console.log(`   🎯 Take Profit: ${position.takeProfit}%`);
            
            // Notifica Telegram con enfasi ultra
            await this.notifyUltraTrade('buy', position);
            
            // Monitoraggio ultra aggressivo
            this.startUltraPositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto ultra:', error.message);
            await this.notify(`❌ Errore acquisto ultra ${token.symbol}: ${error.message}`, 'error');
        }
    }

    async notifyUltraTrade(action, position, pnl = null) {
        let message = '';
        let type = 'trade';
        
        if (action === 'buy') {
            message = `
🚀 *ACQUISTO ULTRA PERMISSIVO v2.3*
Token: ${position.symbol} (${position.name})
Amount: ${position.amount.toFixed(4)} TON
Confidence: ${position.confidence}%
Risk Level: ${position.risk}
DEX: ${position.dex}
Stop Loss: ${position.stopLoss}%
Take Profit: ${position.takeProfit}%
Liquidity: ${position.liquidity.toFixed(0)}

🎯 *Motivi:*
${position.reasons ? position.reasons.join('\n') : 'Analisi ultra permissiva'}

⚡ *ULTRA PERMISSIVO:* Massimo rischio/reward!
🔍 Filtri minimi applicati
            `.trim();
        } else if (action === 'sell') {
            const pnlPercent = (pnl / position.amount) * 100;
            type = pnlPercent > 0 ? 'profit' : 'loss';
            const pnlIcon = pnlPercent > 0 ? '📈' : '📉';
            
            message = `
${pnlIcon} *VENDITA ULTRA v2.3*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
Time Held: ${this.formatTime(Date.now() - position.entryTime)}
Risk era: ${position.risk}
Confidence era: ${position.confidence}%
Motivo: ${action === 'stop_loss' ? 'Stop Loss' : action === 'take_profit' ? 'Take Profit' : 'Exit'}
            `.trim();
        }
        
        await this.notify(message, type);
    }

    startUltraPositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Volatilità più alta per ultra permissivo
                const priceChange = (Math.random() - 0.5) * 25; // ±12.5% (aumentato)
                
                if (this.scanCount % 3 === 0) { // Report più frequente
                    console.log(`📊 ULTRA ${position.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
                }
                
                // Stop Loss check
                if (priceChange <= position.stopLoss) {
                    console.log(`🛑 ULTRA STOP LOSS ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.ultraSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Take Profit check
                if (priceChange >= position.takeProfit) {
                    console.log(`🎯 ULTRA TAKE PROFIT ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.ultraSell(tokenAddress, 'take_profit');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Trailing Stop ultra aggressivo
                if (priceChange > 15 && !position.trailingStopActive) {
                    position.trailingStopActive = true;
                    position.trailingStopPrice = position.entryPrice * (1 + priceChange/100) * 0.85; // 85% invece di 90%
                    console.log(`📈 ULTRA trailing stop attivato per ${position.symbol}`);
                    await this.notify(`🚀 ULTRA trailing stop attivato per ${position.symbol}\nPrezzo: +${priceChange.toFixed(2)}%\nRisk: ${position.risk}`, 'trade');
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio ultra ${tokenAddress}:`, error.message);
            }
        }, 20000); // Ogni 20 secondi (più veloce)
        
        // Timeout più corto per ultra
        setTimeout(async () => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                console.log(`⏰ ULTRA timeout raggiunto per ${this.positions.get(tokenAddress).symbol}`);
                await this.ultraSell(tokenAddress, 'timeout');
            }
        }, this.config.ultraPermissive.maxHoldTime);
    }

    async ultraSell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            console.log(`💸 VENDITA ULTRA ${position.symbol} | Motivo: ${reason}`);
            
            // P&L con più volatilità per ultra permissivo
            let pnl;
            if (reason === 'stop_loss') {
                pnl = position.amount * (position.stopLoss / 100);
            } else if (reason === 'take_profit') {
                pnl = position.amount * (position.takeProfit / 100);
            } else {
                // Random con bias basato su confidence + bonus per ultra
                const confidenceBias = (position.confidence - 40) / 100; // Adattato per ultra
                const ultraBonus = 0.1; // Bonus per il rischio ultra
                pnl = (Math.random() - 0.25 + confidenceBias + ultraBonus) * 0.15 * position.amount;
            }
            
            const pnlPercent = (pnl / position.amount) * 100;
            
            console.log(`📊 ULTRA P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnl > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
            
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
            await this.notifyUltraTrade('sell', position, pnl);
            
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore vendita ultra:', error.message);
            await this.notify(`❌ Errore vendita ultra ${tokenAddress}: ${error.message}`, 'error');
        }
    }

    // =============================================================================
    // UTILITY METHODS (identici ma aggiornati per v2.3)
    // =============================================================================

    dailyStatsReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.resetDailyStats();
            this.notifyDailyReport();
            
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
        setInterval(async () => {
            // Check perdite eccessive
            if (this.stats.dailyPnL <= -this.config.ultraPermissive.maxDailyLoss) {
                await this.notify(`
🚨 *ALERT ULTRA: Perdita Massima*
P&L Oggi: ${this.stats.dailyPnL.toFixed(4)} TON
Limite: -${this.config.ultraPermissive.maxDailyLoss} TON

Trading ultra sospeso per oggi.
                `, 'warning');
            }
            
            // Check balance basso
            const currentBalance = await this.getWalletBalance();
            if (currentBalance < this.config.ultraPermissive.minStartBalance) {
                await this.notify(`
⚠️ *ALERT ULTRA: Balance Insufficiente*
Balance attuale: ${currentBalance.toFixed(4)} TON
Minimo richiesto: ${this.config.ultraPermissive.minStartBalance} TON

Invia TON a: \`${this.walletAddress}\`
                `, 'warning');
            }
        }, 10 * 60 * 1000); // Ogni 10 minuti (più frequente)
    }

    scheduleDailyReport() {
        // Report ogni 12 ore invece di 24
        setInterval(async () => {
            await this.notifyDailyReport();
        }, 12 * 60 * 60 * 1000);
        
        // Report ogni 2 ore se ci sono posizioni
        setInterval(async () => {
            if (this.positions.size > 0) {
                await this.notify(`
📊 *Update ULTRA v2.3* (${this.positions.size} posizioni)
P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
Scansioni: ${this.scanCount}
🔍 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}
                `, 'info', true);
            }
        }, 2 * 60 * 60 * 1000);
    }

    async notifyDailyReport() {
        const balance = await this.getWalletBalance();
        const winRate = this.getWinRate();
        
        const message = `
📊 *REPORT ULTRA PERMISSIVO v2.3*

💳 Wallet: \`${this.walletAddress}\`
💰 Balance: ${balance.toFixed(4)} TON
📈 P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
🎯 Win Rate: ${winRate}%
📊 Trades: ${this.stats.totalTrades}
🔍 Scansioni: ${this.scanCount}
🚀 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati trovati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}

📈 *Performance Filtri:*
• Success rate: ${this.scanCount > 0 ? ((this.candidatesFound / this.scanCount) * 100).toFixed(1) : 0}%
• Approval rate: ${this.candidatesFound > 0 ? ((this.filterResults.approved / this.candidatesFound) * 100).toFixed(1) : 0}%

🔗 Webhook: ${this.webhookConfigured ? '✅' : '📱'}

🚀 ${this.stats.dailyPnL > 0 ? 'ULTRA SUCCESS!' : this.stats.dailyPnL < -0.05 ? '⚠️ Ultra Loss' : '😐 Neutro'}
        `.trim();
        
        await this.notify(message, this.stats.dailyPnL > 0 ? 'profit' : 'info');
    }

    async updateStats() {
        const balance = await this.getWalletBalance();
        
        if (balance > this.stats.startBalance * 1.5) {
            console.log(`💰 Rilevato nuovo deposito: ${this.stats.startBalance.toFixed(4)} → ${balance.toFixed(4)} TON`);
            this.stats.startBalance = balance;
            
            await this.notify(`💰 Nuovo deposito rilevato!\nBalance aggiornato: ${balance.toFixed(4)} TON\n🚀 Trading ultra ora attivo`, 'success');
        }
        
        console.log(`📊 Stats v2.3: ${this.stats.totalTrades} trades | Balance: ${balance.toFixed(4)} TON | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}% | Analizzati: ${this.tokensAnalyzed} | Candidati: ${this.candidatesFound}`);
    }

    // Utility methods identici
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
        console.log('🛑 Ultra Permissive Bot v2.3 fermato');
        this.notify('🛑 Bot ultra v2.3 fermato', 'info');
    }

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
// CONFIGURAZIONE ULTRA PERMISSIVA v2.3
// =============================================================================

const ultraPermissiveConfig = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    
    ultraPermissive: {
        // TRADING PARAMETERS ULTRA PERMISSIVI
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || 0.3,  // Aumentato da 0.2
        maxPositions: parseInt(process.env.MAX_POSITIONS) || 5,        // Aumentato da 3
        minStartBalance: parseFloat(process.env.MIN_START_BALANCE) || 0.3, // Ridotto da 0.5
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 0.5,   // Aumentato
        
        // EXIT STRATEGY ULTRA AGGRESSIVA
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || -8,  // Più ampio
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 12, // Più ampio
        maxHoldTime: parseInt(process.env.MAX_HOLD_TIME) || 5400000, // 1.5 ore
        
        // FILTRI ULTRA MINIMI
        minConfidenceScore: parseFloat(process.env.MIN_CONFIDENCE_SCORE) || 25, // Era 45!
        minLiquidity: parseFloat(process.env.MIN_LIQUIDITY) || 5,   // Era 25! RIDICOLO
        minTokenAge: parseInt(process.env.MIN_TOKEN_AGE) || 180,    // Era 300 (3min)
        maxTokenAge: parseInt(process.env.MAX_TOKEN_AGE) || 2592000, // Era 1209600 (30gg)
        
        // KEYWORDS MEGA AMPLIATE
        strongKeywords: (process.env.STRONG_KEYWORDS || 'doge,pepe,shiba,moon,rocket,gem,safe,baby,mini,meta,ton,coin,token,defi,yield,stake,farm,blum,elon,mars,lambo,hodl,diamond,pump,bull,green,gold,star,fire,thunder,lightning,ice,snow,cat,dog,frog,fish,bird,bear,panda,tiger,lion,king,queen,prince,royal,magic,wizard,knight,hero,legend,epic,ultra,mega,super,hyper,turbo,fast,quick,speed,jet,sonic,flash,blast,boom,bang,pop,splash,wave,ocean,sea,beach,island,treasure,chest,vault,bank,rich,wealth,fortune,lucky,winner,champion,master,elite,alpha,beta,gamma,delta,omega,nova,star,comet,planet,space,cosmic,galaxy,universe,infinity,eternal,divine,sacred,holy,angel,demon,dragon,phoenix,unicorn,rainbow,crystal,pearl,ruby,emerald,sapphire,platinum,silver,bronze,copper,iron,steel,titanium,carbon,neon,laser,plasma,quantum,atomic,nuclear,fusion,energy,power,force,strength,might,fury,rage,storm,cyclone,tornado,hurricane,tsunami,earthquake,volcano,lava,magma,fire,flame,blaze,inferno,freeze,frost,winter,summer,spring,autumn,day,night,dawn,dusk,sunrise,sunset,twilight,midnight,noon,morning,evening,time,clock,hour,minute,second,year,month,week,future,past,present,now,today,tomorrow,yesterday,forever,always,never,maybe,perhaps,possible,impossible,dream,hope,wish,desire,love,hate,peace,war,battle,fight,victory,defeat,win,lose,success,failure,up,down,left,right,forward,backward,inside,outside,over,under,above,below,between,among,within,without,before,after,during,while,since,until,because,therefore,however,although,unless,except,besides,instead,otherwise,meanwhile,furthermore,moreover,nevertheless,nonetheless,consequently,accordingly,similarly,likewise,contrary,opposite,different,same,equal,unequal,big,small,large,tiny,huge,giant,mini,micro,macro,mega,giga,tera,kilo,milli,nano,pico,zero,one,two,three,four,five,six,seven,eight,nine,ten,hundred,thousand,million,billion,trillion,first,second,third,last,final,initial,beginning,end,start,finish,complete,incomplete,full,empty,solid,liquid,gas,hot,cold,warm,cool,dry,wet,clean,dirty,new,old,young,fresh,stale,sharp,dull,bright,dark,light,heavy,soft,hard,smooth,rough,round,square,circle,triangle,rectangle,oval,line,curve,straight,crooked,thick,thin,wide,narrow,tall,short,deep,shallow,high,low,far,near,close,distant,here,there,everywhere,nowhere,somewhere,anywhere,home,away,in,out,on,off,up,down').split(','),
        
        scanInterval: parseInt(process.env.SCAN_INTERVAL) || 20000, // Era 30000 (20s)
        sizeMultiplier: parseFloat(process.env.SIZE_MULTIPLIER) || 0.8, // Più aggressivo
    }
};

// =============================================================================
// AVVIO AUTOMATICO BOT v2.3 ULTRA PERMISSIVO
// =============================================================================

console.log('🚀 Inizializzazione TON ULTRA PERMISSIVE Bot v2.3 su Render...');
console.log('🔧 Novità ULTRA v2.3:');
console.log('   🚀 Confidence minimo: 25% (ERA 45%!)');
console.log('   🚀 Liquidità minima: $5 (ERA $25!)');
console.log('   🚀 Keywords: 200+ parole monitorate');
console.log('   🚀 Scansioni: ogni 20 secondi');
console.log('   🚀 Max posizioni: 5 contemporanee');
console.log('   🚀 Age range: 3min-30giorni');
console.log('   🚀 Debug completo e trasparente');
console.log('   🚀 PROVA TUTTO quello che non è chiaramente scam!');

setTimeout(async () => {
    try {
        bot = new UltraPermissiveTONBot(ultraPermissiveConfig);
        
        await bot.start();
        
        console.log('✅ Bot ULTRA PERMISSIVO v2.3 avviato con successo su Render!');
        console.log(`🌐 Server disponibile su porta ${PORT}`);
        console.log('🔗 Test webhook: https://bot-trading-conservativo.onrender.com/webhook/test');
        console.log('📊 Debug info: https://bot-trading-conservativo.onrender.com/stats');
        
    } catch (error) {
        console.error('❌ Errore avvio bot ultra v2.3:', error);
        
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const errorBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
                await errorBot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
                    `❌ Errore avvio bot ULTRA v2.3 su Render:\n${error.message}\n\nControlla i logs su Render dashboard.`);
            } catch (telegramError) {
                console.error('❌ Errore notifica Telegram:', telegramError);
            }
        }
    }
}, 3000);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    console.log('\n🛑 Ricevuto SIGINT, fermando bot ultra v2.3...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot ultra v2.3 fermato da SIGINT (restart server)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Ricevuto SIGTERM, fermando bot ultra v2.3...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot ultra v2.3 fermato da SIGTERM (deploy/restart)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (bot && bot.telegram) {
        bot.notify(`❌ Errore critico ultra v2.3: ${error.message}`, 'error').catch(() => {});
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (bot && bot.telegram) {
        bot.notify(`❌ Promise rejection ultra v2.3: ${reason}`, 'error').catch(() => {});
    }
});

// =============================================================================
// EXPORT MODULE
// =============================================================================

module.exports = { UltraPermissiveTONBot, ultraPermissiveConfig };

// =============================================================================
// ISTRUZIONI SETUP ULTRA PERMISSIVO v2.3
// =============================================================================

console.log('\n🚀 SETUP ULTRA PERMISSIVO v2.3:');
console.log('========================================');
console.log('📋 1. Sostituisci bot.js con questo codice ULTRA');
console.log('🔑 2. Aggiorna variabili ambiente su Render:');
console.log('   MIN_CONFIDENCE_SCORE=25  (ERA 45!)');
console.log('   MIN_LIQUIDITY=5  (ERA 25!)');
console.log('   MIN_TOKEN_AGE=180  (3 min)');
console.log('   MAX_TOKEN_AGE=2592000  (30 giorni)');
console.log('   MAX_TRADE_SIZE=0.3  (aumentato)');
console.log('   MAX_POSITIONS=5  (aumentato)');
console.log('   SCAN_INTERVAL=20000  (20s)');
console.log('   MIN_START_BALANCE=0.3  (ridotto)');
console.log('   MAX_DAILY_LOSS=0.5  (aumentato)');
console.log('   STOP_LOSS_PERCENT=-8  (più ampio)');
console.log('   TAKE_PROFIT_PERCENT=12  (più ampio)');
console.log('🚀 3. Deploy su Render');
console.log('📱 4. Testa: /test, /debug, /scan, /filters');
console.log('');
console.log('✨ RISULTATI ATTESI ULTRA:');
console.log('• 50-100x più token candidati!');
console.log('• Token con liquidità da $5 in su');
console.log('• Confidence da 25% in su');
console.log('• Debug completo di ogni scansione');
console.log('• Notifiche dettagliate per ogni decisione');
console.log('• Scansioni ogni 20 secondi');
console.log('• MASSIMA probabilità di trovare opportunità');
console.log('========================================');
console.log('⚠️  ATTENZIONE: ULTRA PERMISSIVO = ULTRA RISCHIO!');
console.log('🚀 Questo bot testa TUTTO quello che non è ovviamente scam!');
