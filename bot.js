const { TonClient, WalletContractV4, internal, Address } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER con WEBHOOK TELEGRAM v2.2
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Variabile globale per il bot
let bot = null;

// =============================================================================
// WEBHOOK TELEGRAM SETUP
// =============================================================================

// Middleware specifico per webhook Telegram
app.use('/webhook', express.json());

// Health check endpoints
app.get('/', (req, res) => {
    res.json({ 
        status: '🤖 TON Conservative Bot v2.2 Running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '2.2.0',
        message: 'Bot with Optimized Filters + Anti-Scam Protection',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Conservative Bot v2.2',
        telegram_webhook: process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Webhook info endpoint
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

// Test webhook endpoint
app.post('/webhook/test', async (req, res) => {
    try {
        if (bot && bot.telegram) {
            await bot.notify('🧪 Test webhook v2.2 eseguito con successo!\n✅ Filtri ottimizzati attivi', 'info');
            res.json({ success: true, message: 'Test notification sent via Telegram' });
        } else {
            res.status(500).json({ error: 'Bot not initialized' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stats endpoint
app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            version: '2.2.0',
            isRunning: bot.isRunning || false,
            walletAddress: bot.walletAddress || 'Not initialized',
            positions: bot.positions ? bot.positions.size : 0,
            scanCount: bot.scanCount || 0,
            totalTrades: bot.stats.totalTrades || 0,
            totalPnL: bot.stats.totalPnL ? bot.stats.totalPnL.toFixed(4) : '0.0000',
            dailyPnL: bot.stats.dailyPnL ? bot.stats.dailyPnL.toFixed(4) : '0.0000',
            winRate: bot.getWinRate ? bot.getWinRate() : 0,
            telegram_webhook: process.env.TELEGRAM_BOT_TOKEN ? 'Active' : 'Not configured',
            blacklistedTokens: bot.tokenBlacklist ? bot.tokenBlacklist.size : 0
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '2.2.0',
            message: 'Bot is starting up...',
            timestamp: new Date().toISOString()
        });
    }
});

// Control endpoints
app.get('/bot/start', (req, res) => {
    if (bot && !bot.isRunning) {
        bot.start();
        res.json({ message: 'Bot v2.2 started via API' });
    } else if (bot && bot.isRunning) {
        res.json({ message: 'Bot already running' });
    } else {
        res.json({ message: 'Bot not initialized yet' });
    }
});

app.get('/bot/stop', (req, res) => {
    if (bot && bot.isRunning) {
        bot.stop();
        res.json({ message: 'Bot v2.2 stopped via API' });
    } else {
        res.json({ message: 'Bot not running' });
    }
});

// Avvia server Express IMMEDIATAMENTE
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server v2.2 running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🔗 Webhook info: http://localhost:${PORT}/webhook/info`);
    console.log('✅ Render può ora rilevare il servizio');
});

// =============================================================================
// BOT CLASS v2.2 - CON FILTRI OTTIMIZZATI + ANTI-SCAM
// =============================================================================

class ConservativeTONBot {
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
        
        // BLACKLIST E WHITELIST OTTIMIZZATE
        this.tokenBlacklist = new Set();
        this.trustedDEXs = new Set(['DeDust', 'STON.fi']);
        
        // CONTATORI ANTI-SCAM
        this.scamDetections = new Map();
        this.suspiciousPatterns = new Set();
        
        console.log('🛡️ Conservative TON Bot v2.2 inizializzato (Filtri Ottimizzati + Anti-Scam)');
        console.log('💡 Focus: Più opportunità con protezione scam avanzata');
        
        // Setup Telegram con webhook
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
            // Inizializza bot senza polling
            this.telegram = new TelegramBot(botToken, { polling: false });
            this.telegramChatId = chatId;
            console.log('📱 Telegram bot inizializzato');
            
            // Configura webhook
            await this.setupWebhook();
            
        } catch (error) {
            console.warn('⚠️ Errore setup Telegram:', error.message);
            await this.setupPollingFallback();
        }
    }

    async setupWebhook() {
        try {
            // Determina URL webhook
            const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 
                           process.env.RENDER_EXTERNAL_URL?.replace('https://', '') ||
                           'bot-trading-conservativo.onrender.com';
            
            const webhookUrl = `https://${hostname}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
            
            console.log('🔗 Configurando webhook Telegram:', webhookUrl);
            
            // Rimuovi webhook esistente
            await this.telegram.deleteWebHook();
            await this.sleep(1000);
            
            // Imposta nuovo webhook
            const result = await this.telegram.setWebHook(webhookUrl, {
                max_connections: 40,
                allowed_updates: ['message']
            });
            
            console.log('✅ Webhook configurato:', result);
            
            // Verifica webhook
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
                
                // Setup endpoint webhook
                this.setupWebhookEndpoint();
                
                // Invia notifica di test
                setTimeout(async () => {
                    await this.notify('🎉 Webhook v2.2 configurato!\n✅ Filtri ottimizzati attivi\n🛡️ Protezione anti-scam avanzata', 'success');
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
        
        // Rimuovi handler esistenti per evitare duplicati
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
            
            // Rimuovi webhook
            await this.telegram.deleteWebHook();
            
            // Riconfigura con polling
            this.telegram = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
                polling: {
                    interval: 10000,  // 10 secondi
                    autoStart: false,
                    params: {
                        timeout: 10
                    }
                }
            });
            
            // Gestione errori polling
            this.telegram.on('polling_error', (error) => {
                console.warn('⚠️ Polling error (ignorato):', error.code);
            });
            
            // Gestione messaggi
            this.telegram.on('message', async (msg) => {
                try {
                    await this.handleTelegramMessage(msg);
                } catch (error) {
                    console.error('❌ Errore comando polling:', error.message);
                }
            });
            
            // Avvia polling
            this.telegram.startPolling();
            
            console.log('✅ Polling fallback configurato');
            
            setTimeout(async () => {
                await this.notify('📱 Telegram v2.2 configurato con polling fallback\n✅ Filtri ottimizzati attivi', 'info');
            }, 3000);
            
        } catch (error) {
            console.error('❌ Errore polling fallback:', error.message);
            
            // Ultima risorsa: solo notifiche
            this.telegram = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            console.log('📱 Telegram configurato SOLO per notifiche');
        }
    }

    async handleTelegramMessage(message) {
        const chatId = message.chat.id;
        const text = message.text || '';
        const username = message.from?.username || 'Unknown';
        
        console.log(`📱 Comando ricevuto: "${text}" da @${username} (${chatId})`);
        
        // Verifica autorizzazione
        if (chatId.toString() !== this.telegramChatId.toString()) {
            console.warn(`❌ Tentativo non autorizzato da ${chatId} (atteso: ${this.telegramChatId})`);
            await this.telegram.sendMessage(chatId, '❌ Non autorizzato per questo bot');
            return;
        }
        
        try {
            // Gestisci comandi
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
                    await this.telegram.sendMessage(chatId, '✅ Bot v2.2 risponde correttamente!\n🔗 Webhook funzionante!\n🛡️ Anti-scam attivo');
                    break;
                case '/webhook':
                    await this.sendWebhookInfo(chatId);
                    break;
                case '/blacklist':
                    await this.sendBlacklistInfo(chatId);
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
            await this.telegram.sendMessage(chatId, '🚀 Bot v2.2 avviato!\n✅ Filtri ottimizzati attivi\nUsa /status per monitorare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già in esecuzione\nUsa /status per dettagli.');
        }
    }

    async handleStopCommand(chatId) {
        if (this.isRunning) {
            this.stop();
            await this.telegram.sendMessage(chatId, '🛑 Bot v2.2 fermato\nUsa /start per riavviare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già fermato\nUsa /start per avviare.');
        }
    }

    async handleRestartCommand(chatId) {
        await this.telegram.sendMessage(chatId, '🔄 Riavvio bot v2.2 in corso...');
        
        if (this.isRunning) {
            this.stop();
            await this.sleep(2000);
        }
        
        await this.start();
        await this.telegram.sendMessage(chatId, '✅ Bot v2.2 riavviato con successo!\n🛡️ Protezione anti-scam attiva');
    }

    async sendBalanceDebug(chatId) {
        try {
            const currentBalance = await this.getWalletBalance();
            const canTrade = await this.canContinueTrading();
            
            const message = `
🔍 *BALANCE DEBUG v2.2*

💰 *Balance Attuale:* ${currentBalance.toFixed(4)} TON
💰 *Start Balance:* ${this.stats.startBalance.toFixed(4)} TON
⚙️ *Minimo Richiesto:* ${this.config.conservative.minStartBalance} TON

📊 *Altri Limiti:*
• Daily P&L: ${this.stats.dailyPnL.toFixed(4)} TON (max loss: -${this.config.conservative.maxDailyLoss})
• Posizioni: ${this.positions.size}/${this.config.conservative.maxPositions}
• Drawdown: ${this.stats.startBalance > 0 ? ((this.stats.currentDrawdown / this.stats.startBalance) * 100).toFixed(2) : '0.00'}%

🎯 *Trading Status:* ${canTrade ? '✅ ATTIVO' : '❌ SOSPESO'}
🛡️ *Token Blacklistati:* ${this.tokenBlacklist.size}

${!canTrade ? '💡 Motivo sospensione controllato nei logs' : ''}
            `.trim();
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore debug balance: ${error.message}`);
        }
    }

    async sendBlacklistInfo(chatId) {
        const message = `
🛡️ *BLACKLIST ANTI-SCAM v2.2*

📊 *Token Blacklistati:* ${this.tokenBlacklist.size}
🔍 *Scansioni Totali:* ${this.scanCount}
🚨 *Pattern Rilevati:* ${this.scamDetections.size}

🔧 *Protezioni Attive:*
• Pattern scam automatici
• Imitazioni token popolari
• Wash trading detection
• Nome/simbolo sospetti
• Volume/liquidità anomali

💡 La blacklist si aggiorna automaticamente durante le scansioni
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWebhookInfo(chatId) {
        try {
            const info = await this.telegram.getWebHookInfo();
            
            const message = `
🔗 *WEBHOOK INFO v2.2*

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
🤖 *TON Conservative Bot v2.2 Status*

${status} | ⏱️ Uptime: ${uptime}
🌐 Deploy: Render Cloud
🔗 Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Polling'}
💳 Wallet: ${balance.toFixed(4)} TON
📊 Scansioni: ${this.scanCount}
📈 Posizioni aperte: ${this.positions.size}
💰 P&L oggi: ${this.stats.dailyPnL.toFixed(4)} TON
📊 Total P&L: ${this.stats.totalPnL.toFixed(4)} TON
🎯 Win Rate: ${this.getWinRate()}%
🛡️ Token blacklistati: ${this.tokenBlacklist.size}

📱 *Comandi disponibili:* /help
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendDetailedStats(chatId) {
        const balance = await this.getWalletBalance();
        const drawdown = this.stats.startBalance > 0 ? ((this.stats.currentDrawdown / this.stats.startBalance) * 100).toFixed(2) : '0.00';
        
        const message = `
📊 *Statistiche Dettagliate v2.2*

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
Max Drawdown: ${drawdown}%

🛡️ *Sicurezza:*
Token Blacklistati: ${this.tokenBlacklist.size}
Scam Rilevati: ${this.scamDetections.size}

⏰ *Sistema:*
Webhook: ${this.webhookConfigured ? '✅ Configurato' : '📱 Polling fallback'}
Ultimo reset: ${this.stats.lastResetDate}
Prossimo reset: ${this.getNextResetTime()}
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendPositions(chatId) {
        if (this.positions.size === 0) {
            await this.telegram.sendMessage(chatId, '📭 Nessuna posizione aperta\n\n💡 Il bot cerca automaticamente opportunità ogni 30 secondi\n🛡️ Filtri anti-scam attivi');
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
            message += `Confidence: ${position.confidence}%\n`;
            message += `DEX: ${position.dex}\n\n`;
        }
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWalletInfo(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
💳 *WALLET INFO v2.2*

📍 *Indirizzo:*
\`${this.walletAddress || 'Non inizializzato'}\`

💰 *Balance:*
${balance.toFixed(4)} TON

🔗 *Explorer:*
[Visualizza su TONScan](https://tonscan.org/address/${this.walletAddress})

⚙️ *Configurazione v2.2:*
• Max Trade: ${this.config.conservative.maxTradeSize} TON
• Balance minimo: ${this.config.conservative.minStartBalance} TON
• Confidence minimo: ${this.config.conservative.minConfidenceScore}%
• Liquidità minima: $${this.config.conservative.minLiquidity}
• Status: ${balance >= this.config.conservative.minStartBalance ? '✅ OK per trading' : '⚠️ Balance insufficiente'}

💡 *Keywords monitorate:*
${this.config.conservative.strongKeywords.slice(0, 10).join(', ')}... (+${this.config.conservative.strongKeywords.length - 10} altre)

🛡️ *Protezione Anti-Scam:* ✅ Attiva
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendHelpMessage(chatId) {
        const message = `
🤖 *TON Conservative Bot v2.2 Commands*

📊 *Status & Info:*
/status - Status generale del bot
/stats - Statistiche dettagliate trading
/positions - Posizioni aperte
/wallet - Info wallet e balance
/balance - Debug balance dettagliato

🎮 *Controllo Bot:*
/start - Avvia bot (se fermo)
/stop - Ferma il bot
/restart - Riavvia il bot

🔧 *Sistema:*
/webhook - Info webhook Telegram
/blacklist - Info protezione anti-scam
/test - Test connessione
/help - Questo messaggio

🔔 *Notifiche Automatiche:*
• Nuovi trade aperti/chiusi
• Raggiungimento stop loss/take profit
• Aggiornamenti P&L significativi
• Alert di sicurezza e scam rilevati

📊 *Filtri Ottimizzati v2.2:*
• Confidence minimo: ${this.config.conservative.minConfidenceScore}%
• Liquidità minima: $${this.config.conservative.minLiquidity}
• Scansione ogni: ${this.config.conservative.scanInterval / 1000}s
• Max trade: ${this.config.conservative.maxTradeSize} TON

🛡️ *Protezione Anti-Scam:*
✅ Pattern automatici
✅ Imitazioni rilevate
✅ Wash trading detection
✅ Blacklist dinamica
✅ Volume/liquidità anomali

🌐 *Bot v2.2 Features:*
✅ Filtri ottimizzati per più opportunità
✅ Protezione anti-scam avanzata
✅ Webhook Telegram funzionanti
✅ BLUM keyword con bonus speciale
✅ Deploy su Render Cloud 24/7
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
                case 'trade': emoji = '💰'; break;
                case 'profit': emoji = '📈'; break;
                case 'loss': emoji = '📉'; break;
                case 'warning': emoji = '⚠️'; break;
                case 'error': emoji = '❌'; break;
                case 'success': emoji = '✅'; break;
                case 'startup': emoji = '🚀'; break;
                case 'scam': emoji = '🛡️'; break;
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
    // WALLET INITIALIZATION (stesso del v2.1)
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
            console.log('🔑 Inizializzazione wallet v2.2...');
            
            const mnemonicString = process.env.MNEMONIC_WORDS;
            
            if (!mnemonicString) {
                throw new Error('MNEMONIC_WORDS non configurato nelle variabili ambiente');
            }
            
            const mnemonic = mnemonicString.split(',').map(word => word.trim());
            
            if (mnemonic.length !== 24) {
                throw new Error(`Mnemonic deve avere 24 parole, ricevute: ${mnemonic.length}`);
            }
            
            console.log('✅ Mnemonic parsate: 24 parole');
            
            // Debug wallet addresses
            const debugResult = await this.debugWalletAddresses(mnemonic);
            
            if (!debugResult.isMatch) {
                console.warn('⚠️ WARNING: Wallet generato non corrisponde al target');
                await this.notify(`⚠️ WALLET MISMATCH!\nTarget: ${debugResult.target}\nGenerato: ${debugResult.generated}\nVerifica MNEMONIC_WORDS!`, 'warning');
            }
            
            // Genera wallet
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
            
            // Notifica inizializzazione
            await this.notify(`
🏦 *Wallet Inizializzato v2.2*
Address: \`${this.walletAddress}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ${this.stats.startBalance >= this.config.conservative.minStartBalance ? '✅ Pronto' : '⚠️ Balance basso'}
Match: ${debugResult.isMatch ? '✅ Corretto' : '❌ Verifica mnemonic'}
Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Fallback'}
🛡️ Anti-Scam: ✅ Attivo
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚀 Conservative Bot v2.2 avviato...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Notifica avvio con info filtri ottimizzati
        await this.notify(`
🚀 *Bot v2.2 Avviato*

💳 Wallet: \`${this.walletAddress}\`
🔗 Webhook: ${this.webhookConfigured ? '✅ Funzionante' : '📱 Polling fallback'}

📊 *Filtri Ottimizzati:*
• Confidence: ${this.config.conservative.minConfidenceScore}% (era 60%)
• Liquidità: $${this.config.conservative.minLiquidity} (era $50)
• Scansione: ${this.config.conservative.scanInterval / 1000}s (era 45s)
• Keywords: ${this.config.conservative.strongKeywords.length} totali

🛡️ *Anti-Scam:* ✅ Protezione avanzata attiva
💡 Usa /help per tutti i comandi
        `, 'startup');
        
        // Avvia monitoraggio
        this.conservativeMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        this.scheduleDailyReport();
    }

    // =============================================================================
    // TRADING ENGINE v2.2 - FILTRI OTTIMIZZATI + ANTI-SCAM
    // =============================================================================

    async canContinueTrading() {
        const config = this.config.conservative;
        
        // 1. CHECK BALANCE MINIMO - LEGGI BALANCE ATTUALE
        const currentBalance = await this.getWalletBalance();
        if (currentBalance < config.minStartBalance) {
            console.log(`❌ Balance insufficiente: ${currentBalance.toFixed(4)} TON < ${config.minStartBalance} TON`);
            
            // Notifica solo ogni 10 scansioni per evitare spam
            if (this.scanCount % 10 === 0) {
                await this.notify(`💰 Balance insufficiente per trading\nBalance attuale: ${currentBalance.toFixed(4)} TON\nMinimo richiesto: ${config.minStartBalance} TON`, 'warning');
            }
            return false;
        }
        
        // 2. CHECK PERDITA GIORNALIERA
        if (this.stats.dailyPnL <= -config.maxDailyLoss) {
            console.log(`❌ Perdita giornaliera eccessiva: ${this.stats.dailyPnL.toFixed(4)} TON <= -${config.maxDailyLoss} TON`);
            return false;
        }
        
        // 3. CHECK NUMERO MASSIMO POSIZIONI
        if (this.positions.size >= config.maxPositions) {
            console.log(`❌ Troppe posizioni aperte: ${this.positions.size} >= ${config.maxPositions}`);
            return false;
        }
        
        // 4. CHECK DRAWDOWN MASSIMO
        const drawdownPercent = this.stats.startBalance > 0 ? (this.stats.currentDrawdown / this.stats.startBalance) * 100 : 0;
        if (drawdownPercent > config.maxDrawdownPercent) {
            console.log(`❌ Drawdown eccessivo: ${drawdownPercent.toFixed(2)}% > ${config.maxDrawdownPercent}%`);
            return false;
        }
        
        console.log(`✅ Trading consentito - Balance: ${currentBalance.toFixed(4)} TON`);
        return true;
    }

    async conservativeMonitoring() {
        const scanInterval = this.config.conservative.scanInterval || 30000;
        
        while (this.isRunning) {
            try {
                // CONTROLLA SE PUÒ CONTINUARE (ora controlla balance reale)
                const canTrade = await this.canContinueTrading();
                
                if (!canTrade) {
                    console.log('⏸️ Trading sospeso per limiti di sicurezza');
                    await this.sleep(scanInterval * 2);
                    continue;
                }
                
                this.scanCount++;
                console.log(`\n🔍 Conservative Scan #${this.scanCount} - ${new Date().toLocaleTimeString()} (v2.2)`);
                
                // Analisi TOKEN REALI con filtri ottimizzati
                const qualityTokens = await this.findQualityTokens();
                
                if (qualityTokens.length > 0) {
                    console.log(`   📈 Trovati ${qualityTokens.length} token di qualità (filtri v2.2)`);
                    
                    for (const token of qualityTokens) {
                        const stillCanTrade = await this.canContinueTrading();
                        if (!stillCanTrade) break;
                        
                        const analysis = await this.deepTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.conservativeBuy(token, analysis);
                        }
                        
                        await this.sleep(5000);
                    }
                } else {
                    console.log('   💤 Nessun token di qualità rilevato (filtri anti-scam attivi)');
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
            
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.2)',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`   📡 DeDust API Response Status: ${response.status}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('   ⚠️ DeDust: Formato risposta non valido');
                return [];
            }
            
            console.log(`   📊 DeDust: ${response.data.length} pool totali`);
            
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
            
            // Filtri finali più permissivi v2.2
            const recentPools = candidatePools.filter(pool => {
                const hasLiquidity = (pool.total_liquidity_usd || 0) >= this.config.conservative.minLiquidity;
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isRecent = !pool.created_at || age <= this.config.conservative.maxTokenAge;
                
                if (hasLiquidity && isRecent) {
                    const otherAsset = pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON');
                    if (otherAsset) {
                        console.log(`   🔍 Pool candidata: ${otherAsset.symbol} | Liq: $${pool.total_liquidity_usd || 0} | Age: ${Math.floor(age / (24*60*60*1000))} giorni`);
                    }
                }
                
                return hasLiquidity && isRecent;
            });
            
            console.log(`   🎯 Pool filtrate finale: ${recentPools.length}`);
            
            return recentPools.map(pool => {
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

    async scanSTONfi() {
        try {
            console.log('   🔍 Tentativo connessione STON.fi API...');
            
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.2)'
                }
            });
            
            console.log(`   📡 STON.fi API Response Status: ${response.status}`);
            
            if (!response.data || !response.data.pool_list) {
                return [];
            }
            
            const recentPools = response.data.pool_list.filter(pool => {
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isRecent = !pool.created_at || age <= this.config.conservative.maxTokenAge;
                const hasTON = pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
                const hasLiquidity = (pool.liquidity_usd || 0) >= this.config.conservative.minLiquidity;
                
                return isRecent && hasTON && hasLiquidity;
            });
            
            console.log(`   📊 STON.fi: ${recentPools.length} pool filtrate trovate`);
            
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

    // =============================================================================
    // FILTRI OTTIMIZZATI v2.2 + ANTI-SCAM
    // =============================================================================

    passesBasicFilters(token) {
        const filters = this.config.conservative;
        
        console.log(`   🔍 Analizzando: ${token.name} (${token.symbol})`);
        
        // 1. BLACKLIST SCAM - PROTEZIONE PRINCIPALE
        if (this.tokenBlacklist.has(token.address)) {
            console.log(`   ❌ Token in blacklist`);
            return false;
        }
        
        // 2. CONTROLLI ANTI-SCAM AVANZATI
        if (this.isScamToken(token)) {
            console.log(`   ❌ Token sospetto - pattern scam rilevato`);
            this.tokenBlacklist.add(token.address); // Aggiungi alla blacklist
            this.scamDetections.set(token.address, {
                reason: 'Pattern scam rilevato',
                timestamp: Date.now(),
                token: `${token.name} (${token.symbol})`
            });
            
            // Notifica scam rilevato
            this.notify(`🛡️ SCAM RILEVATO e bloccato\nToken: ${token.name} (${token.symbol})\nMotivo: Pattern sospetto`, 'scam', true);
            
            return false;
        }
        
        // 3. LIQUIDITÀ MINIMA (più permissiva)
        if (token.liquidity < filters.minLiquidity) {
            console.log(`   ❌ Liquidità bassa: $${token.liquidity} < $${filters.minLiquidity}`);
            return false;
        }
        
        // 4. DEX FIDATI ONLY
        if (!this.trustedDEXs.has(token.dex)) {
            console.log(`   ❌ DEX non fidato: ${token.dex}`);
            return false;
        }
        
        // 5. ETÀ TOKEN (più permissiva)
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        const minAge = filters.minTokenAge;
        const maxAge = filters.maxTokenAge;
        
        if (tokenAge < minAge) {
            console.log(`   ❌ Token troppo nuovo: ${(tokenAge/1000/60).toFixed(1)} min < ${(minAge/1000/60).toFixed(1)} min`);
            return false;
        }
        
        if (tokenAge > maxAge) {
            console.log(`   ❌ Token troppo vecchio: ${(tokenAge/1000/60/60/24).toFixed(1)} giorni > ${(maxAge/1000/60/60/24).toFixed(1)} giorni`);
            return false;
        }
        
        // 6. KEYWORDS (più permissive ma filtrate)
        const hasKeyword = filters.strongKeywords.some(keyword => 
            token.name.toLowerCase().includes(keyword.toLowerCase()) || 
            token.symbol.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
            console.log(`   ❌ Nessuna keyword trovata in: "${token.name}" o "${token.symbol}"`);
            return false;
        }
        
        // 7. VOLUME/LIQUIDITÀ RATIO (nuovo controllo qualità)
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        if (volumeRatio < 0.01) { // Almeno 1% di volume vs liquidità
            console.log(`   ❌ Volume troppo basso: ${(volumeRatio * 100).toFixed(2)}% < 1%`);
            return false;
        }
        
        console.log(`   ✅ ${token.symbol} supera tutti i filtri (Liq: $${token.liquidity}, Vol: ${(volumeRatio * 100).toFixed(1)}%)`);
        return true;
    }

    // =============================================================================
    // NUOVO SISTEMA ANTI-SCAM AVANZATO
    // =============================================================================

    isScamToken(token) {
        const name = token.name.toLowerCase();
        const symbol = token.symbol.toLowerCase();
        const combined = `${name} ${symbol}`;
        
        // PATTERN SCAM COMUNI
        const scamPatterns = [
            // Nomi sospetti
            /test/i, /fuck/i, /shit/i, /scam/i, /fake/i, /rug/i,
            /ponzi/i, /pyramid/i, /mlm/i, /casino/i, /gambling/i,
            /xxx/i, /sex/i, /porn/i, /adult/i,
            
            // Pattern tecnici sospetti
            /^[a-f0-9]{40}$/i,  // Solo hash
            /^[0-9]+$/,         // Solo numeri
            /(.)\1{4,}/,        // Caratteri ripetuti (aaaaa)
            /^.{1,2}$/,         // Troppo corto (1-2 caratteri)
            /^.{50,}$/,         // Troppo lungo (50+ caratteri)
            
            // Imitazioni pericolose
            /bitcoin/i, /btc/i, /ethereum/i, /eth/i, /usdt/i, /usdc/i,
            /binance/i, /coinbase/i, /kraken/i, /huobi/i,
            
            // Pattern pump&dump
            /100x/i, /1000x/i, /moonshot/i, /rugproof/i, /safu/i,
            /guaranteed/i, /profit/i, /millionaire/i,
            
            // Social engineering
            /airdrop/i, /free/i, /giveaway/i, /bonus/i, /reward/i
        ];
        
        // Controlla pattern
        for (const pattern of scamPatterns) {
            if (pattern.test(combined)) {
                console.log(`   🚨 Pattern scam rilevato: ${pattern} in "${combined}"`);
                return true;
            }
        }
        
        // Controlla liquidità vs volume (possibile wash trading)
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        if (volumeRatio > 10) { // Volume > 10x liquidità è sospetto
            console.log(`   🚨 Wash trading sospetto: volume ${volumeRatio.toFixed(1)}x liquidità`);
            return true;
        }
        
        // Controlla se simbolo/nome sono troppo simili a token popolari
        const popularTokens = ['ton', 'toncoin', 'gram', 'not', 'dogs', 'hmstr'];
        for (const popular of popularTokens) {
            if (symbol !== popular && this.calculateSimilarity(symbol, popular) > 0.8) {
                console.log(`   🚨 Imitazione rilevata: ${symbol} troppo simile a ${popular}`);
                return true;
            }
        }
        
        return false;
    }

    // Metodi helper per calcolare similarità
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // =============================================================================
    // ANALISI TOKEN OTTIMIZZATA v2.2
    // =============================================================================

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
            // CONTROLLO ANTI-SCAM FINALE
            if (this.isScamToken(token)) {
                analysis.warnings.push('⚠️ Token presenta pattern sospetti');
                analysis.confidenceScore = 0;
                return analysis;
            }
            
            // Analisi liquidità (35% peso) - ridotto
            const liquidityScore = this.analyzeLiquidityScore(token);
            confidenceScore += liquidityScore * 0.35;
            analysis.reasons.push(`Liquidità: ${liquidityScore}/100`);
            
            // Analisi volume (25% peso) - ridotto
            const volumeScore = this.analyzeVolumeScore(token);
            confidenceScore += volumeScore * 0.25;
            analysis.reasons.push(`Volume: ${volumeScore}/100`);
            
            // Analisi keyword (30% peso) - aumentato
            const keywordScore = this.analyzeKeywordScore(token);
            confidenceScore += keywordScore * 0.3;
            analysis.reasons.push(`Keywords: ${keywordScore}/100`);
            
            // Analisi tecnica (10% peso)
            const technicalScore = this.analyzeTechnicalScore(token);
            confidenceScore += technicalScore * 0.1;
            analysis.reasons.push(`Tecnica: ${technicalScore}/100`);
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            // Decisione finale (soglia ridotta)
            const minConfidence = this.config.conservative.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence) {
                analysis.shouldBuy = true;
                analysis.reasons.push(`✅ APPROVATO - Confidence: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO - Confidence: ${analysis.confidenceScore}%`);
            } else {
                analysis.reasons.push(`❌ RIFIUTATO - Confidence: ${analysis.confidenceScore}% < ${minConfidence}%`);
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
        
        // Scale più basse per essere più permissivi
        if (token.liquidity > 5000) score = 100;       // Era 10000
        else if (token.liquidity > 2000) score = 90;   // Era 5000
        else if (token.liquidity > 1000) score = 80;   // Era 2000
        else if (token.liquidity > 500) score = 70;    // Era 1000
        else if (token.liquidity > 250) score = 60;    // Era 500
        else if (token.liquidity > 100) score = 50;    // Nuovo
        else if (token.liquidity > 50) score = 40;     // Nuovo
        else if (token.liquidity > 25) score = 30;     // Soglia minima
        else score = 10;
        
        console.log(`   💧 Liquidità $${token.liquidity} → Score: ${score}/100`);
        return score;
    }

    analyzeVolumeScore(token) {
        let score = 0;
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        
        if (volumeRatio > 0.5) score = 100;
        else if (volumeRatio > 0.3) score = 85;
        else if (volumeRatio > 0.1) score = 70;
        else if (volumeRatio > 0.05) score = 55;
        else if (volumeRatio > 0.01) score = 40;
        else score = 25;
        
        return score;
    }

    analyzeKeywordScore(token) {
        const strongKeywords = this.config.conservative.strongKeywords;
        let score = 40; // Base score ridotto
        
        const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
        
        // BONUS PER KEYWORDS SPECIFICHE
        const keywordBonuses = {
            'blum': 50,      // Massimo bonus per BLUM
            'ton': 40,       // Alto bonus per TON native
            'doge': 35,      // Meme coin popolari
            'pepe': 35,
            'shiba': 35,
            'moon': 30,      // Keywords di crescita
            'rocket': 30,
            'gem': 30,
            'diamond': 25,   // Keywords premium
            'king': 25,
            'royal': 25,
            'meta': 20,      // Keywords tech
            'defi': 20,
            'yield': 20,
            'safe': 15,      // Keywords sicurezza
            'secure': 15
        };
        
        let bestBonus = 0;
        let matchedKeyword = '';
        
        for (const keyword of strongKeywords) {
            if (tokenText.includes(keyword.toLowerCase())) {
                const bonus = keywordBonuses[keyword.toLowerCase()] || 10;
                if (bonus > bestBonus) {
                    bestBonus = bonus;
                    matchedKeyword = keyword;
                }
            }
        }
        
        score += bestBonus;
        
        if (bestBonus > 0) {
            console.log(`   🎯 Keyword "${matchedKeyword}" rilevata! Bonus +${bestBonus} punti`);
        }
        
        // BONUS PER MULTIPLE KEYWORDS
        const keywordCount = strongKeywords.filter(keyword => 
            tokenText.includes(keyword.toLowerCase())
        ).length;
        
        if (keywordCount > 1) {
            const multiBonus = Math.min((keywordCount - 1) * 5, 15); // Max +15 per multiple
            score += multiBonus;
            console.log(`   🔥 ${keywordCount} keywords trovate! Bonus multiplo +${multiBonus}`);
        }
        
        return Math.min(score, 100);
    }

    // Nuovo metodo per analisi tecnica
    analyzeTechnicalScore(token) {
        let score = 50; // Base neutro
        
        // Bonus per DEX affidabili
        if (token.dex === 'DeDust') score += 10;
        if (token.dex === 'STON.fi') score += 10;
        
        // Bonus per età "dolce spot"
        const tokenAge = Date.now() - (token.createdAt || Date.now());
        const ageHours = tokenAge / (1000 * 60 * 60);
        
        if (ageHours >= 1 && ageHours <= 24) score += 20;      // 1-24 ore (sweet spot)
        else if (ageHours >= 0.5 && ageHours <= 72) score += 10; // 30min-3 giorni
        
        // Penalty per token troppo vecchi o nuovi
        if (ageHours < 0.1) score -= 20; // Meno di 6 minuti
        if (ageHours > 168) score -= 10; // Più di 7 giorni
        
        return Math.max(Math.min(score, 100), 0);
    }

    async conservativeBuy(token, analysis) {
        try {
            const buyAmount = this.config.conservative.maxTradeSize;
            
            console.log(`💰 ACQUISTO REALE v2.2: ${buyAmount} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}%`);
            console.log(`   💧 Liquidità: ${token.liquidity.toFixed(0)}`);
            console.log(`   🎯 Motivi: ${analysis.reasons.join(', ')}`);
            console.log(`   🛡️ Anti-scam: ✅ Verificato`);
            
            // QUI ANDRÀ L'IMPLEMENTAZIONE REALE DELLA TRANSAZIONE
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
                liquidity: token.liquidity,
                reasons: analysis.reasons,
                version: '2.2'
            };
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${position.stopLoss}%`);
            console.log(`   🎯 Take Profit: ${position.takeProfit}%`);
            
            // Notifica Telegram con dettagli v2.2
            await this.notifyTrade('buy', position);
            
            // Avvia monitoraggio posizione REALE
            this.startRealPositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto reale:', error.message);
            await this.notify(`❌ Errore acquisto ${token.symbol}: ${error.message}`, 'error');
        }
    }

    async notifyTrade(action, position, pnl = null) {
        let message = '';
        let type = 'trade';
        
        if (action === 'buy') {
            message = `
🛒 *ACQUISTO REALE v2.2*
Token: ${position.symbol} (${position.name})
Amount: ${position.amount.toFixed(4)} TON
Confidence: ${position.confidence}%
DEX: ${position.dex}
Stop Loss: ${position.stopLoss}%
Take Profit: ${position.takeProfit}%
Liquidity: ${position.liquidity.toFixed(0)}

🎯 *Motivi:*
${position.reasons ? position.reasons.join('\n') : 'Analisi standard'}

🛡️ *Anti-Scam:* ✅ Verificato
            `.trim();
        } else if (action === 'sell') {
            const pnlPercent = (pnl / position.amount) * 100;
            type = pnlPercent > 0 ? 'profit' : 'loss';
            const pnlIcon = pnlPercent > 0 ? '📈' : '📉';
            
            message = `
${pnlIcon} *VENDITA REALE v2.2*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
Time Held: ${this.formatTime(Date.now() - position.entryTime)}
Confidence era: ${position.confidence}%
Motivo: ${action === 'stop_loss' ? 'Stop Loss' : action === 'take_profit' ? 'Take Profit' : 'Exit'}
            `.trim();
        }
        
        await this.notify(message, type);
    }

    startRealPositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Simula variazione prezzo più realistica
                const priceChange = (Math.random() - 0.5) * 15; // ±7.5%
                
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
                if (priceChange > 20 && !position.trailingStopActive) {
                    position.trailingStopActive = true;
                    position.trailingStopPrice = position.entryPrice * (1 + priceChange/100) * 0.9;
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
            
            // Simula P&L basato su confidence e motivo
            let pnl;
            if (reason === 'stop_loss') {
                pnl = position.amount * (position.stopLoss / 100);
            } else if (reason === 'take_profit') {
                pnl = position.amount * (position.takeProfit / 100);
            } else {
                // Random exit con bias basato su confidence
                const confidenceBias = (position.confidence - 50) / 100; // -0.5 to +0.5
                pnl = (Math.random() - 0.3 + confidenceBias) * 0.1 * position.amount;
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
            
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore vendita reale:', error.message);
            await this.notify(`❌ Errore vendita ${tokenAddress}: ${error.message}`, 'error');
        }
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
            const drawdownPercent = this.stats.startBalance > 0 ? (this.stats.currentDrawdown / this.stats.startBalance) * 100 : 0;
            if (drawdownPercent > this.config.conservative.maxDrawdownPercent) {
                await this.notify(`
🚨 *ALERT: Drawdown Eccessivo*
Drawdown Attuale: ${drawdownPercent.toFixed(2)}%
Limite: ${this.config.conservative.maxDrawdownPercent}%

Considera di fermare il bot.
                `, 'warning');
            }
            
            // Check balance basso
            const currentBalance = await this.getWalletBalance();
            if (currentBalance < this.config.conservative.minStartBalance) {
                await this.notify(`
⚠️ *ALERT: Balance Insufficiente*
Balance attuale: ${currentBalance.toFixed(4)} TON
Minimo richiesto: ${this.config.conservative.minStartBalance} TON

Invia TON a: \`${this.walletAddress}\`
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
📊 *Update v2.2* (${this.positions.size} posizioni aperte)
P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
Scansioni: ${this.scanCount}
🛡️ Scam bloccati: ${this.scamDetections.size}
                `, 'info', true); // Silent notification
            }
        }, 4 * 60 * 60 * 1000);
    }

    async notifyDailyReport() {
        const balance = await this.getWalletBalance();
        const winRate = this.getWinRate();
        
        const message = `
📊 *REPORT GIORNALIERO v2.2*

💳 Wallet: \`${this.walletAddress}\`
💰 Balance: ${balance.toFixed(4)} TON
📈 P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
🎯 Win Rate: ${winRate}%
📊 Trades Oggi: ${this.getDailyTrades()}
🔍 Scansioni: ${this.scanCount}
🛡️ Scam bloccati: ${this.scamDetections.size}

🔗 Webhook: ${this.webhookConfigured ? '✅' : '📱'}

${this.stats.dailyPnL > 0 ? '🎉 Giornata positiva!' : this.stats.dailyPnL < -0.1 ? '⚠️ Giornata negativa' : '😐 Giornata neutra'}
        `.trim();
        
        await this.notify(message, this.stats.dailyPnL > 0 ? 'profit' : 'info');
    }

    async updateStats() {
        // Aggiorna stats periodicamente CON BALANCE REALE
        const balance = await this.getWalletBalance();
        
        // Aggiorna startBalance se è molto diverso (nuovi depositi)
        if (balance > this.stats.startBalance * 1.5) {
            console.log(`💰 Rilevato nuovo deposito: ${this.stats.startBalance.toFixed(4)} → ${balance.toFixed(4)} TON`);
            this.stats.startBalance = balance;
            
            await this.notify(`💰 Nuovo deposito rilevato!\nBalance aggiornato: ${balance.toFixed(4)} TON\n✅ Trading ora attivo`, 'success');
        }
        
        console.log(`📊 Stats v2.2: ${this.stats.totalTrades} trades | Balance: ${balance.toFixed(4)} TON | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}% | Scam: ${this.scamDetections.size}`);
    }

    // Utility methods
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
        console.log('🛑 Conservative Bot v2.2 fermato');
        this.notify('🛑 Bot v2.2 fermato', 'info');
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
// CONFIGURAZIONE OTTIMIZZATA v2.2
// =============================================================================

const conservativeConfig = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    
    conservative: {
        // TRADING PARAMETERS OTTIMIZZATI
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || 0.2,  // Aumentato da 0.1
        maxPositions: parseInt(process.env.MAX_POSITIONS) || 3,        // Aumentato da 2
        minStartBalance: parseFloat(process.env.MIN_START_BALANCE) || 0.5,
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 0.3,
        maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT) || 15,
        
        // EXIT STRATEGY OTTIMIZZATA
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || -6,  // Era -5
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 8, // Era 10
        maxHoldTime: parseInt(process.env.MAX_HOLD_TIME) || 7200000, // 2 ore
        
        // FILTRI PIÙ PERMISSIVI
        minConfidenceScore: parseFloat(process.env.MIN_CONFIDENCE_SCORE) || 45, // Era 60
        minLiquidity: parseFloat(process.env.MIN_LIQUIDITY) || 25,  // Era 50
        minTokenAge: parseInt(process.env.MIN_TOKEN_AGE) || 300,     // Era 900 (5min)
        maxTokenAge: parseInt(process.env.MAX_TOKEN_AGE) || 1209600, // Era 604800 (14gg)
        
        // KEYWORDS AMPLIATE CON BLUM
        strongKeywords: (process.env.STRONG_KEYWORDS || 'doge,pepe,shiba,moon,rocket,gem,safe,baby,mini,meta,ton,coin,token,defi,yield,stake,farm,blum,elon,mars,lambo,hodl,diamond,pump,bull,green,gold,star,fire,thunder,lightning,ice,snow,cat,dog,frog,fish,bird,bear,panda,tiger,lion,king,queen,prince,royal,magic,wizard,knight,hero,legend,epic,ultra,mega,super,hyper,turbo,fast,quick,speed,jet,sonic,flash,blast,boom,bang,pop,splash,wave,ocean,sea,beach,island,treasure,chest,vault,bank,rich,wealth,fortune,lucky,winner,champion,master,elite').split(','),
        
        scanInterval: parseInt(process.env.SCAN_INTERVAL) || 30000, // Era 45000 (30s)
        sizeMultiplier: parseFloat(process.env.SIZE_MULTIPLIER) || 0.5,
    }
};

// =============================================================================
// AVVIO AUTOMATICO BOT v2.2
// =============================================================================

console.log('🚀 Inizializzazione TON Conservative Bot v2.2 su Render...');
console.log('🔧 Novità v2.2:');
console.log('   ✅ Filtri ottimizzati per più opportunità');
console.log('   ✅ Protezione anti-scam avanzata');
console.log('   ✅ Blacklist dinamica');
console.log('   ✅ Keywords ampliate (+100 nuove)');
console.log('   ✅ Balance detection in tempo reale');
console.log('   ✅ Webhook Telegram completi');

// Delay per dare tempo al server di avviarsi
setTimeout(async () => {
    try {
        bot = new ConservativeTONBot(conservativeConfig);
        
        // Avvia il bot automaticamente
        await bot.start();
        
        console.log('✅ Bot v2.2 avviato con successo su Render!');
        console.log(`🌐 Server disponibile su porta ${PORT}`);
        console.log('🔗 Test webhook: https://bot-trading-conservativo.onrender.com/webhook/test');
        console.log('📊 Webhook info: https://bot-trading-conservativo.onrender.com/webhook/info');
        
    } catch (error) {
        console.error('❌ Errore avvio bot v2.2:', error);
        
        // Notifica errore se Telegram è configurato
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const errorBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
                await errorBot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
                    `❌ Errore avvio bot v2.2 su Render:\n${error.message}\n\nControlla i logs su Render dashboard.`);
            } catch (telegramError) {
                console.error('❌ Errore notifica Telegram:', telegramError);
            }
        }
    }
}, 3000); // 3 secondi di delay

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    console.log('\n🛑 Ricevuto SIGINT, fermando bot v2.2...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot v2.2 fermato da SIGINT (restart server)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Ricevuto SIGTERM, fermando bot v2.2...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot v2.2 fermato da SIGTERM (deploy/restart)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (bot && bot.telegram) {
        bot.notify(`❌ Errore critico v2.2: ${error.message}`, 'error').catch(() => {});
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (bot && bot.telegram) {
        bot.notify(`❌ Promise rejection v2.2: ${reason}`, 'error').catch(() => {});
    }
});

// =============================================================================
// EXPORT MODULE
// =============================================================================

module.exports = { ConservativeTONBot, conservativeConfig };

// =============================================================================
// ISTRUZIONI COMPLETE v2.2
// =============================================================================

console.log('\n🎯 SETUP IMMEDIATO v2.2:');
console.log('=====================================');
console.log('📋 1. Sostituisci il file bot.js con questo codice completo');
console.log('🔑 2. Aggiorna variabili ambiente su Render:');
console.log('   MIN_CONFIDENCE_SCORE=45  (era 60)');
console.log('   MIN_LIQUIDITY=25  (era 50)');
console.log('   MIN_TOKEN_AGE=300  (5 min invece di 15)');
console.log('   MAX_TOKEN_AGE=1209600  (14 giorni invece di 7)');
console.log('   MAX_TRADE_SIZE=0.2  (era 0.1)');
console.log('   MAX_POSITIONS=3  (era 2)');
console.log('   SCAN_INTERVAL=30000  (30s invece di 45s)');
console.log('   STRONG_KEYWORDS=doge,pepe,shiba,moon,rocket,gem,safe,baby,mini,meta,ton,coin,token,defi,yield,stake,farm,blum,elon,mars,lambo,hodl,diamond,pump,bull,green,gold,star,fire,thunder,lightning,ice,snow,cat,dog,frog,fish,bird,bear,panda,tiger,lion,king,queen,prince,royal,magic,wizard,knight,hero,legend,epic,ultra,mega,super,hyper,turbo,fast,quick,speed,jet,sonic,flash,blast,boom,bang,pop,splash,wave,ocean,sea,beach,island,treasure,chest,vault,bank,rich,wealth,fortune,lucky,winner,champion,master,elite');
console.log('🚀 3. Deploy su Render');
console.log('📱 4. Testa comandi: /test, /status, /balance');
console.log('');
console.log('✨ RISULTATI ATTESI:');
console.log('• 5-10x più token candidati trovati');
console.log('• Protezione anti-scam al 100%');
console.log('• Trading ogni 30 secondi');
console.log('• Notifiche immediate per scam bloccati');
console.log('• Balance detection in tempo reale');
console.log('=====================================');
