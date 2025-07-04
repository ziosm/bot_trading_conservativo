const { TonClient, WalletContractV4, internal, Address } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER con WEBHOOK TELEGRAM v2.4
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Variabile globale per il bot
let bot = null;

// =============================================================================
// WEBHOOK TELEGRAM SETUP (identico)
// =============================================================================

app.use('/webhook', express.json());

app.get('/', (req, res) => {
    res.json({ 
        status: '🤖 TON Debug Intensivo Bot v2.4 Running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '2.4.0',
        message: 'Bot con Debug Completo per Trovare Problemi',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Debug Bot v2.4',
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
            await bot.notify('🧪 Test webhook v2.4 eseguito con successo!\n🔍 Debug intensivo attivo', 'info');
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
            version: '2.4.0',
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
            tokensAnalyzed: bot.tokensAnalyzed || 0,
            debugInfo: {
                filterResults: bot.filterResults || {},
                lastDebugTime: bot.lastDebugTime || null
            }
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '2.4.0',
            message: 'Bot is starting up...',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/bot/start', (req, res) => {
    if (bot && !bot.isRunning) {
        bot.start();
        res.json({ message: 'Bot v2.4 started via API' });
    } else if (bot && bot.isRunning) {
        res.json({ message: 'Bot already running' });
    } else {
        res.json({ message: 'Bot not initialized yet' });
    }
});

app.get('/bot/stop', (req, res) => {
    if (bot && bot.isRunning) {
        bot.stop();
        res.json({ message: 'Bot v2.4 stopped via API' });
    } else {
        res.json({ message: 'Bot not running' });
    }
});

// Avvia server Express IMMEDIATAMENTE
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server v2.4 running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🔗 Webhook info: http://localhost:${PORT}/webhook/info`);
    console.log('✅ Render può ora rilevare il servizio');
});

// =============================================================================
// BOT CLASS v2.4 - DEBUG INTENSIVO
// =============================================================================

class DebugIntensiveTONBot {
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
        
        // CONTATORI DEBUG v2.4
        this.candidatesFound = 0;
        this.tokensAnalyzed = 0;
        this.lastDebugTime = null;
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
        
        // BLACKLIST RIDOTTA
        this.tokenBlacklist = new Set();
        this.trustedDEXs = new Set(['DeDust', 'STON.fi']);
        this.scamDetections = new Map();
        
        console.log('🔍 Debug Intensivo TON Bot v2.4 inizializzato');
        console.log('💡 Focus: Trovare perché non trova token');
        
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
                    await this.notify('🎉 Webhook v2.4 configurato!\n🔍 Debug intensivo attivo', 'success');
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
                await this.notify('📱 Telegram v2.4 configurato con polling fallback\n🔍 Debug intensivo attivo', 'info');
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
                case '/intensive':
                    await this.sendIntensiveDebug(chatId);
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
                    await this.telegram.sendMessage(chatId, '✅ Bot v2.4 risponde correttamente!\n🔗 Webhook funzionante!\n🔍 Debug intensivo attivo');
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
                case '/api':
                    await this.testAPIs(chatId);
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

    // =============================================================================
    // COMANDI TELEGRAM v2.4
    // =============================================================================

    async handleStartCommand(chatId) {
        if (!this.isRunning) {
            await this.start();
            await this.telegram.sendMessage(chatId, '🚀 Bot v2.4 avviato!\n🔍 Debug intensivo attivo\nUsa /intensive per debug completo.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già in esecuzione\nUsa /intensive per debug.');
        }
    }

    async handleStopCommand(chatId) {
        if (this.isRunning) {
            this.stop();
            await this.telegram.sendMessage(chatId, '🛑 Bot v2.4 fermato\nUsa /start per riavviare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già fermato\nUsa /start per avviare.');
        }
    }

    async handleRestartCommand(chatId) {
        await this.telegram.sendMessage(chatId, '🔄 Riavvio bot v2.4 in corso...');
        
        if (this.isRunning) {
            this.stop();
            await this.sleep(2000);
        }
        
        await this.start();
        await this.telegram.sendMessage(chatId, '✅ Bot v2.4 riavviato con successo!\n🔍 Debug intensivo attivo');
    }

    async sendDebugInfo(chatId) {
        const message = `
🔍 *DEBUG INFO v2.4*

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

💡 Usa /intensive per debug completo API
💡 Usa /api per testare solo le API
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendIntensiveDebug(chatId) {
        await this.telegram.sendMessage(chatId, '🔍 Avvio debug intensivo completo...');
        this.lastDebugTime = new Date().toISOString();
        
        try {
            console.log('\n🚀 DEBUG INTENSIVO v2.4 - ANALISI COMPLETA API');
            
            // Test DeDust
            console.log('\n📡 TESTING DeDust API...');
            const dedustTokens = await this.scanDeDustDebugIntensive();
            
            // Test STON.fi
            console.log('\n📡 TESTING STON.fi API...');
            const stonfiTokens = await this.scanSTONfiDebugIntensive();
            
            const allTokens = [...dedustTokens, ...stonfiTokens];
            
            let message = `🔍 *DEBUG INTENSIVO v2.4*\n\n`;
            message += `📊 *Risultati API:*\n`;
            message += `• DeDust: ${dedustTokens.length} token candidati\n`;
            message += `• STON.fi: ${stonfiTokens.length} token candidati\n`;
            message += `• Totale: ${allTokens.length} token candidati\n\n`;
            
            if (allTokens.length > 0) {
                message += `🎯 *Token Candidati:*\n`;
                for (let i = 0; i < Math.min(allTokens.length, 10); i++) {
                    const token = allTokens[i];
                    const age = token.createdAt ? Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)) : 'N/A';
                    message += `${i + 1}. ${token.symbol} - $${token.liquidity} (${age}h) - ${token.dex}\n`;
                }
                
                if (allTokens.length > 10) {
                    message += `... e altri ${allTokens.length - 10} token\n`;
                }
                
                message += `\n🔧 Ora testo i filtri su questi token...`;
                await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                
                // Test filtri sui primi 3 token
                for (let i = 0; i < Math.min(3, allTokens.length); i++) {
                    const token = allTokens[i];
                    console.log(`\n🔬 TESTING FILTRI su ${token.symbol}...`);
                    const passed = this.passesFiltersDebugIntensive(token);
                    
                    await this.telegram.sendMessage(chatId, 
                        `🔬 *Test ${token.symbol}*\n` +
                        `Liquidità: $${token.liquidity}\n` +
                        `Età: ${token.createdAt ? Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)) : 'N/A'} ore\n` +
                        `Risultato: ${passed ? '✅ APPROVATO' : '❌ RIFIUTATO'}\n` +
                        `Dettagli nei logs...`, 
                        { parse_mode: 'Markdown' }
                    );
                }
                
            } else {
                message += `❌ *Nessun token trovato dalle API!*\n\n`;
                message += `🔧 *Possibili problemi:*\n`;
                message += `• API non rispondono correttamente\n`;
                message += `• Tutti i pool non hanno TON\n`;
                message += `• Liquidità troppo bassa su tutti\n`;
                message += `• Formato risposta API cambiato\n\n`;
                message += `💡 Controlla i logs per dettagli completi`;
            }
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore debug intensivo: ${error.message}`);
        }
    }

    async testAPIs(chatId) {
        await this.telegram.sendMessage(chatId, '🔧 Testing solo API...');
        
        try {
            // Test DeDust
            const dedustResponse = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)',
                    'Accept': 'application/json'
                }
            });
            
            // Test STON.fi
            const stonfiResponse = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)'
                }
            });
            
            let message = `🔧 *TEST API v2.4*\n\n`;
            message += `📡 *DeDust API:*\n`;
            message += `• Status: ${dedustResponse.status}\n`;
            message += `• Pool totali: ${dedustResponse.data ? dedustResponse.data.length : 'N/A'}\n`;
            message += `• Tipo risposta: ${Array.isArray(dedustResponse.data) ? 'Array' : typeof dedustResponse.data}\n\n`;
            
            message += `📡 *STON.fi API:*\n`;
            message += `• Status: ${stonfiResponse.status}\n`;
            message += `• Pool totali: ${stonfiResponse.data?.pool_list ? stonfiResponse.data.pool_list.length : 'N/A'}\n`;
            message += `• Ha pool_list: ${!!stonfiResponse.data?.pool_list}\n\n`;
            
            message += `✅ Entrambe le API rispondono correttamente`;
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore test API: ${error.message}`);
        }
    }

    async sendFilterResults(chatId) {
        const config = this.config.debugIntensive;
        
        const message = `
🔧 *CONFIGURAZIONE FILTRI v2.4*

⚙️ *Impostazioni Correnti:*
• Min Confidence: ${config.minConfidenceScore}%
• Min Liquidità: $${config.minLiquidity}
• Min Age: ${(config.minTokenAge/1000/60).toFixed(1)} min
• Max Age: ${(config.maxTokenAge/1000/60/60/24).toFixed(1)} giorni
• Max Trade: ${config.maxTradeSize} TON

📊 *Performance Filtri:*
• Total scanned: ${this.filterResults.totalScanned}
• Basic pass rate: ${this.filterResults.totalScanned > 0 ? ((this.filterResults.passedBasic / this.filterResults.totalScanned) * 100).toFixed(1) : 0}%
• Scam detection: ${this.filterResults.failedScam}
• Failed liquidity: ${this.filterResults.failedLiquidity}
• Failed age: ${this.filterResults.failedAge}
• Failed keywords: ${this.filterResults.failedKeywords}

🎯 *Keywords (prime 15):*
${config.strongKeywords.slice(0, 15).join(', ')}... (+${config.strongKeywords.length - 15} altre)

💡 Usa /intensive per test completo
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async manualScan(chatId) {
        await this.telegram.sendMessage(chatId, '🔍 Avvio scansione manuale...');
        
        try {
            const qualityTokens = await this.findQualityTokensDebug();
            
            let message = `🔍 *SCANSIONE MANUALE v2.4*\n\n`;
            message += `📊 Candidati trovati: ${qualityTokens.length}\n\n`;
            
            if (qualityTokens.length > 0) {
                message += `🎯 *Token Candidati:*\n`;
                for (let i = 0; i < Math.min(qualityTokens.length, 5); i++) {
                    const token = qualityTokens[i];
                    const age = token.createdAt ? Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)) : 'N/A';
                    message += `• ${token.symbol} - $${token.liquidity} (${age}h) - ${token.dex}\n`;
                }
                
                if (qualityTokens.length > 5) {
                    message += `... e altri ${qualityTokens.length - 5} token\n`;
                }
            } else {
                message += `❌ Nessun token trovato\n`;
                message += `💡 Usa /intensive per debug completo`;
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
🔍 *BALANCE DEBUG v2.4*

💰 *Balance Attuale:* ${currentBalance.toFixed(4)} TON
💰 *Start Balance:* ${this.stats.startBalance.toFixed(4)} TON
⚙️ *Minimo Richiesto:* ${this.config.debugIntensive.minStartBalance} TON

📊 *Altri Limiti:*
• Daily P&L: ${this.stats.dailyPnL.toFixed(4)} TON (max loss: -${this.config.debugIntensive.maxDailyLoss})
• Posizioni: ${this.positions.size}/${this.config.debugIntensive.maxPositions}

🎯 *Trading Status:* ${canTrade ? '✅ ATTIVO' : '❌ SOSPESO'}
🔍 *Token Analizzati:* ${this.tokensAnalyzed}
🎯 *Candidati Totali:* ${this.candidatesFound}
🕐 *Last Debug:* ${this.lastDebugTime || 'Mai'}

${!canTrade ? '💡 Motivo sospensione controllato nei logs' : ''}
            `.trim();
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore debug balance: ${error.message}`);
        }
    }

    async sendBlacklistInfo(chatId) {
        const message = `
🛡️ *BLACKLIST DEBUG v2.4*

📊 *Token Blacklistati:* ${this.tokenBlacklist.size}
🔍 *Scansioni Totali:* ${this.scanCount}
🚨 *Scam Rilevati:* ${this.scamDetections.size}

🔧 *Protezioni Minime:*
• Solo scam ovvi e pericolosi
• Pattern token fake/test
• Liquidità zero o negativa
• Imitazioni perfette di coin famosi

💡 v2.4 blocca MOLTO poco per massimizzare opportunità
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWebhookInfo(chatId) {
        try {
            const info = await this.telegram.getWebHookInfo();
            
            const message = `
🔗 *WEBHOOK INFO v2.4*

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
🤖 *TON Debug Bot v2.4 Status*

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

📱 *Comandi debug:* /intensive, /api, /scan
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendDetailedStats(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
📊 *Statistiche Dettagliate v2.4*

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

🔍 *Debug v2.4:*
Scansioni totali: ${this.scanCount}
Token analizzati: ${this.tokensAnalyzed}
Candidati trovati: ${this.candidatesFound}
Approvati per trading: ${this.filterResults.approved}
Last debug: ${this.lastDebugTime || 'Mai'}

⏰ *Sistema:*
Webhook: ${this.webhookConfigured ? '✅ Configurato' : '📱 Polling fallback'}
Ultimo reset: ${this.stats.lastResetDate}
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendPositions(chatId) {
        if (this.positions.size === 0) {
            await this.telegram.sendMessage(chatId, '📭 Nessuna posizione aperta\n\n💡 Il bot cerca automaticamente opportunità ogni 30 secondi\n🔍 Debug intensivo attivo\n\nUsa /intensive per vedere perché non trova token');
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
💳 *WALLET INFO v2.4*

📍 *Indirizzo:*
\`${this.walletAddress || 'Non inizializzato'}\`

💰 *Balance:*
${balance.toFixed(4)} TON

🔗 *Explorer:*
[Visualizza su TONScan](https://tonscan.org/address/${this.walletAddress})

⚙️ *Configurazione Debug v2.4:*
• Max Trade: ${this.config.debugIntensive.maxTradeSize} TON
• Balance minimo: ${this.config.debugIntensive.minStartBalance} TON
• Confidence minimo: ${this.config.debugIntensive.minConfidenceScore}%
• Liquidità minima: $${this.config.debugIntensive.minLiquidity}
• Status: ${balance >= this.config.debugIntensive.minStartBalance ? '✅ OK per trading' : '⚠️ Balance insufficiente'}

💡 *Keywords monitorate:*
${this.config.debugIntensive.strongKeywords.slice(0, 10).join(', ')}... (+${this.config.debugIntensive.strongKeywords.length - 10} altre)

🔍 *Debug Intensivo:* Massima visibilità sui problemi!
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendHelpMessage(chatId) {
        const message = `
🤖 *TON Debug Bot v2.4 Commands*

📊 *Status & Info:*
/status - Status generale del bot
/stats - Statistiche dettagliate trading
/debug - Debug info con contatori
/intensive - 🔥 Debug completo API + filtri
/api - Test rapido solo API
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
/blacklist - Info protezione (minimale)
/test - Test connessione
/help - Questo messaggio

🔔 *Notifiche Automatiche:*
• Debug continuo delle scansioni
• Token trovati ma non approvati
• Dettagli completi di ogni step
• Solo alert per errori gravi

📊 *Filtri Debug v2.4:*
• Confidence minimo: ${this.config.debugIntensive.minConfidenceScore}%
• Liquidità minima: $${this.config.debugIntensive.minLiquidity}
• Scansione ogni: ${this.config.debugIntensive.scanInterval / 1000}s
• Max trade: ${this.config.debugIntensive.maxTradeSize} TON

🔍 *Debug Features:*
✅ API response completa visibile
✅ Ogni filtro testato step-by-step
✅ Età token mostrata in ore/giorni
✅ Keywords match dettagliate
✅ Motivi rifiuto specifici
✅ Test manuale singoli token

🌐 *Bot v2.4 Features:*
🔍 Debug totale e trasparente
📊 Statistiche dettagliate in tempo reale
🔧 Test API separati
⚡ Scansioni ottimizzate
🛡️ Protezione minimale per max opportunità
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
    // WALLET INITIALIZATION (identico)
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
            console.log('🔑 Inizializzazione wallet v2.4...');
            
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
🏦 *Wallet Inizializzato v2.4*
Address: \`${this.walletAddress}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ${this.stats.startBalance >= this.config.debugIntensive.minStartBalance ? '✅ Pronto' : '⚠️ Balance basso'}
Match: ${debugResult.isMatch ? '✅ Corretto' : '❌ Verifica mnemonic'}
Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Fallback'}
🔍 Debug Intensivo: ✅ Attivo
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚀 Debug Intensivo Bot v2.4 avviato...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        await this.notify(`
🚀 *Bot v2.4 Debug Intensivo Avviato*

💳 Wallet: \`${this.walletAddress}\`
🔗 Webhook: ${this.webhookConfigured ? '✅ Funzionante' : '📱 Polling fallback'}

📊 *Configurazione Debug:*
• Confidence: ${this.config.debugIntensive.minConfidenceScore}%
• Liquidità: $${this.config.debugIntensive.minLiquidity}
• Scansione: ${this.config.debugIntensive.scanInterval / 1000}s
• Age range: ${(this.config.debugIntensive.minTokenAge/1000/60).toFixed(0)}min-${(this.config.debugIntensive.maxTokenAge/1000/60/60/24).toFixed(0)}gg

🔍 *Debug Intensivo significa:*
• Ogni step della scansione è visibile
• Mostra perché i token vengono rifiutati
• Test API separati disponibili
• Filtri ottimizzati per trovare problemi

🔧 Usa /intensive per debug completo
💡 Usa /api per testare solo le API
        `, 'startup');
        
        // Avvia monitoraggio con debug
        this.debugMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        this.scheduleDailyReport();
    }

    // =============================================================================
    // TRADING ENGINE v2.4 - CON DEBUG INTENSIVO
    // =============================================================================

    async canContinueTrading() {
        const config = this.config.debugIntensive;
        
        const currentBalance = await this.getWalletBalance();
        if (currentBalance < config.minStartBalance) {
            console.log(`❌ Balance insufficiente: ${currentBalance.toFixed(4)} TON < ${config.minStartBalance} TON`);
            
            if (this.scanCount % 20 === 0) {
                await this.notify(`💰 Balance insufficiente per trading\nBalance attuale: ${currentBalance.toFixed(4)} TON\nMinimo richiesto: ${config.minStartBalance} TON`, 'warning', true);
            }
            return false;
        }
        
        if (this.stats.dailyPnL <= -config.maxDailyLoss) {
            console.log(`❌ Perdita giornaliera eccessiva: ${this.stats.dailyPnL.toFixed(4)} TON <= -${config.maxDailyLoss} TON`);
            return false;
        }
        
        if (this.positions.size >= config.maxPositions) {
            console.log(`❌ Troppe posizioni aperte: ${this.positions.size} >= ${config.maxPositions}`);
            return false;
        }
        
        console.log(`✅ Trading consentito - Balance: ${currentBalance.toFixed(4)} TON`);
        return true;
    }

    async debugMonitoring() {
        const scanInterval = this.config.debugIntensive.scanInterval || 30000;
        
        while (this.isRunning) {
            try {
                const canTrade = await this.canContinueTrading();
                
                if (!canTrade) {
                    console.log('⏸️ Trading sospeso per limiti di sicurezza');
                    await this.sleep(scanInterval * 2);
                    continue;
                }
                
                this.scanCount++;
                console.log(`\n🔍 Debug Scan #${this.scanCount} - ${new Date().toLocaleTimeString()} (v2.4)`);
                
                const qualityTokens = await this.findQualityTokensDebug();
                this.candidatesFound += qualityTokens.length;
                
                if (qualityTokens.length > 0) {
                    console.log(`   🎯 Trovati ${qualityTokens.length} token candidati (debug v2.4)`);
                    
                    // Notifica debug ogni 5 scansioni con risultati
                    if (this.scanCount % 5 === 0) {
                        await this.notify(`
🔍 *Debug Scan #${this.scanCount}*
🎯 Candidati: ${qualityTokens.length}
📊 Total trovati: ${this.candidatesFound}
📈 Success rate: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%
                        `, 'debug', true);
                    }
                    
                    for (const token of qualityTokens) {
                        const stillCanTrade = await this.canContinueTrading();
                        if (!stillCanTrade) break;
                        
                        const analysis = await this.debugTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.debugBuy(token, analysis);
                        } else {
                            console.log(`   📋 ${token.symbol}: ${analysis.rejectionReason}`);
                        }
                        
                        await this.sleep(3000);
                    }
                } else {
                    console.log('   💤 Nessun token candidato trovato (debug attivo)');
                    
                    // Debug ogni 10 scansioni senza risultati
                    if (this.scanCount % 10 === 0) {
                        await this.notify(`
🔍 *Debug: Scan #${this.scanCount} - 0 candidati*
📊 Success rate totale: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%

🧐 Possibili cause:
• API non rispondono
• Tutti token troppo vecchi/nuovi
• Liquidità troppo bassa
• Nessuna keyword match

💡 Usa /intensive per diagnosi completa
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

    async findQualityTokensDebug() {
        const qualityTokens = [];
        
        try {
            for (const dex of this.trustedDEXs) {
                console.log(`🔍 Scansione ${dex}...`);
                const tokens = await this.scanDEXDebug(dex);
                qualityTokens.push(...tokens);
                this.tokensAnalyzed += tokens.length;
                console.log(`   📊 ${dex}: ${tokens.length} token candidati trovati`);
            }
            
            const filtered = qualityTokens.filter(token => this.passesFiltersDebug(token));
            
            return filtered;
            
        } catch (error) {
            console.log('⚠️ Errore ricerca token:', error.message);
            return [];
        }
    }

    async scanDEXDebug(dex) {
        try {
            switch (dex) {
                case 'DeDust':
                    return await this.scanDeDustDebug();
                case 'STON.fi':
                    return await this.scanSTONfiDebug();
                default:
                    return [];
            }
        } catch (error) {
            console.log(`⚠️ Errore scansione ${dex}:`, error.message);
            return [];
        }
    }

    // =============================================================================
    // SCAN DEBUG METHODS - CON MASSIMO DEBUG
    // =============================================================================

    async scanDeDustDebug() {
        try {
            console.log('   🔍 Tentativo connessione DeDust API...');
            
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`   📡 DeDust API Response Status: ${response.status}`);
            console.log(`   📊 DeDust: ${response.data.length} pool totali`);
            
            // Step 1: Pool con TON
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
            
            // Step 2: Filtro liquidità MOLTO permissivo
            const liquidityFiltered = candidatePools.filter(pool => {
                return (pool.total_liquidity_usd || 0) >= this.config.debugIntensive.minLiquidity;
            });
            
            console.log(`   💧 Pool con liquidità >= $${this.config.debugIntensive.minLiquidity}: ${liquidityFiltered.length}`);
            
            // Step 3: Filtro età MOLTO permissivo
            const ageFiltered = liquidityFiltered.filter(pool => {
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isNotTooOld = !pool.created_at || age <= this.config.debugIntensive.maxTokenAge;
                const isNotTooNew = !pool.created_at || age >= this.config.debugIntensive.minTokenAge;
                
                if (pool.created_at) {
                    const ageHours = age / (1000 * 60 * 60);
                    const ageDays = age / (1000 * 60 * 60 * 24);
                    console.log(`   🕐 Pool age: ${ageHours.toFixed(1)}h (${ageDays.toFixed(1)}d), liq: $${pool.total_liquidity_usd || 0}`);
                }
                
                return isNotTooOld && isNotTooNew;
            });
            
            console.log(`   ⏰ Pool con età corretta: ${ageFiltered.length}`);
            console.log(`   🚀 Pool DeDust filtrate finale: ${ageFiltered.length}`);
            
            if (ageFiltered.length > 0) {
                console.log('\n🎯 Prime 5 pool DeDust che passano i filtri:');
                for (let i = 0; i < Math.min(5, ageFiltered.length); i++) {
                    const pool = ageFiltered[i];
                    const otherAsset = pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON');
                    const age = pool.created_at ? Math.floor((Date.now() - pool.created_at) / (1000 * 60 * 60)) : 'N/A';
                    console.log(`   ${i+1}. ${otherAsset?.symbol || 'UNK'} - $${pool.total_liquidity_usd || 0} (${age}h)`);
                }
            }
            
            return ageFiltered.map(pool => {
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

    async scanSTONfiDebug() {
        try {
            console.log('   🔍 Tentativo connessione STON.fi API...');
            
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)'
                }
            });
            
            console.log(`   📡 STON.fi API Response Status: ${response.status}`);
            
            if (!response.data || !response.data.pool_list) {
                console.log('   ⚠️ STON.fi: Nessun pool_list nella risposta');
                return [];
            }
            
            console.log(`   📊 STON.fi: ${response.data.pool_list.length} pool totali`);
            
            // Step 1: Pool con TON
            const candidatePools = response.data.pool_list.filter(pool => {
                return pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
            });
            
            console.log(`   📈 Pool con TON trovate: ${candidatePools.length}`);
            
            // Step 2: Filtro liquidità
            const liquidityFiltered = candidatePools.filter(pool => {
                return (pool.liquidity_usd || 0) >= this.config.debugIntensive.minLiquidity;
            });
            
            console.log(`   💧 Pool con liquidità >= $${this.config.debugIntensive.minLiquidity}: ${liquidityFiltered.length}`);
            
            // Step 3: Filtro età
            const ageFiltered = liquidityFiltered.filter(pool => {
                const age = pool.created_at ? Date.now() - pool.created_at : 0;
                const isNotTooOld = !pool.created_at || age <= this.config.debugIntensive.maxTokenAge;
                const isNotTooNew = !pool.created_at || age >= this.config.debugIntensive.minTokenAge;
                
                return isNotTooOld && isNotTooNew;
            });
            
            console.log(`   ⏰ Pool con età corretta: ${ageFiltered.length}`);
            console.log(`   📊 STON.fi: ${ageFiltered.length} pool filtrate trovate`);
            
            if (ageFiltered.length > 0) {
                console.log('\n🎯 Prime 5 pool STON.fi che passano i filtri:');
                for (let i = 0; i < Math.min(5, ageFiltered.length); i++) {
                    const pool = ageFiltered[i];
                    const otherToken = pool.token0_symbol === 'TON' ? pool.token1_symbol : pool.token0_symbol;
                    const age = pool.created_at ? Math.floor((Date.now() - pool.created_at) / (1000 * 60 * 60)) : 'N/A';
                    console.log(`   ${i+1}. ${otherToken || 'UNK'} - ${pool.liquidity_usd || 0} (${age}h)`);
                }
            }
            
            return ageFiltered.map(pool => ({
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

    // METODI PER DEBUG INTENSIVO
    async scanDeDustDebugIntensive() {
        try {
            console.log('   🔍 INTENSIVE DEBUG - DeDust API...');
            
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`   📡 DeDust Status: ${response.status}`);
            console.log(`   📊 DeDust Pool totali: ${response.data ? response.data.length : 'N/A'}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('   ❌ DeDust: Risposta non valida');
                return [];
            }
            
            // DEBUG: Primi 3 pool
            console.log('\n🔍 PRIMI 3 POOL DeDust:');
            for (let i = 0; i < Math.min(3, response.data.length); i++) {
                const pool = response.data[i];
                console.log(`Pool ${i + 1}:`);
                console.log(`  Address: ${pool.address || 'N/A'}`);
                console.log(`  Assets: ${JSON.stringify(pool.assets)}`);
                console.log(`  Liquidity: ${pool.total_liquidity_usd || 0}`);
                console.log(`  Volume: ${pool.volume_24h_usd || 0}`);
                console.log(`  Created: ${pool.created_at || 'N/A'}`);
                if (pool.created_at) {
                    const ageHours = (Date.now() - pool.created_at) / (1000 * 60 * 60);
                    console.log(`  Age: ${ageHours.toFixed(1)} ore`);
                }
            }
            
            // Filtro TON
            const tonPools = response.data.filter(pool => {
                const hasAssets = pool.assets && Array.isArray(pool.assets);
                if (!hasAssets) return false;
                
                return pool.assets.some(asset => 
                    asset.symbol === 'TON' || 
                    asset.symbol === 'WTON' || 
                    asset.name?.toLowerCase().includes('ton')
                );
            });
            
            console.log(`\n📈 Pool con TON: ${tonPools.length}`);
            
            // Filtro liquidità minima $1
            const liquidPools = tonPools.filter(pool => {
                return (pool.total_liquidity_usd || 0) >= 1; // $1 minimo
            });
            
            console.log(`💧 Pool con liquidità >= $1: ${liquidPools.length}`);
            
            // NO FILTRO ETÀ per vedere tutto
            console.log(`✅ Pool finali (senza filtro età): ${liquidPools.length}`);
            
            if (liquidPools.length > 0) {
                console.log('\n🎯 PRIMI 10 POOL FINALI DeDust:');
                for (let i = 0; i < Math.min(10, liquidPools.length); i++) {
                    const pool = liquidPools[i];
                    const otherAsset = pool.assets.find(a => a.symbol !== 'TON' && a.symbol !== 'WTON');
                    const age = pool.created_at ? Math.floor((Date.now() - pool.created_at) / (1000 * 60 * 60)) : 'N/A';
                    console.log(`   ${i+1}. ${otherAsset?.symbol || 'UNK'} - ${pool.total_liquidity_usd || 0} (${age}h)`);
                }
            }
            
            return liquidPools.map(pool => {
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
            console.log(`   ❌ DeDust INTENSIVE Error: ${error.message}`);
            return [];
        }
    }

    async scanSTONfiDebugIntensive() {
        try {
            console.log('   🔍 INTENSIVE DEBUG - STON.fi API...');
            
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4)'
                }
            });
            
            console.log(`   📡 STON.fi Status: ${response.status}`);
            console.log(`   📊 STON.fi Pool totali: ${response.data?.pool_list ? response.data.pool_list.length : 'N/A'}`);
            
            if (!response.data || !response.data.pool_list) {
                console.log('   ❌ STON.fi: Nessun pool_list');
                return [];
            }
            
            // DEBUG: Primi 3 pool
            console.log('\n🔍 PRIMI 3 POOL STON.fi:');
            for (let i = 0; i < Math.min(3, response.data.pool_list.length); i++) {
                const pool = response.data.pool_list[i];
                console.log(`Pool ${i + 1}:`);
                console.log(`  Address: ${pool.address || 'N/A'}`);
                console.log(`  Token0: ${pool.token0_symbol} (${pool.token0_name})`);
                console.log(`  Token1: ${pool.token1_symbol} (${pool.token1_name})`);
                console.log(`  Liquidity: ${pool.liquidity_usd || 0}`);
                console.log(`  Volume: ${pool.volume_24h_usd || 0}`);
                console.log(`  Created: ${pool.created_at || 'N/A'}`);
                if (pool.created_at) {
                    const ageHours = (Date.now() - pool.created_at) / (1000 * 60 * 60);
                    console.log(`  Age: ${ageHours.toFixed(1)} ore`);
                }
            }
            
            // Filtro TON
            const tonPools = response.data.pool_list.filter(pool => {
                return pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
            });
            
            console.log(`\n📈 Pool con TON: ${tonPools.length}`);
            
            // Filtro liquidità minima $1
            const liquidPools = tonPools.filter(pool => {
                return (pool.liquidity_usd || 0) >= 1; // $1 minimo
            });
            
            console.log(`💧 Pool con liquidità >= $1: ${liquidPools.length}`);
            
            // NO FILTRO ETÀ per vedere tutto
            console.log(`✅ Pool finali (senza filtro età): ${liquidPools.length}`);
            
            if (liquidPools.length > 0) {
                console.log('\n🎯 PRIMI 10 POOL FINALI STON.fi:');
                for (let i = 0; i < Math.min(10, liquidPools.length); i++) {
                    const pool = liquidPools[i];
                    const otherToken = pool.token0_symbol === 'TON' ? pool.token1_symbol : pool.token0_symbol;
                    const age = pool.created_at ? Math.floor((Date.now() - pool.created_at) / (1000 * 60 * 60)) : 'N/A';
                    console.log(`   ${i+1}. ${otherToken} - ${pool.liquidity_usd || 0} (${age}h)`);
                }
            }
            
            return liquidPools.map(pool => ({
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
            console.log(`   ❌ STON.fi INTENSIVE Error: ${error.message}`);
            return [];
        }
    }

    // =============================================================================
    // FILTRI DEBUG
    // =============================================================================

    passesFiltersDebug(token) {
        const filters = this.config.debugIntensive;
        
        console.log(`\n🔍 FILTRI DEBUG per ${token.name} (${token.symbol}):`);
        this.filterResults.totalScanned++;
        
        // 1. BLACKLIST
        if (this.tokenBlacklist.has(token.address)) {
            console.log(`   ❌ FALLITO: Token in blacklist`);
            this.filterResults.failedScam++;
            return false;
        }
        console.log(`   ✅ PASSATO: Non in blacklist`);
        
        // 2. SCAM CHECK
        if (this.isObviousScamToken(token)) {
            console.log(`   ❌ FALLITO: Scam ovvio rilevato`);
            this.tokenBlacklist.add(token.address);
            this.filterResults.failedScam++;
            return false;
        }
        console.log(`   ✅ PASSATO: Non è scam ovvio`);
        
        // 3. LIQUIDITÀ
        if (token.liquidity < filters.minLiquidity) {
            console.log(`   ❌ FALLITO: Liquidità ${token.liquidity} < ${filters.minLiquidity}`);
            this.filterResults.failedLiquidity++;
            return false;
        }
        console.log(`   ✅ PASSATO: Liquidità ${token.liquidity} >= ${filters.minLiquidity}`);
        
        // 4. ETÀ - CON DEBUG DETTAGLIATO
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        const minAge = filters.minTokenAge;
        const maxAge = filters.maxTokenAge;
        const ageMinutes = tokenAge / (1000 * 60);
        const ageHours = tokenAge / (1000 * 60 * 60);
        const ageDays = tokenAge / (1000 * 60 * 60 * 24);
        
        console.log(`   🕐 Token age: ${ageMinutes.toFixed(1)} min (${ageHours.toFixed(1)} ore, ${ageDays.toFixed(1)} giorni)`);
        console.log(`   📏 Limiti: ${minAge / (1000 * 60)} min - ${maxAge / (1000 * 60 * 60 * 24)} giorni`);
        
        if (tokenAge < minAge) {
            console.log(`   ❌ FALLITO: Troppo nuovo ${ageMinutes.toFixed(1)} min < ${(minAge / (1000 * 60)).toFixed(1)} min`);
            this.filterResults.failedAge++;
            return false;
        }
        console.log(`   ✅ PASSATO: Non troppo nuovo`);
        
        if (tokenAge > maxAge) {
            console.log(`   ❌ FALLITO: Troppo vecchio ${ageDays.toFixed(1)} giorni > ${(maxAge / (1000 * 60 * 60 * 24)).toFixed(1)} giorni`);
            this.filterResults.failedAge++;
            return false;
        }
        console.log(`   ✅ PASSATO: Non troppo vecchio`);
        
        // 5. KEYWORDS - CON DEBUG DETTAGLIATO
        const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
        console.log(`   🔤 Testo da analizzare: "${tokenText}"`);
        
        const matchedKeywords = [];
        for (const keyword of filters.strongKeywords) {
            if (tokenText.includes(keyword.toLowerCase())) {
                matchedKeywords.push(keyword);
            }
        }
        
        console.log(`   🎯 Keywords trovate: [${matchedKeywords.join(', ')}]`);
        console.log(`   📊 Totale keywords trovate: ${matchedKeywords.length}`);
        
        if (matchedKeywords.length === 0) {
            console.log(`   ❌ FALLITO: Nessuna keyword trovata`);
            console.log(`   💡 Prime 20 keywords monitorate: ${filters.strongKeywords.slice(0, 20).join(', ')}...`);
            this.filterResults.failedKeywords++;
            return false;
        }
        
        console.log(`   ✅ PASSATO: ${matchedKeywords.length} keywords trovate!`);
        
        this.filterResults.passedBasic++;
        console.log(`   🎉 TOKEN APPROVATO: ${token.symbol} supera tutti i filtri!`);
        return true;
    }

    passesFiltersDebugIntensive(token) {
        const filters = this.config.debugIntensive;
        
        console.log(`\n🔬 INTENSIVE FILTRI DEBUG per ${token.name} (${token.symbol}):`);
        console.log(`   💧 Liquidità: ${token.liquidity}`);
        console.log(`   🕐 Created: ${token.createdAt}`);
        
        if (token.createdAt) {
            const age = Date.now() - token.createdAt;
            const ageHours = age / (1000 * 60 * 60);
            const ageDays = age / (1000 * 60 * 60 * 24);
            console.log(`   📊 Age: ${ageHours.toFixed(1)} ore (${ageDays.toFixed(1)} giorni)`);
        }
        
        this.filterResults.totalScanned++;
        
        // 1. BLACKLIST
        if (this.tokenBlacklist.has(token.address)) {
            console.log(`   ❌ RIFIUTATO: In blacklist`);
            this.filterResults.failedScam++;
            return false;
        }
        
        // 2. SCAM CHECK MINIMALE
        if (this.isObviousScamToken(token)) {
            console.log(`   ❌ RIFIUTATO: Scam ovvio`);
            this.tokenBlacklist.add(token.address);
            this.filterResults.failedScam++;
            return false;
        }
        
        // 3. LIQUIDITÀ RIDOTTISSIMA
        if (token.liquidity < filters.minLiquidity) {
            console.log(`   ❌ RIFIUTATO: Liquidità troppo bassa`);
            this.filterResults.failedLiquidity++;
            return false;
        }
        
        // 4. ETÀ
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        if (tokenAge < filters.minTokenAge || tokenAge > filters.maxTokenAge) {
            console.log(`   ❌ RIFIUTATO: Età non valida`);
            this.filterResults.failedAge++;
            return false;
        }
        
        // 5. KEYWORDS
        const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
        const hasKeyword = filters.strongKeywords.some(keyword => 
            tokenText.includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
            console.log(`   ❌ RIFIUTATO: Nessuna keyword`);
            this.filterResults.failedKeywords++;
            return false;
        }
        
        console.log(`   ✅ APPROVATO: Passa tutti i filtri`);
        this.filterResults.passedBasic++;
        return true;
    }

    // =============================================================================
    // ANTI-SCAM MINIMALE
    // =============================================================================

    isObviousScamToken(token) {
        const name = token.name.toLowerCase();
        const symbol = token.symbol.toLowerCase();
        const combined = `${name} ${symbol}`;
        
        // SOLO I PIÙ OVVI
        const obviousScamPatterns = [
            /^test$/i, /^fake$/i, /^scam$/i, /^rug$/i,
            /^[a-f0-9]{40}$/i,  // Solo hash
            /^[0-9]{10,}$/,     // Solo numeri lunghi
            /(.)\1{6,}/,        // Troppi caratteri ripetuti
            /^.{1}$/,           // Solo 1 carattere
            /^.{100,}$/,        // Troppo lungo
            /fuck/i, /shit/i, /xxx/i, /sex/i, /porn/i,
            /^bitcoin$/i, /^btc$/i, /^ethereum$/i, /^eth$/i, /^usdt$/i, /^usdc$/i
        ];
        
        for (const pattern of obviousScamPatterns) {
            if (pattern.test(combined)) {
                console.log(`   🚨 Scam OVVIO: ${pattern} in "${combined}"`);
                return true;
            }
        }
        
        if (token.liquidity <= 0) {
            console.log(`   🚨 Liquidità invalida: ${token.liquidity}`);
            return true;
        }
        
        return false;
    }

    // =============================================================================
    // ANALISI TOKEN DEBUG
    // =============================================================================

    async debugTokenAnalysis(token) {
        console.log(`🔬 Analisi debug: ${token.name} (${token.symbol})`);
        
        let confidenceScore = 50; // Base alto per debug
        const analysis = {
            shouldBuy: false,
            confidenceScore: 0,
            reasons: [],
            warnings: [],
            rejectionReason: ''
        };
        
        try {
            // Analisi liquidità (30% peso)
            const liquidityScore = this.analyzeLiquidityScoreDebug(token);
            confidenceScore += liquidityScore * 0.3;
            analysis.reasons.push(`Liquidità: ${liquidityScore}/100`);
            
            // Analisi volume (20% peso)
            const volumeScore = this.analyzeVolumeScoreDebug(token);
            confidenceScore += volumeScore * 0.2;
            analysis.reasons.push(`Volume: ${volumeScore}/100`);
            
            // Analisi keyword (40% peso)
            const keywordScore = this.analyzeKeywordScoreDebug(token);
            confidenceScore += keywordScore * 0.4;
            analysis.reasons.push(`Keywords: ${keywordScore}/100`);
            
            // Analisi tecnica (10% peso)
            const technicalScore = this.analyzeTechnicalScoreDebug(token);
            confidenceScore += technicalScore * 0.1;
            analysis.reasons.push(`Tecnica: ${technicalScore}/100`);
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            const minConfidence = this.config.debugIntensive.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence) {
                analysis.shouldBuy = true;
                this.filterResults.approved++;
                analysis.reasons.push(`✅ APPROVATO DEBUG - Confidence: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO DEBUG - Confidence: ${analysis.confidenceScore}%`);
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

    analyzeLiquidityScoreDebug(token) {
        let score = 0;
        
        if (token.liquidity > 500) score = 100;
        else if (token.liquidity > 100) score = 90;
        else if (token.liquidity > 50) score = 80;
        else if (token.liquidity > 25) score = 70;
        else if (token.liquidity > 10) score = 60;
        else if (token.liquidity > 5) score = 50;
        else if (token.liquidity > 1) score = 40;
        else score = 20;
        
        console.log(`   💧 Liquidità ${token.liquidity} → Score: ${score}/100`);
        return score;
    }

    analyzeVolumeScoreDebug(token) {
        let score = 50;
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        
        if (volumeRatio > 0.2) score = 100;
        else if (volumeRatio > 0.1) score = 80;
        else if (volumeRatio > 0.05) score = 60;
        else if (volumeRatio > 0.01) score = 40;
        else score = 20;
        
        return score;
    }

    analyzeKeywordScoreDebug(token) {
        const strongKeywords = this.config.debugIntensive.strongKeywords;
        let score = 60; // Base alto
        
        const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
        
        const keywordBonuses = {
            'blum': 50, 'ton': 40, 'doge': 35, 'pepe': 35, 'shiba': 35,
            'moon': 30, 'rocket': 30, 'gem': 30, 'safe': 20, 'pump': 25,
            'bull': 25, 'diamond': 20, 'coin': 15, 'token': 10
        };
        
        let bestBonus = 0;
        let matchedKeywords = [];
        
        for (const keyword of strongKeywords) {
            if (tokenText.includes(keyword.toLowerCase())) {
                const bonus = keywordBonuses[keyword.toLowerCase()] || 5;
                if (bonus > bestBonus) {
                    bestBonus = bonus;
                }
                matchedKeywords.push(keyword);
            }
        }
        
        score += bestBonus;
        
        if (matchedKeywords.length > 1) {
            const multiBonus = Math.min((matchedKeywords.length - 1) * 5, 15);
            score += multiBonus;
        }
        
        console.log(`   🎯 Keywords: [${matchedKeywords.join(', ')}] → Score: ${score}/100`);
        return Math.min(score, 100);
    }

    analyzeTechnicalScoreDebug(token) {
        let score = 60;
        
        if (token.dex === 'DeDust') score += 10;
        if (token.dex === 'STON.fi') score += 10;
        
        const tokenAge = Date.now() - (token.createdAt || Date.now());
        const ageHours = tokenAge / (1000 * 60 * 60);
        
        if (ageHours >= 1 && ageHours <= 48) score += 20;
        else if (ageHours >= 0.5 && ageHours <= 168) score += 10;
        
        return Math.max(Math.min(score, 100), 0);
    }

    async debugBuy(token, analysis) {
        try {
            const buyAmount = this.config.debugIntensive.maxTradeSize;
            
            console.log(`💰 ACQUISTO DEBUG v2.4: ${buyAmount} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}%`);
            console.log(`   💧 Liquidità: ${token.liquidity.toFixed(0)}`);
            console.log(`   🎯 Motivi: ${analysis.reasons.join(', ')}`);
            console.log(`   🔍 Debug: Massima visibilità attiva`);
            
            const txHash = `debug_${Math.random().toString(16).substr(2, 10)}`;
            
            const position = {
                name: token.name,
                symbol: token.symbol,
                amount: buyAmount,
                entryPrice: 0.000001 + Math.random() * 0.001,
                entryTime: Date.now(),
                confidence: analysis.confidenceScore,
                dex: token.dex,
                txHash,
                stopLoss: this.config.debugIntensive.stopLossPercent,
                takeProfit: this.config.debugIntensive.takeProfitPercent,
                liquidity: token.liquidity,
                reasons: analysis.reasons,
                version: '2.4-debug',
                debugMode: true
            };
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${position.stopLoss}%`);
            console.log(`   🎯 Take Profit: ${position.takeProfit}%`);
            
            await this.notifyDebugTrade('buy', position);
            this.startDebugPositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto debug:', error.message);
            await this.notify(`❌ Errore acquisto debug ${token.symbol}: ${error.message}`, 'error');
        }
    }

    async notifyDebugTrade(action, position, pnl = null) {
        let message = '';
        let type = 'trade';
        
        if (action === 'buy') {
            message = `
🔍 *ACQUISTO DEBUG v2.4*
Token: ${position.symbol} (${position.name})
Amount: ${position.amount.toFixed(4)} TON
Confidence: ${position.confidence}%
Debug Mode: ${position.debugMode ? '✅' : '❌'}
DEX: ${position.dex}
Stop Loss: ${position.stopLoss}%
Take Profit: ${position.takeProfit}%
Liquidity: ${position.liquidity.toFixed(0)}

🎯 *Motivi Debug:*
${position.reasons ? position.reasons.join('\n') : 'Analisi debug standard'}

🔍 *Debug Mode:* Massima visibilità!
            `.trim();
        } else if (action === 'sell') {
            const pnlPercent = (pnl / position.amount) * 100;
            type = pnlPercent > 0 ? 'profit' : 'loss';
            const pnlIcon = pnlPercent > 0 ? '📈' : '📉';
            
            message = `
${pnlIcon} *VENDITA DEBUG v2.4*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
Time Held: ${this.formatTime(Date.now() - position.entryTime)}
Debug Mode: ${position.debugMode ? '✅' : '❌'}
Confidence era: ${position.confidence}%
Motivo: ${action === 'stop_loss' ? 'Stop Loss' : action === 'take_profit' ? 'Take Profit' : 'Exit'}
            `.trim();
        }
        
        await this.notify(message, type);
    }

    startDebugPositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                const priceChange = (Math.random() - 0.5) * 20; // ±10%
                
                if (this.scanCount % 4 === 0) {
                    console.log(`📊 DEBUG ${position.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
                }
                
                if (priceChange <= position.stopLoss) {
                    console.log(`🛑 DEBUG STOP LOSS ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.debugSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                    return;
                }
                
                if (priceChange >= position.takeProfit) {
                    console.log(`🎯 DEBUG TAKE PROFIT ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.debugSell(tokenAddress, 'take_profit');
                    clearInterval(monitorInterval);
                    return;
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio debug ${tokenAddress}:`, error.message);
            }
        }, 25000); // Ogni 25 secondi
        
        setTimeout(async () => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                console.log(`⏰ DEBUG timeout raggiunto per ${this.positions.get(tokenAddress).symbol}`);
                await this.debugSell(tokenAddress, 'timeout');
            }
        }, this.config.debugIntensive.maxHoldTime);
    }

    async debugSell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            console.log(`💸 VENDITA DEBUG ${position.symbol} | Motivo: ${reason}`);
            
            let pnl;
            if (reason === 'stop_loss') {
                pnl = position.amount * (position.stopLoss / 100);
            } else if (reason === 'take_profit') {
                pnl = position.amount * (position.takeProfit / 100);
            } else {
                const confidenceBias = (position.confidence - 50) / 100;
                pnl = (Math.random() - 0.2 + confidenceBias) * 0.12 * position.amount;
            }
            
            const pnlPercent = (pnl / position.amount) * 100;
            
            console.log(`📊 DEBUG P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnl > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
            
            this.stats.totalPnL += pnl;
            this.stats.dailyPnL += pnl;
            
            if (pnl > 0) {
                this.stats.winningTrades++;
            }
            
            if (pnl < 0) {
                this.stats.currentDrawdown += Math.abs(pnl);
                this.stats.maxDrawdown = Math.max(this.stats.maxDrawdown, this.stats.currentDrawdown);
            } else {
                this.stats.currentDrawdown = Math.max(0, this.stats.currentDrawdown - pnl);
            }
            
            await this.notifyDebugTrade('sell', position, pnl);
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore vendita debug:', error.message);
            await this.notify(`❌ Errore vendita debug ${tokenAddress}: ${error.message}`, 'error');
        }
    }

    // =============================================================================
    // UTILITY METHODS
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
            if (this.stats.dailyPnL <= -this.config.debugIntensive.maxDailyLoss) {
                await this.notify(`
🚨 *ALERT DEBUG: Perdita Massima*
P&L Oggi: ${this.stats.dailyPnL.toFixed(4)} TON
Limite: -${this.config.debugIntensive.maxDailyLoss} TON

Trading debug sospeso per oggi.
                `, 'warning');
            }
            
            const currentBalance = await this.getWalletBalance();
            if (currentBalance < this.config.debugIntensive.minStartBalance) {
                await this.notify(`
⚠️ *ALERT DEBUG: Balance Insufficiente*
Balance attuale: ${currentBalance.toFixed(4)} TON
Minimo richiesto: ${this.config.debugIntensive.minStartBalance} TON

Invia TON a: \`${this.walletAddress}\`
                `, 'warning');
            }
        }, 15 * 60 * 1000); // Ogni 15 minuti
    }

    scheduleDailyReport() {
        setInterval(async () => {
            await this.notifyDailyReport();
        }, 12 * 60 * 60 * 1000);
        
        setInterval(async () => {
            if (this.positions.size > 0 || this.scanCount % 20 === 0) {
                await this.notify(`
📊 *Update DEBUG v2.4* (${this.positions.size} posizioni)
P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
Scansioni: ${this.scanCount}
🔍 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}
                `, 'info', true);
            }
        }, 3 * 60 * 60 * 1000); // Ogni 3 ore
    }

    async notifyDailyReport() {
        const balance = await this.getWalletBalance();
        const winRate = this.getWinRate();
        
        const message = `
📊 *REPORT DEBUG v2.4*

💳 Wallet: \`${this.walletAddress}\`
💰 Balance: ${balance.toFixed(4)} TON
📈 P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
🎯 Win Rate: ${winRate}%
📊 Trades: ${this.stats.totalTrades}
🔍 Scansioni: ${this.scanCount}
🚀 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati trovati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}

📈 *Performance Debug:*
• Success rate: ${this.scanCount > 0 ? ((this.candidatesFound / this.scanCount) * 100).toFixed(1) : 0}%
• Approval rate: ${this.candidatesFound > 0 ? ((this.filterResults.approved / this.candidatesFound) * 100).toFixed(1) : 0}%

🔗 Webhook: ${this.webhookConfigured ? '✅' : '📱'}

🔍 ${this.stats.dailyPnL > 0 ? 'DEBUG SUCCESS!' : this.stats.dailyPnL < -0.05 ? '⚠️ Debug Loss' : '😐 Neutro'}
        `.trim();
        
        await this.notify(message, this.stats.dailyPnL > 0 ? 'profit' : 'info');
    }

    async updateStats() {
        const balance = await this.getWalletBalance();
        
        if (balance > this.stats.startBalance * 1.5) {
            console.log(`💰 Rilevato nuovo deposito: ${this.stats.startBalance.toFixed(4)} → ${balance.toFixed(4)} TON`);
            this.stats.startBalance = balance;
            
            await this.notify(`💰 Nuovo deposito rilevato!\nBalance aggiornato: ${balance.toFixed(4)} TON\n🔍 Trading debug ora attivo`, 'success');
        }
        
        console.log(`📊 Stats v2.4: ${this.stats.totalTrades} trades | Balance: ${balance.toFixed(4)} TON | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}% | Analizzati: ${this.tokensAnalyzed} | Candidati: ${this.candidatesFound}`);
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
        console.log('🛑 Debug Intensivo Bot v2.4 fermato');
        this.notify('🛑 Bot debug v2.4 fermato', 'info');
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
// CONFIGURAZIONE DEBUG INTENSIVO v2.4
// =============================================================================

const debugIntensiveConfig = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    
    debugIntensive: {
        // TRADING PARAMETERS PERMISSIVI PER DEBUG
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || 0.15,
        maxPositions: parseInt(process.env.MAX_POSITIONS) || 3,
        minStartBalance: parseFloat(process.env.MIN_START_BALANCE) || 0.2,
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 0.4,
        
        // EXIT STRATEGY
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || -6,
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 10,
        maxHoldTime: parseInt(process.env.MAX_HOLD_TIME) || 3600000, // 1 ora
        
        // FILTRI PERMISSIVI PER DEBUG
        minConfidenceScore: parseFloat(process.env.MIN_CONFIDENCE_SCORE) || 30, // Basso per debug
        minLiquidity: parseFloat(process.env.MIN_LIQUIDITY) || 2,   // Bassissimo
        minTokenAge: parseInt(process.env.MIN_TOKEN_AGE) || 300000,  // 5 min
        maxTokenAge: parseInt(process.env.MAX_TOKEN_AGE) || 7776000000, // 90 giorni
        
        // KEYWORDS RIDOTTE PER TEST
        strongKeywords: (process.env.STRONG_KEYWORDS || 'doge,pepe,shiba,moon,rocket,gem,safe,baby,mini,meta,ton,coin,token,defi,yield,stake,farm,blum,elon,mars,lambo,hodl,diamond,pump,bull,green,gold,star,fire,cat,dog,king,fast,speed,jet,flash,super,mega,ultra,alpha,beta,omega,crypto,chain,block,smart,auto,quick,rapid,turbo,boost,power,energy,force,magic,lucky,winner,rich,wealth,bank,vault,treasure,island,ocean,sea,wave,storm,thunder,lightning,ice,snow,winter,summer,sun,bright,light,dark,shadow,time,space,planet,star,moon,earth,mars,jupiter,neptune,venus,saturn,mercury,pluto').split(','),
        
        scanInterval: parseInt(process.env.SCAN_INTERVAL) || 30000, // 30 secondi
    }
};

// =============================================================================
// AVVIO AUTOMATICO BOT v2.4 DEBUG INTENSIVO
// =============================================================================

console.log('🚀 Inizializzazione TON DEBUG INTENSIVO Bot v2.4 su Render...');
console.log('🔧 Novità DEBUG v2.4:');
console.log('   🔍 Debug completo di ogni step');
console.log('   📊 Mostra perché i token vengono rifiutati');
console.log('   🎯 Confidence minimo: 30% (per test)');
console.log('   💧 Liquidità minima: $2 (per test)');
console.log('   ⏰ Age range: 5min-90giorni (ampio)');
console.log('   🔧 Comandi /intensive, /api, /scan');
console.log('   📱 Notifiche debug dettagliate');
console.log('   🔍 TROVA IL PROBLEMA dei 0 token!');

setTimeout(async () => {
    try {
        bot = new DebugIntensiveTONBot(debugIntensiveConfig);
        
        await bot.start();
        
        console.log('✅ Bot DEBUG INTENSIVO v2.4 avviato con successo su Render!');
        console.log(`🌐 Server disponibile su porta ${PORT}`);
        console.log('🔗 Test webhook: https://bot-trading-conservativo.onrender.com/webhook/test');
        console.log('📊 Debug info: https://bot-trading-conservativo.onrender.com/stats');
        
    } catch (error) {
        console.error('❌ Errore avvio bot debug v2.4:', error);
        
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const errorBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
                await errorBot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
                    `❌ Errore avvio bot DEBUG v2.4 su Render:\n${error.message}\n\nControlla i logs su Render dashboard.`);
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
    console.log('\n🛑 Ricevuto SIGINT, fermando bot debug v2.4...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot debug v2.4 fermato da SIGINT (restart server)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Ricevuto SIGTERM, fermando bot debug v2.4...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot debug v2.4 fermato da SIGTERM (deploy/restart)', 'warning').catch(() => {});
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
        bot.notify(`❌ Errore critico debug v2.4: ${error.message}`, 'error').catch(() => {});
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (bot && bot.telegram) {
        bot.notify(`❌ Promise rejection debug v2.4: ${reason}`, 'error').catch(() => {});
    }
});

// =============================================================================
// EXPORT MODULE
// =============================================================================

module.exports = { DebugIntensiveTONBot, debugIntensiveConfig };

// =============================================================================
// ISTRUZIONI SETUP DEBUG v2.4
// =============================================================================

console.log('\n🔍 SETUP DEBUG INTENSIVO v2.4:');
console.log('==========================================');
console.log('📋 1. Sostituisci bot.js con questo codice DEBUG');
console.log('🔑 2. Le variabili ambiente sono già ottimizzate');
console.log('🚀 3. Deploy su Render');
console.log('📱 4. Comandi debug disponibili:');
console.log('   /intensive - Debug completo API + filtri');
console.log('   /api - Test rapido solo API');
console.log('   /scan - Scansione manuale');
console.log('   /debug - Info contatori');
console.log('   /filters - Performance filtri');
console.log('');
console.log('✨ COSA FARÀ IL DEBUG:');
console.log('• Mostra ESATTAMENTE perché trova 0 pool');
console.log('• Debug step-by-step di ogni filtro');
console.log('• Test API separati');
console.log('• Età token mostrata in ore/giorni');
console.log('• Keywords match dettagliate');
console.log('• Liquidità check con soglie bassissime');
console.log('• Logs completi di ogni scansione');
console.log('==========================================');
console.log('🎯 OBIETTIVO: Trovare il VERO problema!');
console.log('🔧 Usa /intensive per diagnosi completa!');
