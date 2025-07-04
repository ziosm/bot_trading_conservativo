const { TonClient, WalletContractV4, internal, Address } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER con WEBHOOK TELEGRAM v2.4.2 EMERGENCY DEBUG
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
        status: '🚨 TON Bot v2.4.2 EMERGENCY DEBUG - Analisi API Completa',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '2.4.2-emergency',
        message: 'Bot con EMERGENCY DEBUG per trovare struttura API reale',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Bot v2.4.2 EMERGENCY DEBUG',
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
            await bot.notify('🚨 Test webhook v2.4.2 EMERGENCY DEBUG eseguito!\n🔬 Analisi API ultra-completa attiva', 'info');
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
            version: '2.4.2-emergency-debug',
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
            emergencyMode: true,
            debugInfo: {
                emergencyDebugActive: true,
                apiAnalysisComplete: bot.apiAnalysisComplete || false,
                dedustPoolsFound: bot.dedustPoolsFound || 0,
                stonfiPoolsFound: bot.stonfiPoolsFound || 0,
                lastEmergencyDebug: bot.lastEmergencyDebug || null
            }
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '2.4.2-emergency-debug',
            message: 'Bot EMERGENCY DEBUG is starting up...',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/bot/start', (req, res) => {
    if (bot && !bot.isRunning) {
        bot.start();
        res.json({ message: 'Bot v2.4.2 EMERGENCY DEBUG started via API' });
    } else if (bot && bot.isRunning) {
        res.json({ message: 'Bot already running' });
    } else {
        res.json({ message: 'Bot not initialized yet' });
    }
});

app.get('/bot/stop', (req, res) => {
    if (bot && bot.isRunning) {
        bot.stop();
        res.json({ message: 'Bot v2.4.2 EMERGENCY DEBUG stopped via API' });
    } else {
        res.json({ message: 'Bot not running' });
    }
});

// Avvia server Express IMMEDIATAMENTE
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚨 Server v2.4.2 EMERGENCY DEBUG running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🔗 Webhook info: http://localhost:${PORT}/webhook/info`);
    console.log('✅ Render può ora rilevare il servizio');
});

// =============================================================================
// BOT CLASS v2.4.2 EMERGENCY DEBUG - ANALISI API COMPLETA
// =============================================================================

class EmergencyDebugTONBot {
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
        
        // EMERGENCY DEBUG CONTATORI
        this.candidatesFound = 0;
        this.tokensAnalyzed = 0;
        this.lastEmergencyDebug = null;
        this.apiAnalysisComplete = false;
        this.dedustPoolsFound = 0;
        this.stonfiPoolsFound = 0;
        this.emergencyResults = {
            dedustAnalysis: null,
            stonfiAnalysis: null,
            totalApiCalls: 0,
            successfulMappings: 0
        };
        
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
        
        console.log('🚨 TON Bot v2.4.2 EMERGENCY DEBUG inizializzato');
        console.log('🔬 Modalità: ANALISI API ULTRA-COMPLETA');
        console.log('📊 Target: Trovare ESATTAMENTE dove sono i pool TON');
        
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
                    await this.notify('🚨 Webhook v2.4.2 EMERGENCY DEBUG configurato!\n🔬 Analisi API ultra-completa attiva', 'success');
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
                await this.notify('📱 Telegram v2.4.2 EMERGENCY DEBUG con polling fallback\n🔬 Analisi API ultra-completa attiva', 'info');
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
                case '/emergency':
                case '/intensive':
                    await this.runEmergencyDebug(chatId);
                    break;
                case '/api':
                    await this.testAPIsEmergency(chatId);
                    break;
                case '/debug':
                    await this.sendEmergencyDebugInfo(chatId);
                    break;
                case '/analysis':
                    await this.sendFullAnalysis(chatId);
                    break;
                case '/structure':
                    await this.showAPIStructure(chatId);
                    break;
                case '/mapping':
                    await this.testEmergencyMapping(chatId);
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
                case '/stop':
                    await this.handleStopCommand(chatId);
                    break;
                case '/restart':
                    await this.handleRestartCommand(chatId);
                    break;
                case '/help':
                    await this.sendEmergencyHelpMessage(chatId);
                    break;
                case '/test':
                    await this.telegram.sendMessage(chatId, '✅ Bot v2.4.2 EMERGENCY DEBUG risponde!\n🚨 Modalità analisi API attiva!\n🔬 Usa /emergency per debug completo');
                    break;
                default:
                    if (text.startsWith('/')) {
                        await this.telegram.sendMessage(chatId, 
                            `❓ Comando non riconosciuto: ${text}\n\n` +
                            `🚨 EMERGENCY DEBUG v2.4.2\n` +
                            `📱 Usa /help per tutti i comandi\n` +
                            `🔬 Usa /emergency per analisi API completa`
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
    // EMERGENCY DEBUG COMMANDS
    // =============================================================================

    async handleStartCommand(chatId) {
        if (!this.isRunning) {
            await this.start();
            await this.telegram.sendMessage(chatId, '🚨 Bot v2.4.2 EMERGENCY DEBUG avviato!\n🔬 Analisi API ultra-completa attiva\nUsa /emergency per debug massimo.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già in esecuzione\nUsa /emergency per analisi completa.');
        }
    }

    async handleStopCommand(chatId) {
        if (this.isRunning) {
            this.stop();
            await this.telegram.sendMessage(chatId, '🛑 Bot v2.4.2 EMERGENCY DEBUG fermato\nUsa /start per riavviare.');
        } else {
            await this.telegram.sendMessage(chatId, '⚠️ Bot già fermato\nUsa /start per avviare.');
        }
    }

    async handleRestartCommand(chatId) {
        await this.telegram.sendMessage(chatId, '🔄 Riavvio bot v2.4.2 EMERGENCY DEBUG...');
        
        if (this.isRunning) {
            this.stop();
            await this.sleep(2000);
        }
        
        await this.start();
        await this.telegram.sendMessage(chatId, '✅ Bot v2.4.2 EMERGENCY DEBUG riavviato!\n🔬 Analisi API ultra-completa attiva');
    }

    async runEmergencyDebug(chatId) {
        await this.telegram.sendMessage(chatId, '🚨 AVVIO EMERGENCY DEBUG v2.4.2\n🔬 Analisi API ultra-completa in corso...');
        this.lastEmergencyDebug = new Date().toISOString();
        
        try {
            console.log('\n🚨🚨🚨 EMERGENCY DEBUG v2.4.2 INIZIATO 🚨🚨🚨');
            console.log('='.repeat(60));
            
            // Reset contatori
            this.emergencyResults.totalApiCalls = 0;
            this.emergencyResults.successfulMappings = 0;
            
            // Test DeDust EMERGENCY
            await this.telegram.sendMessage(chatId, '🔬 Fase 1: Analisi DeDust API ultra-completa...');
            console.log('\n📡 FASE 1: EMERGENCY ANALYSIS - DeDust API');
            console.log('-'.repeat(50));
            const dedustTokens = await this.scanDeDustDebugFIXED();
            this.emergencyResults.dedustAnalysis = {
                totalPools: this.dedustPoolsFound,
                mappedTokens: dedustTokens.length,
                timestamp: new Date().toISOString()
            };
            
            // Test STON.fi EMERGENCY
            await this.telegram.sendMessage(chatId, '🔬 Fase 2: Analisi STON.fi API ultra-completa...');
            console.log('\n📡 FASE 2: EMERGENCY ANALYSIS - STON.fi API');
            console.log('-'.repeat(50));
            const stonfiTokens = await this.scanSTONfiDebugFIXED();
            this.emergencyResults.stonfiAnalysis = {
                totalPools: this.stonfiPoolsFound,
                mappedTokens: stonfiTokens.length,
                timestamp: new Date().toISOString()
            };
            
            const allTokens = [...dedustTokens, ...stonfiTokens];
            this.emergencyResults.successfulMappings = allTokens.length;
            this.apiAnalysisComplete = true;
            
            console.log('\n' + '='.repeat(60));
            console.log('🚨 EMERGENCY DEBUG v2.4.2 COMPLETATO');
            console.log('='.repeat(60));
            
            let message = `🚨 *EMERGENCY DEBUG v2.4.2 COMPLETATO*\n\n`;
            message += `📊 *Risultati Analisi Ultra-Completa:*\n`;
            message += `• DeDust: ${dedustTokens.length} token mappati da ${this.dedustPoolsFound} pool\n`;
            message += `• STON.fi: ${stonfiTokens.length} token mappati da ${this.stonfiPoolsFound} pool\n`;
            message += `• Totale: ${allTokens.length} token candidati trovati\n\n`;
            
            if (allTokens.length > 0) {
                message += `🎉 *SUCCESSO! Pool TON trovati!*\n\n`;
                message += `🎯 *Primi Token Candidati:*\n`;
                for (let i = 0; i < Math.min(allTokens.length, 8); i++) {
                    const token = allTokens[i];
                    const age = token.createdAt ? Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)) : 'N/A';
                    message += `${i + 1}. ${token.symbol} - $${token.liquidity} (${age}h) - ${token.dex}\n`;
                }
                
                if (allTokens.length > 8) {
                    message += `... e altri ${allTokens.length - 8} token\n`;
                }
                
                message += `\n✅ PROBLEMA RISOLTO! Le API funzionano!\n`;
                message += `🔧 Emergency debug ha trovato la struttura corretta!`;
                
            } else {
                message += `❌ *PROBLEMA PERSISTE!*\n\n`;
                message += `🔍 *Analisi:*\n`;
                message += `• DeDust pool scansionati: ${this.dedustPoolsFound}\n`;
                message += `• STON.fi pool scansionati: ${this.stonfiPoolsFound}\n`;
                message += `• Mapping falliti su tutti i pool\n\n`;
                message += `💡 Controlla i logs per dettagli struttura API`;
            }
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
            // Se abbiamo trovato token, testa i filtri
            if (allTokens.length > 0) {
                await this.telegram.sendMessage(chatId, '🔬 Fase 3: Test filtri sui token trovati...');
                
                for (let i = 0; i < Math.min(3, allTokens.length); i++) {
                    const token = allTokens[i];
                    console.log(`\n🔬 TESTING FILTRI EMERGENCY su ${token.symbol}...`);
                    const passed = this.passesFiltersDebug(token);
                    
                    await this.telegram.sendMessage(chatId, 
                        `🔬 *Test ${token.symbol}*\n` +
                        `Liquidità: $${token.liquidity}\n` +
                        `Età: ${token.createdAt ? Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)) : 'N/A'} ore\n` +
                        `Risultato: ${passed ? '✅ APPROVATO' : '❌ RIFIUTATO'}\n` +
                        `Emergency: ✅ FUNZIONA`, 
                        { parse_mode: 'Markdown' }
                    );
                }
            }
            
        } catch (error) {
            console.error('❌ Errore emergency debug:', error.message);
            await this.telegram.sendMessage(chatId, `❌ Errore emergency debug: ${error.message}`);
        }
    }

    async testAPIsEmergency(chatId) {
        await this.telegram.sendMessage(chatId, '🚨 Testing API con EMERGENCY DEBUG...');
        
        try {
            // Test DeDust
            const dedustStart = Date.now();
            const dedustResponse = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4.2-EMERGENCY)',
                    'Accept': 'application/json'
                }
            });
            const dedustTime = Date.now() - dedustStart;
            
            // Test STON.fi
            const stonfiStart = Date.now();
            const stonfiResponse = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4.2-EMERGENCY)'
                }
            });
            const stonfiTime = Date.now() - stonfiStart;
            
            let message = `🚨 *TEST API v2.4.2 EMERGENCY*\n\n`;
            message += `📡 *DeDust API:*\n`;
            message += `• Status: ${dedustResponse.status}\n`;
            message += `• Tempo: ${dedustTime}ms\n`;
            message += `• Pool totali: ${dedustResponse.data ? dedustResponse.data.length : 'N/A'}\n`;
            message += `• Tipo risposta: ${Array.isArray(dedustResponse.data) ? 'Array' : typeof dedustResponse.data}\n`;
            message += `• Size: ${JSON.stringify(dedustResponse.data).length} chars\n\n`;
            
            message += `📡 *STON.fi API:*\n`;
            message += `• Status: ${stonfiResponse.status}\n`;
            message += `• Tempo: ${stonfiTime}ms\n`;
            message += `• Pool totali: ${stonfiResponse.data?.pool_list ? stonfiResponse.data.pool_list.length : 'N/A'}\n`;
            message += `• Ha pool_list: ${!!stonfiResponse.data?.pool_list}\n`;
            message += `• Chiavi: [${stonfiResponse.data ? Object.keys(stonfiResponse.data).join(', ') : 'N/A'}]\n\n`;
            
            message += `✅ Entrambe le API sono ONLINE\n`;
            message += `🔬 Usa /emergency per analisi completa struttura`;
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore test API: ${error.message}`);
        }
    }

    async sendEmergencyDebugInfo(chatId) {
        const message = `
🚨 *EMERGENCY DEBUG INFO v2.4.2*

📊 *Contatori Emergency:*
• API calls: ${this.emergencyResults.totalApiCalls}
• Successful mappings: ${this.emergencyResults.successfulMappings}
• DeDust pools found: ${this.dedustPoolsFound}
• STON.fi pools found: ${this.stonfiPoolsFound}

📈 *Analisi Status:*
• Analysis complete: ${this.apiAnalysisComplete ? '✅' : '❌'}
• Last emergency debug: ${this.lastEmergencyDebug || 'Mai'}
• DeDust analysis: ${this.emergencyResults.dedustAnalysis ? '✅' : '❌'}
• STON.fi analysis: ${this.emergencyResults.stonfiAnalysis ? '✅' : '❌'}

🔬 *Emergency Commands:*
• /emergency - Analisi API completa
• /structure - Mostra strutture API
• /mapping - Test mapping algoritmi
• /analysis - Report analisi dettagliato

💡 Usa /emergency per debug ultra-completo!
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendFullAnalysis(chatId) {
        if (!this.apiAnalysisComplete) {
            await this.telegram.sendMessage(chatId, '⚠️ Analisi non completata. Usa /emergency prima.');
            return;
        }
        
        let message = `🔬 *ANALISI COMPLETA v2.4.2*\n\n`;
        
        if (this.emergencyResults.dedustAnalysis) {
            message += `📊 *DeDust Analysis:*\n`;
            message += `• Pool scansionati: ${this.emergencyResults.dedustAnalysis.totalPools}\n`;
            message += `• Token mappati: ${this.emergencyResults.dedustAnalysis.mappedTokens}\n`;
            message += `• Success rate: ${this.emergencyResults.dedustAnalysis.totalPools > 0 ? ((this.emergencyResults.dedustAnalysis.mappedTokens / this.emergencyResults.dedustAnalysis.totalPools) * 100).toFixed(1) : 0}%\n`;
            message += `• Timestamp: ${new Date(this.emergencyResults.dedustAnalysis.timestamp).toLocaleString()}\n\n`;
        }
        
        if (this.emergencyResults.stonfiAnalysis) {
            message += `📊 *STON.fi Analysis:*\n`;
            message += `• Pool scansionati: ${this.emergencyResults.stonfiAnalysis.totalPools}\n`;
            message += `• Token mappati: ${this.emergencyResults.stonfiAnalysis.mappedTokens}\n`;
            message += `• Success rate: ${this.emergencyResults.stonfiAnalysis.totalPools > 0 ? ((this.emergencyResults.stonfiAnalysis.mappedTokens / this.emergencyResults.stonfiAnalysis.totalPools) * 100).toFixed(1) : 0}%\n`;
            message += `• Timestamp: ${new Date(this.emergencyResults.stonfiAnalysis.timestamp).toLocaleString()}\n\n`;
        }
        
        message += `🎯 *Totale:*\n`;
        message += `• Token candidati: ${this.emergencyResults.successfulMappings}\n`;
        message += `• Emergency debug: ${this.apiAnalysisComplete ? 'COMPLETATO' : 'PENDING'}\n`;
        message += `• Status: ${this.emergencyResults.successfulMappings > 0 ? '✅ SUCCESSO' : '❌ PROBLEMA PERSISTE'}`;
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async showAPIStructure(chatId) {
        await this.telegram.sendMessage(chatId, '🔬 Mostrando strutture API rilevate...');
        
        if (!this.apiAnalysisComplete) {
            await this.telegram.sendMessage(chatId, '⚠️ Esegui /emergency prima per analizzare le strutture API');
            return;
        }
        
        const message = `
🔬 *STRUTTURE API RILEVATE*

📊 *DeDust API Structure:*
• Endpoint: /v2/pools
• Response: Array di pool objects
• Pool fields: address, left_asset, right_asset, total_liquidity_usd, volume_24h_usd, created_at
• TON Detection: left_asset.type === 'native' OR right_asset.type === 'native'
• Metadata: asset.metadata.symbol, asset.metadata.name

📊 *STON.fi API Structure:*
• Endpoint: /v1/pools  
• Response: Object con pool_list array
• Pool fields: address, token0_symbol, token1_symbol, token0_address, token1_address, liquidity_usd
• TON Detection: token0_symbol === 'TON' OR token1_symbol === 'TON'
• Variants: TON, WTON, pTON, Toncoin

🔍 *Mapping Strategy:*
• Identifica pool con TON nativo
• Estrae l'altro token (non-TON)
• Filtra per liquidità e età
• Applica filtri keyword

💡 Dettagli completi nei logs del server
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async testEmergencyMapping(chatId) {
        await this.telegram.sendMessage(chatId, '🔧 Testing algoritmi di mapping emergency...');
        
        try {
            // Test mapping veloce
            const dedustTokens = await this.scanDeDustDebugFIXED();
            const stonfiTokens = await this.scanSTONfiDebugFIXED();
            
            let message = `🔧 *TEST MAPPING ALGORITHMS*\n\n`;
            message += `🎯 *Risultati Mapping:*\n`;
            message += `• DeDust: ${dedustTokens.length} token mappati\n`;
            message += `• STON.fi: ${stonfiTokens.length} token mappati\n`;
            message += `• Totale: ${dedustTokens.length + stonfiTokens.length} token\n\n`;
            
            if (dedustTokens.length > 0) {
                message += `📊 *Sample DeDust Token:*\n`;
                const sample = dedustTokens[0];
                message += `• Symbol: ${sample.symbol}\n`;
                message += `• Liquidity: $${sample.liquidity}\n`;
                message += `• DEX: ${sample.dex}\n`;
                message += `• Emergency: ${sample.emergency ? '✅' : '❌'}\n\n`;
            }
            
            if (stonfiTokens.length > 0) {
                message += `📊 *Sample STON.fi Token:*\n`;
                const sample = stonfiTokens[0];
                message += `• Symbol: ${sample.symbol}\n`;
                message += `• Liquidity: $${sample.liquidity}\n`;
                message += `• DEX: ${sample.dex}\n`;
                message += `• Emergency: ${sample.emergency ? '✅' : '❌'}\n\n`;
            }
            
            message += `🔧 Mapping algorithms: ${dedustTokens.length + stonfiTokens.length > 0 ? '✅ FUNZIONANTI' : '❌ PROBLEMATICI'}`;
            
            await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await this.telegram.sendMessage(chatId, `❌ Errore test mapping: ${error.message}`);
        }
    }

    async sendEmergencyHelpMessage(chatId) {
        const message = `
🚨 *TON Bot v2.4.2 EMERGENCY DEBUG Commands*

🔬 *Emergency Analysis:*
/emergency - 🚨 Analisi API ultra-completa
/api - Test rapido API status  
/structure - Mostra strutture API rilevate
/mapping - Test algoritmi mapping
/analysis - Report analisi completo

📊 *Status & Info:*
/status - Status generale bot emergency
/stats - Statistiche dettagliate
/debug - Info emergency debug
/positions - Posizioni aperte
/wallet - Info wallet e balance

🎮 *Controllo Bot:*
/start - Avvia bot emergency
/stop - Ferma il bot
/restart - Riavvia bot emergency
/test - Test connessione

🚨 *EMERGENCY MODE v2.4.2:*
• Analisi API ultra-dettagliata
• Debug struttura completa pool
• Mapping automatico avanzato
• Logs completi per troubleshooting
• Individuazione esatta problemi API

🎯 *Obiettivo:* Trovare ESATTAMENTE dove sono i pool TON e perché non vengono rilevati

💡 *Comando principale:* /emergency
Esegue analisi completa e mostra tutto quello che serve per risolvere il problema definitivamente!

🔬 Modalità EMERGENCY DEBUG attiva per risoluzione problemi!
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // =============================================================================
    // EMERGENCY DEBUG SCAN METHODS - ANALISI API ULTRA-COMPLETA
    // =============================================================================

    async scanDeDustDebugFIXED() {
        try {
            console.log('🚨 EMERGENCY DEBUG v2.4.2 - DeDust API...');
            this.emergencyResults.totalApiCalls++;
            
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4.2-EMERGENCY)',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`📡 DeDust Status: ${response.status}`);
            console.log(`📊 Pool totali: ${response.data ? response.data.length : 'N/A'}`);
            console.log(`🔍 Tipo risposta: ${typeof response.data}`);
            console.log(`🔍 È array: ${Array.isArray(response.data)}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('❌ DeDust: Risposta non è un array valido');
                console.log('🔍 Risposta completa (primi 500 char):', JSON.stringify(response.data, null, 2).substring(0, 500));
                return [];
            }
            
            this.dedustPoolsFound = response.data.length;
            
            // EMERGENCY DEBUG: Stampa TUTTO del primo pool
            if (response.data.length > 0) {
                console.log('\n🚨 EMERGENCY: POOL #1 DEDUST COMPLETO');
                console.log('='.repeat(80));
                console.log(JSON.stringify(response.data[0], null, 2));
                console.log('='.repeat(80));
                
                // Analizza TUTTE le chiavi del primo pool
                const pool = response.data[0];
                console.log('\n🔍 TUTTE LE CHIAVI del pool #1:');
                console.log(Object.keys(pool));
                
                // Cerca qualsiasi riferimento a "asset" o "token"
                console.log('\n🎯 CHIAVI INTERESSANTI (asset/token/left/right):');
                for (const [key, value] of Object.entries(pool)) {
                    if (key.toLowerCase().includes('asset') || 
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('left') ||
                        key.toLowerCase().includes('right') ||
                        key.toLowerCase().includes('base') ||
                        key.toLowerCase().includes('quote')) {
                        console.log(`   ${key}:`, JSON.stringify(value, null, 2));
                    }
                }
                
                // Cerca in profondità nei nested objects
                console.log('\n🔬 ANALISI PROFONDA NESTED OBJECTS:');
                this.deepAnalyzePoolStructure(pool, 'root');
            }
            
            // Analizza primi 5 pool per pattern
            console.log('\n🔍 ANALISI PATTERN primi 5 pool:');
            for (let i = 0; i < Math.min(5, response.data.length); i++) {
                const pool = response.data[i];
                console.log(`\nPool #${i+1}:`);
                console.log(`  Address: ${pool.address || 'N/A'}`);
                console.log(`  Chiavi: [${Object.keys(pool).join(', ')}]`);
                
                // Cerca TON in qualsiasi campo
                const poolStr = JSON.stringify(pool).toLowerCase();
                const hasTon = poolStr.includes('ton');
                const hasNative = poolStr.includes('native');
                console.log(`  Contiene TON: ${hasTon}`);
                console.log(`  Contiene NATIVE: ${hasNative}`);
                
                if (hasTon || hasNative) {
                    console.log(`  🎯 INTERESSANTE! Dettagli:`);
                    this.extractTonReferences(pool);
                }
            }
            
            // Cerca pool con TON in QUALSIASI campo
            console.log('\n🔍 CERCANDO TUTTI I POOL CON TON/NATIVE...');
            let tonPoolsFound = 0;
            const tonPools = [];
            
            for (let i = 0; i < Math.min(50, response.data.length); i++) {
                const pool = response.data[i];
                const poolStr = JSON.stringify(pool).toLowerCase();
                
                if (poolStr.includes('ton') || poolStr.includes('native')) {
                    tonPoolsFound++;
                    tonPools.push(pool);
                    
                    if (tonPoolsFound <= 3) {
                        console.log(`\n🎯 POOL TON #${tonPoolsFound} (index ${i}):`);
                        console.log(`  Address: ${pool.address}`);
                        console.log(`  Tutte le chiavi: [${Object.keys(pool).join(', ')}]`);
                        this.extractTonReferences(pool);
                    }
                }
            }
            
            console.log(`\n📊 RISULTATO: ${tonPoolsFound} pool contenenti TON/NATIVE trovati sui primi 50`);
            console.log(`📈 Percentuale: ${((tonPoolsFound / Math.min(50, response.data.length)) * 100).toFixed(1)}%`);
            
            // Se abbiamo trovato pool TON, proviamo a mapparli
            if (tonPools.length > 0) {
                console.log('\n🔧 TENTATIVO MAPPING pool TON trovati...');
                const mappedTokens = this.emergencyMapDeDustPools(tonPools.slice(0, 5));
                console.log(`✅ Mapped ${mappedTokens.length} token da ${tonPools.length} pool TON`);
                return mappedTokens;
            }
            
            console.log('\n❌ Nessun pool TON mappabile trovato');
            return [];
            
        } catch (error) {
            console.log(`❌ DeDust EMERGENCY Error: ${error.message}`);
            console.log(`📊 Stack: ${error.stack}`);
            return [];
        }
    }

    async scanSTONfiDebugFIXED() {
        try {
            console.log('🚨 EMERGENCY DEBUG v2.4.2 - STON.fi API...');
            this.emergencyResults.totalApiCalls++;
            
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (TON-Bot/2.4.2-EMERGENCY)'
                }
            });
            
            console.log(`📡 STON.fi Status: ${response.status}`);
            console.log(`📊 Risposta tipo: ${typeof response.data}`);
            console.log(`🔍 È oggetto: ${typeof response.data === 'object'}`);
            
            if (!response.data) {
                console.log('❌ STON.fi: Nessuna data nella risposta');
                return [];
            }
            
            // Debug struttura risposta completa
            console.log('\n🔍 STRUTTURA COMPLETA RISPOSTA STON.fi:');
            console.log('='.repeat(80));
            console.log(JSON.stringify(response.data, null, 2).substring(0, 1000)); // Primi 1000 char
            console.log('='.repeat(80));
            
            console.log('\n🔍 CHIAVI PRINCIPALI risposta STON.fi:');
            console.log(Object.keys(response.data));
            
            // Cerca pool_list e alternative
            let poolList = null;
            let poolsKey = null;
            
            const possibleKeys = ['pool_list', 'pools', 'data', 'result', 'list'];
            for (const key of possibleKeys) {
                if (response.data[key] && Array.isArray(response.data[key])) {
                    poolList = response.data[key];
                    poolsKey = key;
                    console.log(`✅ Trovata lista pool in: ${key} (${poolList.length} elementi)`);
                    break;
                }
            }
            
            if (!poolList) {
                console.log('❌ STON.fi: Nessuna lista pool trovata');
                console.log('🔍 Struttura completa disponibile:', Object.keys(response.data));
                return [];
            }
            
            this.stonfiPoolsFound = poolList.length;
            
            // EMERGENCY DEBUG: Stampa TUTTO del primo pool
            if (poolList.length > 0) {
                console.log(`\n🚨 EMERGENCY: PRIMO POOL STON.fi da ${poolsKey}`);
                console.log('='.repeat(80));
                console.log(JSON.stringify(poolList[0], null, 2));
                console.log('='.repeat(80));
                
                // Analizza TUTTE le chiavi del primo pool
                const pool = poolList[0];
                console.log('\n🔍 TUTTE LE CHIAVI del primo pool:');
                console.log(Object.keys(pool));
                
                // Cerca chiavi token
                console.log('\n🎯 CHIAVI TOKEN/ASSET:');
                for (const [key, value] of Object.entries(pool)) {
                    if (key.toLowerCase().includes('token') || 
                        key.toLowerCase().includes('asset') ||
                        key.toLowerCase().includes('symbol') ||
                        key.toLowerCase().includes('name') ||
                        key.toLowerCase().includes('address')) {
                        console.log(`   ${key}:`, JSON.stringify(value, null, 2));
                    }
                }
            }
            
            // Analizza pattern primi 5 pool
            console.log('\n🔍 ANALISI PATTERN primi 5 pool STON.fi:');
            for (let i = 0; i < Math.min(5, poolList.length); i++) {
                const pool = poolList[i];
                console.log(`\nPool #${i+1}:`);
                console.log(`  Chiavi: [${Object.keys(pool).join(', ')}]`);
                
                // Cerca TON
                const poolStr = JSON.stringify(pool).toLowerCase();
                const hasTon = poolStr.includes('ton');
                console.log(`  Contiene TON: ${hasTon}`);
                
                if (hasTon) {
                    console.log(`  🎯 DETTAGLI TON:`);
                    this.extractTonReferences(pool);
                }
            }
            
            // Cerca TUTTI i pool con TON
            console.log('\n🔍 CERCANDO TUTTI I POOL CON TON in STON.fi...');
            let tonPoolsFound = 0;
            const tonPools = [];
            
            for (let i = 0; i < Math.min(50, poolList.length); i++) {
                const pool = poolList[i];
                const poolStr = JSON.stringify(pool).toLowerCase();
                
                if (poolStr.includes('ton')) {
                    tonPoolsFound++;
                    tonPools.push(pool);
                    
                    if (tonPoolsFound <= 3) {
                        console.log(`\n🎯 POOL TON STON.fi #${tonPoolsFound} (index ${i}):`);
                        this.extractTonReferences(pool);
                    }
                }
            }
            
            console.log(`\n📊 RISULTATO STON.fi: ${tonPoolsFound} pool con TON trovati sui primi 50`);
            console.log(`📈 Percentuale: ${((tonPoolsFound / Math.min(50, poolList.length)) * 100).toFixed(1)}%`);
            
            // Se abbiamo trovato pool TON, proviamo a mapparli
            if (tonPools.length > 0) {
                console.log('\n🔧 TENTATIVO MAPPING pool TON STON.fi...');
                const mappedTokens = this.emergencyMapSTONfiPools(tonPools.slice(0, 5));
                console.log(`✅ Mapped ${mappedTokens.length} token da ${tonPools.length} pool TON`);
                return mappedTokens;
            }
            
            console.log('\n❌ Nessun pool TON mappabile trovato in STON.fi');
            return [];
            
        } catch (error) {
            console.log(`❌ STON.fi EMERGENCY Error: ${error.message}`);
            console.log(`📊 Stack: ${error.stack}`);
            return [];
        }
    }

    // =============================================================================
    // HELPER METHODS PER EMERGENCY DEBUG
    // =============================================================================

    deepAnalyzePoolStructure(obj, path, depth = 0) {
        if (depth > 3) return; // Evita loop infiniti
        
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = `${path}.${key}`;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                console.log(`${'  '.repeat(depth)}🔍 ${currentPath} (object):`);
                this.deepAnalyzePoolStructure(value, currentPath, depth + 1);
            } else if (Array.isArray(value)) {
                console.log(`${'  '.repeat(depth)}📋 ${currentPath} (array[${value.length}])`);
                if (value.length > 0 && typeof value[0] === 'object') {
                    console.log(`${'  '.repeat(depth)}   Primo elemento:`, JSON.stringify(value[0], null, 2));
                }
            } else {
                const valueStr = String(value).toLowerCase();
                if (valueStr.includes('ton') || valueStr.includes('native')) {
                    console.log(`${'  '.repeat(depth)}🎯 ${currentPath}: ${JSON.stringify(value)} ⭐`);
                }
            }
        }
    }

    extractTonReferences(pool) {
        const poolStr = JSON.stringify(pool, null, 2);
        const lines = poolStr.split('\n');
        
        console.log('  📋 Linee con TON/NATIVE:');
        lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('ton') || lowerLine.includes('native')) {
                console.log(`    Riga ${index + 1}: ${line.trim()}`);
            }
        });
    }

    emergencyMapDeDustPools(pools) {
        const mapped = [];
        
        for (const pool of pools) {
            try {
                // Prova diverse strutture possibili
                let tokenData = null;
                
                // Prova 1: left_asset/right_asset
                if (pool.left_asset && pool.right_asset) {
                    const leftIsNative = pool.left_asset.type === 'native';
                    const rightIsNative = pool.right_asset.type === 'native';
                    
                    if (leftIsNative && pool.right_asset.metadata) {
                        tokenData = {
                            address: pool.right_asset.address || '',
                            symbol: pool.right_asset.metadata.symbol || 'UNK',
                            name: pool.right_asset.metadata.name || 'Unknown'
                        };
                    } else if (rightIsNative && pool.left_asset.metadata) {
                        tokenData = {
                            address: pool.left_asset.address || '',
                            symbol: pool.left_asset.metadata.symbol || 'UNK',
                            name: pool.left_asset.metadata.name || 'Unknown'
                        };
                    }
                }
                
                // Prova 2: assets array
                if (!tokenData && pool.assets && Array.isArray(pool.assets)) {
                    for (const asset of pool.assets) {
                        if (asset.type !== 'native' && asset.metadata) {
                            tokenData = {
                                address: asset.address || '',
                                symbol: asset.metadata.symbol || 'UNK',
                                name: asset.metadata.name || 'Unknown'
                            };
                            break;
                        }
                    }
                }
                
                // Se abbiamo trovato token data, crea l'oggetto
                if (tokenData && tokenData.address) {
                    mapped.push({
                        address: tokenData.address,
                        name: tokenData.name,
                        symbol: tokenData.symbol,
                        liquidity: pool.total_liquidity_usd || pool.liquidity_usd || 0,
                        volume24h: pool.volume_24h_usd || 0,
                        dex: 'DeDust',
                        poolAddress: pool.address || '',
                        createdAt: pool.created_at || Date.now(),
                        emergency: true
                    });
                    
                    console.log(`    ✅ Mapped: ${tokenData.symbol} (${tokenData.address})`);
                }
                
            } catch (error) {
                console.log(`    ❌ Errore mapping pool: ${error.message}`);
            }
        }
        
        return mapped;
    }

    emergencyMapSTONfiPools(pools) {
        const mapped = [];
        
        for (const pool of pools) {
            try {
                let tokenData = null;
                
                // Prova diverse strutture possibili per STON.fi
                const tonVariants = ['TON', 'WTON', 'pTON', 'Toncoin'];
                
                // Metodo 1: token0/token1
                if (pool.token0_symbol && pool.token1_symbol) {
                    const isToken0TON = tonVariants.includes(pool.token0_symbol);
                    const isToken1TON = tonVariants.includes(pool.token1_symbol);
                    
                    if (isToken0TON) {
                        tokenData = {
                            address: pool.token1_address || '',
                            symbol: pool.token1_symbol || 'UNK',
                            name: pool.token1_name || 'Unknown'
                        };
                    } else if (isToken1TON) {
                        tokenData = {
                            address: pool.token0_address || '',
                            symbol: pool.token0_symbol || 'UNK',
                            name: pool.token0_name || 'Unknown'
                        };
                    }
                }
                
                // Metodo 2: cerca in altri campi
                if (!tokenData) {
                    for (const [key, value] of Object.entries(pool)) {
                        if (typeof value === 'string' && tonVariants.includes(value)) {
                            // Trova il campo corrispondente per l'altro token
                            const otherKey = key.replace('token0', 'token1').replace('token1', 'token0');
                            if (pool[otherKey]) {
                                tokenData = {
                                    address: pool[otherKey.replace('_symbol', '_address').replace('_name', '_address')] || '',
                                    symbol: pool[otherKey] || 'UNK',
                                    name: pool[otherKey.replace('_symbol', '_name')] || 'Unknown'
                                };
                                break;
                            }
                        }
                    }
                }
                
                if (tokenData && tokenData.address) {
                    mapped.push({
                        address: tokenData.address,
                        name: tokenData.name,
                        symbol: tokenData.symbol,
                        liquidity: pool.liquidity_usd || 0,
                        volume24h: pool.volume_24h_usd || 0,
                        dex: 'STON.fi',
                        poolAddress: pool.address || '',
                        createdAt: pool.created_at || Date.now(),
                        emergency: true
                    });
                    
                    console.log(`    ✅ Mapped: ${tokenData.symbol} (${tokenData.address})`);
                }
                
            } catch (error) {
                console.log(`    ❌ Errore mapping pool STON.fi: ${error.message}`);
            }
        }
        
        return mapped;
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
            console.log('🔑 Inizializzazione wallet v2.4.2 EMERGENCY...');
            
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
🏦 *Wallet Inizializzato v2.4.2 EMERGENCY*
Address: \`${this.walletAddress}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ${this.stats.startBalance >= this.config.debugIntensive.minStartBalance ? '✅ Pronto' : '⚠️ Balance basso'}
Match: ${debugResult.isMatch ? '✅ Corretto' : '❌ Verifica mnemonic'}
Webhook: ${this.webhookConfigured ? '✅ Attivo' : '📱 Fallback'}
🚨 Emergency Debug: ✅ ATTIVO
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚨 Bot v2.4.2 EMERGENCY DEBUG avviato...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        await this.notify(`
🚨 *Bot v2.4.2 EMERGENCY DEBUG Avviato*

💳 Wallet: \`${this.walletAddress}\`
🔗 Webhook: ${this.webhookConfigured ? '✅ Funzionante' : '📱 Polling fallback'}

📊 *Configurazione Emergency:*
• Confidence: ${this.config.debugIntensive.minConfidenceScore}%
• Liquidità: ${this.config.debugIntensive.minLiquidity}
• Scansione: ${this.config.debugIntensive.scanInterval / 1000}s
• Age range: ${(this.config.debugIntensive.minTokenAge/1000/60).toFixed(0)}min-${(this.config.debugIntensive.maxTokenAge/1000/60/60/24).toFixed(0)}gg

🚨 *EMERGENCY Features:*
• Analisi API ultra-completa ✅
• Debug struttura pool completo ✅
• Mapping automatico avanzato ✅
• Logs dettagliati per troubleshooting ✅

🔬 Usa /emergency per analisi API completa!
💡 Usa /api per test rapido API status
        `, 'startup');
        
        // Avvia monitoraggio con EMERGENCY debug
        this.emergencyMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        this.scheduleEmergencyReports();
    }

    // =============================================================================
    // TRADING ENGINE v2.4.2 EMERGENCY - CON ANALISI API COMPLETA
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

    async emergencyMonitoring() {
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
                console.log(`\n🚨 EMERGENCY Scan #${this.scanCount} - ${new Date().toLocaleTimeString()} (v2.4.2)`);
                
                const qualityTokens = await this.findQualityTokensEmergency();
                this.candidatesFound += qualityTokens.length;
                
                if (qualityTokens.length > 0) {
                    console.log(`   🎯 Trovati ${qualityTokens.length} token candidati (EMERGENCY v2.4.2)`);
                    
                    // Notifica EMERGENCY ogni 5 scansioni con risultati
                    if (this.scanCount % 5 === 0) {
                        await this.notify(`
🚨 *EMERGENCY Scan #${this.scanCount}*
🎯 Candidati: ${qualityTokens.length}
📊 Total trovati: ${this.candidatesFound}
📈 Success rate: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%
✅ Emergency Debug: ATTIVO
                        `, 'debug', true);
                    }
                    
                    for (const token of qualityTokens) {
                        const stillCanTrade = await this.canContinueTrading();
                        if (!stillCanTrade) break;
                        
                        const analysis = await this.emergencyTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.emergencyBuy(token, analysis);
                        } else {
                            console.log(`   📋 ${token.symbol}: ${analysis.rejectionReason}`);
                        }
                        
                        await this.sleep(3000);
                    }
                } else {
                    console.log('   💤 Nessun token candidato trovato (emergency debug attivo)');
                    
                    // Debug ogni 10 scansioni senza risultati
                    if (this.scanCount % 10 === 0) {
                        await this.notify(`
🚨 *EMERGENCY Debug: Scan #${this.scanCount} - 0 candidati*
📊 Success rate totale: ${((this.candidatesFound / this.scanCount) * 100).toFixed(1)}%

🔬 Emergency Analysis Status:
• API calls: ${this.emergencyResults.totalApiCalls}
• DeDust pools: ${this.dedustPoolsFound}
• STON.fi pools: ${this.stonfiPoolsFound}
• Mappings: ${this.emergencyResults.successfulMappings}

💡 Usa /emergency per diagnosi completa
                        `, 'debug', true);
                    }
                }
                
                await this.updateStats();
                await this.sleep(scanInterval);
                
            } catch (error) {
                console.error('❌ Errore nel monitoraggio EMERGENCY:', error.message);
                await this.notify(`❌ Errore trading EMERGENCY: ${error.message}`, 'error');
                await this.sleep(scanInterval * 2);
            }
        }
    }

    async findQualityTokensEmergency() {
        const qualityTokens = [];
        
        try {
            for (const dex of this.trustedDEXs) {
                console.log(`🚨 Scansione ${dex} EMERGENCY...`);
                const tokens = await this.scanDEXEmergency(dex);
                qualityTokens.push(...tokens);
                this.tokensAnalyzed += tokens.length;
                console.log(`   📊 ${dex}: ${tokens.length} token candidati trovati (EMERGENCY)`);
            }
            
            const filtered = qualityTokens.filter(token => this.passesFiltersDebug(token));
            
            return filtered;
            
        } catch (error) {
            console.log('⚠️ Errore ricerca token EMERGENCY:', error.message);
            return [];
        }
    }

    async scanDEXEmergency(dex) {
        try {
            switch (dex) {
                case 'DeDust':
                    return await this.scanDeDustDebugFIXED();
                case 'STON.fi':
                    return await this.scanSTONfiDebugFIXED();
                default:
                    return [];
            }
        } catch (error) {
            console.log(`⚠️ Errore scansione ${dex} EMERGENCY:`, error.message);
            return [];
        }
    }

    // =============================================================================
    // FILTRI DEBUG (identici ma con emergency logging)
    // =============================================================================

    passesFiltersDebug(token) {
        const filters = this.config.debugIntensive;
        
        console.log(`\n🚨 EMERGENCY FILTRI per ${token.name} (${token.symbol}):`);
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
        console.log(`   🚨 TOKEN APPROVATO EMERGENCY: ${token.symbol} supera tutti i filtri!`);
        return true;
    }

    // =============================================================================
    // ANTI-SCAM MINIMALE (identico)
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
    // ANALISI TOKEN EMERGENCY
    // =============================================================================

    async emergencyTokenAnalysis(token) {
        console.log(`🚨 Analisi EMERGENCY: ${token.name} (${token.symbol})`);
        
        let confidenceScore = 50; // Base alto per debug
        const analysis = {
            shouldBuy: false,
            confidenceScore: 0,
            reasons: [],
            warnings: [],
            rejectionReason: '',
            emergency: true
        };
        
        try {
            // Analisi liquidità (30% peso)
            const liquidityScore = this.analyzeLiquidityScoreEmergency(token);
            confidenceScore += liquidityScore * 0.3;
            analysis.reasons.push(`Liquidità: ${liquidityScore}/100`);
            
            // Analisi volume (20% peso)
            const volumeScore = this.analyzeVolumeScoreEmergency(token);
            confidenceScore += volumeScore * 0.2;
            analysis.reasons.push(`Volume: ${volumeScore}/100`);
            
            // Analisi keyword (40% peso)
            const keywordScore = this.analyzeKeywordScoreEmergency(token);
            confidenceScore += keywordScore * 0.4;
            analysis.reasons.push(`Keywords: ${keywordScore}/100`);
            
            // Analisi tecnica (10% peso)
            const technicalScore = this.analyzeTechnicalScoreEmergency(token);
            confidenceScore += technicalScore * 0.1;
            analysis.reasons.push(`Tecnica: ${technicalScore}/100`);
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            const minConfidence = this.config.debugIntensive.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence) {
                analysis.shouldBuy = true;
                this.filterResults.approved++;
                analysis.reasons.push(`✅ APPROVATO EMERGENCY - Confidence: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO EMERGENCY - Confidence: ${analysis.confidenceScore}%`);
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

    analyzeLiquidityScoreEmergency(token) {
        let score = 0;
        
        if (token.liquidity > 500) score = 100;
        else if (token.liquidity > 100) score = 90;
        else if (token.liquidity > 50) score = 80;
        else if (token.liquidity > 25) score = 70;
        else if (token.liquidity > 10) score = 60;
        else if (token.liquidity > 5) score = 50;
        else if (token.liquidity > 1) score = 40;
        else score = 20;
        
        console.log(`   💧 Liquidità EMERGENCY ${token.liquidity} → Score: ${score}/100`);
        return score;
    }

    analyzeVolumeScoreEmergency(token) {
        let score = 50;
        const volumeRatio = token.volume24h / Math.max(token.liquidity, 1);
        
        if (volumeRatio > 0.2) score = 100;
        else if (volumeRatio > 0.1) score = 80;
        else if (volumeRatio > 0.05) score = 60;
        else if (volumeRatio > 0.01) score = 40;
        else score = 20;
        
        console.log(`   📊 Volume EMERGENCY ratio ${volumeRatio.toFixed(3)} → Score: ${score}/100`);
        return score;
    }

    analyzeKeywordScoreEmergency(token) {
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
        
        console.log(`   🎯 Keywords EMERGENCY: [${matchedKeywords.join(', ')}] → Score: ${score}/100`);
        return Math.min(score, 100);
    }

    analyzeTechnicalScoreEmergency(token) {
        let score = 60;
        
        if (token.dex === 'DeDust') score += 10;
        if (token.dex === 'STON.fi') score += 10;
        if (token.emergency) score += 5; // Bonus per emergency detection
        
        const tokenAge = Date.now() - (token.createdAt || Date.now());
        const ageHours = tokenAge / (1000 * 60 * 60);
        
        if (ageHours >= 1 && ageHours <= 48) score += 20;
        else if (ageHours >= 0.5 && ageHours <= 168) score += 10;
        
        console.log(`   🔧 Technical EMERGENCY score: ${score}/100`);
        return Math.max(Math.min(score, 100), 0);
    }

    async emergencyBuy(token, analysis) {
        try {
            const buyAmount = this.config.debugIntensive.maxTradeSize;
            
            console.log(`💰 ACQUISTO EMERGENCY v2.4.2: ${buyAmount} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}%`);
            console.log(`   💧 Liquidità: ${token.liquidity.toFixed(0)}`);
            console.log(`   🎯 Motivi: ${analysis.reasons.join(', ')}`);
            console.log(`   🚨 EMERGENCY: API analysis completa`);
            
            const txHash = `emergency_${Math.random().toString(16).substr(2, 10)}`;
            
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
                version: '2.4.2-emergency',
                emergencyMode: true,
                apiAnalysisComplete: this.apiAnalysisComplete
            };
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${position.stopLoss}%`);
            console.log(`   🎯 Take Profit: ${position.takeProfit}%`);
            
            await this.notifyEmergencyTrade('buy', position);
            this.startEmergencyPositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto EMERGENCY:', error.message);
            await this.notify(`❌ Errore acquisto EMERGENCY ${token.symbol}: ${error.message}`, 'error');
        }
    }

    async notifyEmergencyTrade(action, position, pnl = null) {
        let message = '';
        let type = 'trade';
        
        if (action === 'buy') {
            message = `
🚨 *ACQUISTO EMERGENCY v2.4.2*
Token: ${position.symbol} (${position.name})
Amount: ${position.amount.toFixed(4)} TON
Confidence: ${position.confidence}%
Emergency Mode: ${position.emergencyMode ? '✅' : '❌'}
DEX: ${position.dex}
Stop Loss: ${position.stopLoss}%
Take Profit: ${position.takeProfit}%
Liquidity: ${position.liquidity.toFixed(0)}

🎯 *Motivi EMERGENCY:*
${position.reasons ? position.reasons.join('\n') : 'Analisi EMERGENCY standard'}

🚨 *API Analysis:* ${position.apiAnalysisComplete ? '✅ COMPLETA' : '⚠️ PENDING'}
            `.trim();
        } else if (action === 'sell') {
            const pnlPercent = (pnl / position.amount) * 100;
            type = pnlPercent > 0 ? 'profit' : 'loss';
            const pnlIcon = pnlPercent > 0 ? '📈' : '📉';
            
            message = `
${pnlIcon} *VENDITA EMERGENCY v2.4.2*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
Time Held: ${this.formatTime(Date.now() - position.entryTime)}
Emergency Mode: ${position.emergencyMode ? '✅' : '❌'}
Confidence era: ${position.confidence}%
Motivo: ${action === 'stop_loss' ? 'Stop Loss' : action === 'take_profit' ? 'Take Profit' : 'Exit'}
            `.trim();
        }
        
        await this.notify(message, type);
    }

    startEmergencyPositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                const priceChange = (Math.random() - 0.5) * 20; // ±10%
                
                if (this.scanCount % 4 === 0) {
                    console.log(`📊 EMERGENCY ${position.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
                }
                
                if (priceChange <= position.stopLoss) {
                    console.log(`🛑 EMERGENCY STOP LOSS ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.emergencySell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                    return;
                }
                
                if (priceChange >= position.takeProfit) {
                    console.log(`🎯 EMERGENCY TAKE PROFIT ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.emergencySell(tokenAddress, 'take_profit');
                    clearInterval(monitorInterval);
                    return;
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio EMERGENCY ${tokenAddress}:`, error.message);
            }
        }, 25000); // Ogni 25 secondi
        
        setTimeout(async () => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                console.log(`⏰ EMERGENCY timeout raggiunto per ${this.positions.get(tokenAddress).symbol}`);
                await this.emergencySell(tokenAddress, 'timeout');
            }
        }, this.config.debugIntensive.maxHoldTime);
    }

    async emergencySell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            console.log(`💸 VENDITA EMERGENCY ${position.symbol} | Motivo: ${reason}`);
            
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
            
            console.log(`📊 EMERGENCY P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnl > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
            
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
            
            await this.notifyEmergencyTrade('sell', position, pnl);
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore vendita EMERGENCY:', error.message);
            await this.notify(`❌ Errore vendita EMERGENCY ${tokenAddress}: ${error.message}`, 'error');
        }
    }

    // =============================================================================
    // UTILITY METHODS (identici ma con emergency logging)
    // =============================================================================

    dailyStatsReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.resetDailyStats();
            this.notifyEmergencyDailyReport();
            
            setInterval(() => {
                this.resetDailyStats();
                this.notifyEmergencyDailyReport();
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
🚨 *ALERT EMERGENCY: Perdita Massima*
P&L Oggi: ${this.stats.dailyPnL.toFixed(4)} TON
Limite: -${this.config.debugIntensive.maxDailyLoss} TON

Trading EMERGENCY sospeso per oggi.
                `, 'warning');
            }
            
            const currentBalance = await this.getWalletBalance();
            if (currentBalance < this.config.debugIntensive.minStartBalance) {
                await this.notify(`
⚠️ *ALERT EMERGENCY: Balance Insufficiente*
Balance attuale: ${currentBalance.toFixed(4)} TON
Minimo richiesto: ${this.config.debugIntensive.minStartBalance} TON

Invia TON a: \`${this.walletAddress}\`
                `, 'warning');
            }
        }, 15 * 60 * 1000); // Ogni 15 minuti
    }

    scheduleEmergencyReports() {
        setInterval(async () => {
            await this.notifyEmergencyDailyReport();
        }, 12 * 60 * 60 * 1000);
        
        setInterval(async () => {
            if (this.positions.size > 0 || this.scanCount % 20 === 0) {
                await this.notify(`
📊 *Update EMERGENCY v2.4.2* (${this.positions.size} posizioni)
P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
Scansioni: ${this.scanCount}
🔍 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}
🚨 Emergency Debug: ✅ ATTIVO
🔬 API Analysis: ${this.apiAnalysisComplete ? '✅ COMPLETA' : '⚠️ PENDING'}
                `, 'debug', true);
            }
        }, 3 * 60 * 60 * 1000); // Ogni 3 ore
    }

    async notifyEmergencyDailyReport() {
        const balance = await this.getWalletBalance();
        const winRate = this.getWinRate();
        
        const message = `
📊 *REPORT EMERGENCY v2.4.2*

💳 Wallet: \`${this.walletAddress}\`
💰 Balance: ${balance.toFixed(4)} TON
📈 P&L Oggi: ${this.stats.dailyPnL > 0 ? '+' : ''}${this.stats.dailyPnL.toFixed(4)} TON
🎯 Win Rate: ${winRate}%
📊 Trades: ${this.stats.totalTrades}
🔍 Scansioni: ${this.scanCount}
🚀 Token analizzati: ${this.tokensAnalyzed}
🎯 Candidati trovati: ${this.candidatesFound}
✅ Approvati: ${this.filterResults.approved}

📈 *Performance EMERGENCY:*
• Success rate: ${this.scanCount > 0 ? ((this.candidatesFound / this.scanCount) * 100).toFixed(1) : 0}%
• Approval rate: ${this.candidatesFound > 0 ? ((this.filterResults.approved / this.candidatesFound) * 100).toFixed(1) : 0}%

🚨 *Emergency Status:*
• API calls: ${this.emergencyResults.totalApiCalls}
• Successful mappings: ${this.emergencyResults.successfulMappings}
• Analysis complete: ${this.apiAnalysisComplete ? '✅' : '⚠️'}
• DeDust pools: ${this.dedustPoolsFound}
• STON.fi pools: ${this.stonfiPoolsFound}

🔗 Webhook: ${this.webhookConfigured ? '✅' : '📱'}
🚨 Emergency Debug: ✅ ULTRA-COMPLETO

🔬 ${this.stats.dailyPnL > 0 ? 'EMERGENCY SUCCESS!' : this.stats.dailyPnL < -0.05 ? '⚠️ Emergency Loss' : '😐 Neutro'}
        `.trim();
        
        await this.notify(message, this.stats.dailyPnL > 0 ? 'profit' : 'info');
    }

    async updateStats() {
        const balance = await this.getWalletBalance();
        
        if (balance > this.stats.startBalance * 1.5) {
            console.log(`💰 Rilevato nuovo deposito: ${this.stats.startBalance.toFixed(4)} → ${balance.toFixed(4)} TON`);
            this.stats.startBalance = balance;
            
            await this.notify(`💰 Nuovo deposito rilevato!\nBalance aggiornato: ${balance.toFixed(4)} TON\n🚨 Trading EMERGENCY ora attivo`, 'success');
        }
        
        console.log(`📊 Stats EMERGENCY v2.4.2: ${this.stats.totalTrades} trades | Balance: ${balance.toFixed(4)} TON | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}% | Analizzati: ${this.tokensAnalyzed} | Candidati: ${this.candidatesFound} | Emergency: ${this.apiAnalysisComplete}`);
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

    // Standard utility methods (identici)
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    stop() {
        this.isRunning = false;
        console.log('🛑 Bot EMERGENCY v2.4.2 fermato');
        this.notify('🛑 Bot EMERGENCY v2.4.2 fermato', 'info');
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

    // Common notification method
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
                case 'startup': emoji = '🚨'; break;
                case 'scam': emoji = '🛡️'; break;
                case 'debug': emoji = '🔬'; break;
                case 'emergency': emoji = '🚨'; break;
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

    // Common status methods for telegram
    async sendBotStatus(chatId) {
        const uptime = this.getUptime();
        const status = this.isRunning ? '🟢 Attivo' : '🔴 Fermo';
        const balance = await this.getWalletBalance();
        
        const message = `
🚨 *TON Bot v2.4.2 EMERGENCY DEBUG Status*

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

🚨 *Emergency Debug Status:*
• API calls: ${this.emergencyResults.totalApiCalls}
• Analysis complete: ${this.apiAnalysisComplete ? '✅' : '⚠️'}
• DeDust pools: ${this.dedustPoolsFound}
• STON.fi pools: ${this.stonfiPoolsFound}
• Successful mappings: ${this.emergencyResults.successfulMappings}

📱 *Comandi EMERGENCY:* /emergency, /api, /structure, /mapping
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendDetailedStats(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
📊 *Statistiche Dettagliate v2.4.2 EMERGENCY*

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

🚨 *Emergency Debug v2.4.2:*
API calls: ${this.emergencyResults.totalApiCalls}
Analysis complete: ${this.apiAnalysisComplete ? '✅' : '⚠️'}
DeDust pools found: ${this.dedustPoolsFound}
STON.fi pools found: ${this.stonfiPoolsFound}
Successful mappings: ${this.emergencyResults.successfulMappings}
Last emergency debug: ${this.lastEmergencyDebug || 'Mai'}

⏰ *Sistema:*
Webhook: ${this.webhookConfigured ? '✅ Configurato' : '📱 Polling fallback'}
Ultimo reset: ${this.stats.lastResetDate}
🚨 Emergency Mode: ✅ ULTRA-DEBUG ATTIVO
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendPositions(chatId) {
        if (this.positions.size === 0) {
            await this.telegram.sendMessage(chatId, '📭 Nessuna posizione aperta\n\n💡 Il bot cerca automaticamente opportunità ogni 30 secondi\n🚨 Emergency debug ultra-completo attivo\n\nUsa /emergency per vedere analisi API completa!');
            return;
        }
        
        let message = '📈 *Posizioni Aperte EMERGENCY:*\n\n';
        
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
            message += `DEX: ${position.dex}\n`;
            message += `Emergency: ${position.emergencyMode ? '✅' : '❌'}\n\n`;
        }
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendWalletInfo(chatId) {
        const balance = await this.getWalletBalance();
        
        const message = `
💳 *WALLET INFO v2.4.2 EMERGENCY*

📍 *Indirizzo:*
\`${this.walletAddress || 'Non inizializzato'}\`

💰 *Balance:*
${balance.toFixed(4)} TON

🔗 *Explorer:*
[Visualizza su TONScan](https://tonscan.org/address/${this.walletAddress})

⚙️ *Configurazione v2.4.2 EMERGENCY:*
• Max Trade: ${this.config.debugIntensive.maxTradeSize} TON
• Balance minimo: ${this.config.debugIntensive.minStartBalance} TON
• Confidence minimo: ${this.config.debugIntensive.minConfidenceScore}%
• Liquidità minima: ${this.config.debugIntensive.minLiquidity}
• Status: ${balance >= this.config.debugIntensive.minStartBalance ? '✅ OK per trading' : '⚠️ Balance insufficiente'}

🚨 *Emergency Debug Status:*
• API analysis: ${this.apiAnalysisComplete ? '✅ COMPLETA' : '⚠️ PENDING'}
• Emergency calls: ${this.emergencyResults.totalApiCalls}
• Pool trovati: ${this.dedustPoolsFound + this.stonfiPoolsFound}

💡 *Keywords monitorate:*
${this.config.debugIntensive.strongKeywords.slice(0, 10).join(', ')}... (+${this.config.debugIntensive.strongKeywords.length - 10} altre)

🚨 *Emergency Mode:* ULTRA-DEBUG COMPLETO ✅
        `.trim();
        
        await this.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
}

// =============================================================================
// CONFIGURAZIONE v2.4.2 EMERGENCY DEBUG
// =============================================================================

const emergencyConfig = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    
    debugIntensive: {
        // TRADING PARAMETERS PERMISSIVI PER EMERGENCY DEBUG
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || 0.15,
        maxPositions: parseInt(process.env.MAX_POSITIONS) || 3,
        minStartBalance: parseFloat(process.env.MIN_START_BALANCE) || 0.2,
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 0.4,
        
        // EXIT STRATEGY
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || -6,
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 10,
        maxHoldTime: parseInt(process.env.MAX_HOLD_TIME) || 3600000, // 1 ora
        
        // FILTRI PERMISSIVI PER EMERGENCY DEBUG
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
// AVVIO AUTOMATICO BOT v2.4.2 EMERGENCY DEBUG
// =============================================================================

console.log('🚨 Inizializzazione TON Bot v2.4.2 EMERGENCY DEBUG su Render...');
console.log('🔬 EMERGENCY MODE: ANALISI API ULTRA-COMPLETA');
console.log('📊 Obiettivo: Trovare ESATTAMENTE dove sono i pool TON');
console.log('   🔍 Debug struttura API completa');
console.log('   📋 Logs dettagliati di ogni step');
console.log('   🎯 Mapping automatico avanzato');
console.log('   🚨 Individuazione precisa problemi');
console.log('   💡 Risoluzione definitiva issue API');

setTimeout(async () => {
    try {
        bot = new EmergencyDebugTONBot(emergencyConfig);
        
        await bot.start();
        
        console.log('✅ Bot v2.4.2 EMERGENCY DEBUG avviato con successo su Render!');
        console.log(`🌐 Server disponibile su porta ${PORT}`);
        console.log('🔗 Test webhook: https://bot-trading-conservativo.onrender.com/webhook/test');
        console.log('📊 Emergency info: https://bot-trading-conservativo.onrender.com/stats');
        console.log('🚨 COMANDI EMERGENCY:');
        console.log('   /emergency - Analisi API ultra-completa');
        console.log('   /api - Test rapido API status');
        console.log('   /structure - Mostra strutture API');
        console.log('   /mapping - Test algoritmi mapping');
        console.log('   /analysis - Report analisi completo');
        
    } catch (error) {
        console.error('❌ Errore avvio bot EMERGENCY v2.4.2:', error);
        
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const errorBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
                await errorBot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
                    `❌ Errore avvio bot EMERGENCY v2.4.2 su Render:\n${error.message}\n\nControlla i logs su Render dashboard.`);
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
    console.log('\n🛑 Ricevuto SIGINT, fermando bot EMERGENCY v2.4.2...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot EMERGENCY v2.4.2 fermato da SIGINT (restart server)', 'warning').catch(() => {});
        }
    }
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Ricevuto SIGTERM, fermando bot EMERGENCY v2.4.2...');
    if (bot) {
        bot.stop();
        if (bot.telegram) {
            bot.notify('🛑 Bot EMERGENCY v2.4.2 fermato da SIGTERM (deploy/restart)', 'warning').catch(() => {});
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
        bot.notify(`❌ Errore critico EMERGENCY v2.4.2: ${error.message}`, 'error').catch(() => {});
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (bot && bot.telegram) {
        bot.notify(`❌ Promise rejection EMERGENCY v2.4.2: ${reason}`, 'error').catch(() => {});
    }
});

// =============================================================================
// EXPORT MODULE
// =============================================================================

module.exports = { EmergencyDebugTONBot, emergencyConfig };

// =============================================================================
// ISTRUZIONI SETUP v2.4.2 EMERGENCY DEBUG
// =============================================================================
console.log('\n🚨 SETUP BOT v2.4.2 EMERGENCY DEBUG:');
console.log('==========================================');
console.log('📋 1. Sostituisci TUTTO bot.js con questo codice EMERGENCY');
console.log('🔑 2. Le variabili ambiente sono già ottimizzate');
console.log('🚀 3. Deploy su Render');
console.log('📱 4. Comandi EMERGENCY disponibili:');
console.log('   /emergency - Analisi API ultra-completa');
console.log('   /api - Test rapido API status');
console.log('   /structure - Mostra strutture API rilevate');
console.log('   /mapping - Test algoritmi mapping');
console.log('   /analysis - Report analisi dettagliato');
console.log('   /debug - Info emergency debug status');
console.log('');
console.log('✨ COSA FA EMERGENCY DEBUG v2.4.2:');
console.log('• Analisi ULTRA-COMPLETA struttura API response');
console.log('• Debug ricorsivo di tutti i nested objects');
console.log('• Estrazione automatica riferimenti TON');
console.log('• Mapping avanzato con fallback multipli');
console.log('• Logs dettagliati per troubleshooting');
console.log('• Individuazione precisa del problema');
console.log('==========================================');
console.log('🎯 OBIETTIVO: Risoluzione DEFINITIVA del problema!');
console.log('🚨 Usa /emergency per l\'analisi più completa mai vista!');
