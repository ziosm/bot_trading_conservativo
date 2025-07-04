const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

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
        this.notify('🤖 TON Conservative Bot inizializzato\n💡 Modalità: Preservazione capitale', 'startup');
    }

    setupTelegram() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || this.config.telegram?.botToken;
        const chatId = process.env.TELEGRAM_CHAT_ID || this.config.telegram?.chatId;
        
        if (botToken && chatId) {
            try {
                this.telegram = new TelegramBot(botToken);
                this.telegramChatId = chatId;
                console.log('📱 Telegram notifications abilitato');
                
                // Setup comandi Telegram
                this.setupTelegramCommands();
                
            } catch (error) {
                console.warn('⚠️ Errore setup Telegram:', error.message);
            }
        } else {
            console.log('📱 Telegram non configurato (opzionale)');
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

    getDailyTrades() {
        // Mock - implementare contatore trades giornalieri
        return Math.floor(this.stats.totalTrades / Math.max(1, Math.floor((Date.now() - this.startTime) / (1000 * 60 * 60 * 24))));
    }

    getNextResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
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
            
            if (!mnemonic) {
                throw new Error('Mnemonic non configurato');
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
                throw new Error(`Balance troppo basso. Minimo: ${this.config.conservative.minStartBalance} TON`);
            }
            
            // Notifica Telegram di successo
            await this.notify(`
🏦 *Wallet Inizializzato*
Address: \`${this.wallet.address.toString()}\`
Balance: ${this.stats.startBalance.toFixed(4)} TON
Status: ✅ Pronto per trading
            `, 'success');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            await this.notify(`❌ Errore inizializzazione wallet: ${error.message}`, 'error');
            return false;
        }
    }

    async start() {
        console.log('🚀 Conservative Bot avviato...');
        
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
🚀 *Bot Avviato*

📊 *Configurazione Conservativa:*
• Max Trade: ${this.config.conservative.maxTradeSize} TON
• Stop Loss: ${this.config.conservative.stopLossPercent}%
• Take Profit: ${this.config.conservative.takeProfitPercent}%
• Max Loss/Day: ${this.config.conservative.maxDailyLoss} TON
• Min Confidence: ${this.config.conservative.minConfidenceScore}%

🎯 Modalità: Preservazione capitale
        `, 'startup');
        
        // Reset giornaliero
        this.resetDailyStats();
        
        // Avvia monitoraggio conservativo
        this.conservativeMonitoring();
        this.dailyStatsReset();
        this.emergencyChecks();
        
        // Programma report giornaliero
        this.scheduleDailyReport();
    }

    async conservativeMonitoring() {
        // Scansione meno frequente per analisi più approfondita
        const scanInterval = this.config.conservative.scanInterval || 60000; // 1 minuto
        
        while (this.isRunning) {
            try {
                // Controlli di sicurezza prima di ogni scan
                if (!this.canContinueTrading()) {
                    console.log('⏸️ Trading sospeso per limiti di sicurezza');
                    await this.sleep(scanInterval * 5); // Pausa più lunga
                    continue;
                }
                
                this.scanCount++;
                console.log(`\n🔍 Conservative Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
                
                // Analisi più selettiva
                const qualityTokens = await this.findQualityTokens();
                
                if (qualityTokens.length > 0) {
                    console.log(`   📈 Trovati ${qualityTokens.length} token di qualità`);
                    
                    for (const token of qualityTokens) {
                        if (!this.canContinueTrading()) break;
                        
                        const analysis = await this.deepTokenAnalysis(token);
                        if (analysis.shouldBuy) {
                            await this.conservativeBuy(token, analysis);
                        }
                        
                        // Pausa tra analisi per non sovraccaricare
                        await this.sleep(5000);
                    }
                } else {
                    console.log('   💤 Nessun token di qualità rilevato');
                }
                
                // Aggiorna statistiche
                await this.updateStats();
                
                await this.sleep(scanInterval);
                
            } catch (error) {
                console.error('❌ Errore nel monitoraggio:', error.message);
                await this.sleep(scanInterval * 2); // Pausa più lunga su errore
            }
        }
    }

    async findQualityTokens() {
        const qualityTokens = [];
        
        try {
            // Solo DEX affidabili
            for (const dex of this.trustedDEXs) {
                const tokens = await this.scanDEX(dex);
                qualityTokens.push(...tokens);
            }
            
            // Filtra token di base
            return qualityTokens.filter(token => this.passesBasicFilters(token));
            
        } catch (error) {
            console.log('⚠️ Errore ricerca token:', error.message);
            return [];
        }
    }

    passesBasicFilters(token) {
        // Filtri conservativi di base
        const filters = this.config.conservative;
        
        // Non in blacklist
        if (this.tokenBlacklist.has(token.address)) {
            return false;
        }
        
        // Liquidità minima alta
        if (token.liquidity < filters.minLiquidity) {
            return false;
        }
        
        // Solo DEX affidabili
        if (!this.trustedDEXs.has(token.dex)) {
            return false;
        }
        
        // Age check - non troppo nuovo, non troppo vecchio
        const tokenAge = Date.now() - (token.createdAt || Date.now() - 3600000);
        const minAge = filters.minTokenAge * 1000;
        const maxAge = filters.maxTokenAge * 1000;
        
        if (tokenAge < minAge || tokenAge > maxAge) {
            return false;
        }
        
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
            // 1. ANALISI SICUREZZA (40% peso)
            const securityScore = await this.analyzeTokenSecurity(token);
            confidenceScore += securityScore * 0.4;
            
            if (securityScore < 60) {
                analysis.warnings.push(`Security score basso: ${securityScore}%`);
            }
            
            // 2. ANALISI LIQUIDITÀ E VOLUME (30% peso)
            const liquidityScore = await this.analyzeLiquidityHealth(token);
            confidenceScore += liquidityScore * 0.3;
            
            if (liquidityScore > 70) {
                analysis.reasons.push(`Liquidità salutare: ${liquidityScore}%`);
            }
            
            // 3. ANALISI COMMUNITY E HYPE (20% peso)
            const communityScore = await this.analyzeCommunityStrength(token);
            confidenceScore += communityScore * 0.2;
            
            // 4. ANALISI TECNICA (10% peso)
            const technicalScore = await this.analyzeTechnicalPatterns(token);
            confidenceScore += technicalScore * 0.1;
            
            analysis.confidenceScore = Math.round(confidenceScore);
            
            // DECISIONE CONSERVATIVA
            const minConfidence = this.config.conservative.minConfidenceScore;
            
            if (analysis.confidenceScore >= minConfidence && securityScore >= 60) {
                analysis.shouldBuy = true;
                analysis.reasons.push(`Confidence score: ${analysis.confidenceScore}%`);
                console.log(`   ✅ APPROVATO - Confidence: ${analysis.confidenceScore}%`);
            } else {
                console.log(`   ❌ RIFIUTATO - Confidence: ${analysis.confidenceScore}% (min: ${minConfidence}%)`);
                if (securityScore < 60) {
                    analysis.warnings.push('Security score insufficiente');
                }
            }
            
            // Log dettagliato
            if (analysis.reasons.length > 0) {
                console.log(`   📈 Motivi positivi: ${analysis.reasons.join(', ')}`);
            }
            if (analysis.warnings.length > 0) {
                console.log(`   ⚠️ Warning: ${analysis.warnings.join(', ')}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Errore analisi: ${error.message}`);
            analysis.shouldBuy = false;
        }
        
        return analysis;
    }

    async analyzeTokenSecurity(token) {
        let score = 0;
        
        try {
            // Mock implementazione - sostituire con API reali
            const securityData = {
                honeypotRisk: Math.random() * 100,
                rugPullRisk: Math.random() * 100,
                ownershipConcentration: Math.random() * 100,
                liquidityLocked: Math.random() > 0.3,
                contractVerified: Math.random() > 0.2
            };
            
            // Honeypot check
            if (securityData.honeypotRisk < 20) score += 25;
            else if (securityData.honeypotRisk < 50) score += 15;
            
            // Rug pull risk
            if (securityData.rugPullRisk < 30) score += 25;
            else if (securityData.rugPullRisk < 60) score += 15;
            
            // Ownership concentration
            if (securityData.ownershipConcentration < 50) score += 20;
            else if (securityData.ownershipConcentration < 80) score += 10;
            
            // Liquidity locked
            if (securityData.liquidityLocked) score += 20;
            
            // Contract verified  
            if (securityData.contractVerified) score += 10;
            
        } catch (error) {
            score = 30; // Punteggio basso se non riusciamo ad analizzare
        }
        
        return Math.min(score, 100);
    }

    async analyzeLiquidityHealth(token) {
        let score = 0;
        
        try {
            // Mock implementazione
            const liquidityData = {
                totalLiquidity: token.liquidity || 50,
                volume24h: (token.volume24h || 0),
                liquidityChange24h: (Math.random() - 0.5) * 50,
                volumeToLiquidityRatio: token.volume24h / token.liquidity || 0.1
            };
            
            // Liquidità assoluta
            if (liquidityData.totalLiquidity > 200) score += 30;
            else if (liquidityData.totalLiquidity > 100) score += 20;
            else if (liquidityData.totalLiquidity > 50) score += 10;
            
            // Volume ratio
            if (liquidityData.volumeToLiquidityRatio > 0.5) score += 25;
            else if (liquidityData.volumeToLiquidityRatio > 0.2) score += 15;
            else if (liquidityData.volumeToLiquidityRatio > 0.1) score += 10;
            
            // Stabilità liquidità
            if (Math.abs(liquidityData.liquidityChange24h) < 10) score += 25;
            else if (Math.abs(liquidityData.liquidityChange24h) < 25) score += 15;
            
            // Volume minimo
            if (liquidityData.volume24h > 1000) score += 20;
            else if (liquidityData.volume24h > 500) score += 10;
            
        } catch (error) {
            score = 40;
        }
        
        return Math.min(score, 100);
    }

    async analyzeCommunityStrength(token) {
        let score = 50; // Score neutro di base
        
        try {
            // Mock social analysis
            const socialData = {
                telegramMembers: Math.floor(Math.random() * 10000),
                twitterFollowers: Math.floor(Math.random() * 50000),
                holderCount: Math.floor(Math.random() * 5000),
                mentionsLast24h: Math.floor(Math.random() * 100)
            };
            
            // Keywords analysis
            const hasStrongKeyword = this.config.conservative.strongKeywords.some(keyword => 
                token.name.toLowerCase().includes(keyword.toLowerCase()) || 
                token.symbol.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (hasStrongKeyword) score += 20;
            
            // Holder count
            if (socialData.holderCount > 1000) score += 15;
            else if (socialData.holderCount > 500) score += 10;
            
            // Social mentions
            if (socialData.mentionsLast24h > 20) score += 15;
            else if (socialData.mentionsLast24h > 10) score += 10;
            
        } catch (error) {
            // Se non possiamo analizzare social, score neutro
        }
        
        return Math.min(score, 100);
    }

    async analyzeTechnicalPatterns(token) {
        // Analisi tecnica semplice
        let score = 50;
        
        try {
            // Mock price data
            const priceData = {
                currentPrice: 0.000001 + Math.random() * 0.001,
                priceChange1h: (Math.random() - 0.5) * 20,
                priceChange24h: (Math.random() - 0.5) * 100,
                volatility: Math.random() * 200
            };
            
            // Preferenza per momentum positivo ma non eccessivo
            if (priceData.priceChange1h > 5 && priceData.priceChange1h < 30) score += 20;
            if (priceData.priceChange24h > 10 && priceData.priceChange24h < 100) score += 15;
            
            // Penalizza volatilità eccessiva
            if (priceData.volatility > 150) score -= 15;
            else if (priceData.volatility < 50) score += 15;
            
        } catch (error) {
            score = 50;
        }
        
        return Math.min(score, 100);
    }

    async conservativeBuy(token, analysis) {
        try {
            // Calcola size conservativo
            const baseSize = this.config.conservative.maxTradeSize;
            const confidenceMultiplier = analysis.confidenceScore / 100;
            const buyAmount = baseSize * confidenceMultiplier * this.config.conservative.sizeMultiplier;
            
            console.log(`💰 ACQUISTO CONSERVATIVO: ${buyAmount.toFixed(4)} TON di ${token.symbol}`);
            console.log(`   📊 Confidence: ${analysis.confidenceScore}% | Size: ${(confidenceMultiplier * 100).toFixed(1)}%`);
            
            // Mock transazione
            const txHash = `0x${Math.random().toString(16).substr(2, 10)}...`;
            
            const position = {
                name: token.name,
                symbol: token.symbol,
                amount: buyAmount,
                entryPrice: 0.000001 + Math.random() * 0.001,
                entryTime: Date.now(),
                confidence: analysis.confidenceScore,
                dex: token.dex,
                txHash,
                
                // Stop Loss/Take Profit conservativi
                stopLoss: null, // Calcolato dinamicamente
                takeProfit: null,
                trailingStopActive: false
            };
            
            // Calcola stop loss e take profit
            this.calculateConservativeExits(position);
            
            this.positions.set(token.address, position);
            this.stats.totalTrades++;
            
            console.log(`   🛡️ Stop Loss: ${(position.stopLoss * 100).toFixed(1)}%`);
            console.log(`   🎯 Take Profit: ${(position.takeProfit * 100).toFixed(1)}%`);
            
            // Notifica Telegram dell'acquisto
            await this.notifyTrade('buy', position);
            
            // Avvia monitoraggio posizione
            this.startConservativePositionMonitoring(token.address);
            
        } catch (error) {
            console.error('❌ Errore acquisto conservativo:', error.message);
        }
    }

    calculateConservativeExits(position) {
        const config = this.config.conservative;
        
        // Stop loss più stretto per alta confidence
        const stopLossAdjustment = position.confidence > 80 ? 0.8 : 1.0;
        position.stopLoss = config.stopLossPercent * stopLossAdjustment;
        
        // Take profit scala con confidence
        const takeProfitAdjustment = position.confidence > 80 ? 1.2 : 1.0;
        position.takeProfit = config.takeProfitPercent * takeProfitAdjustment;
    }

    startConservativePositionMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Mock current price
                const currentPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.4);
                const priceChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
                
                // Log periodico
                if (this.scanCount % 5 === 0) {
                    console.log(`📊 ${position.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
                }
                
                // Stop Loss check
                if (priceChange <= position.stopLoss) {
                    console.log(`🛑 STOP LOSS ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.conservativeSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Take Profit check
                if (priceChange >= position.takeProfit) {
                    console.log(`🎯 TAKE PROFIT ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.conservativeSell(tokenAddress, 'take_profit');
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Trailing Stop per profitti alti
                if (priceChange > 30 && !position.trailingStopActive) {
                    position.trailingStopActive = true;
                    position.trailingStopPrice = currentPrice * 0.85; // 15% trailing
                    console.log(`📈 Trailing stop attivato per ${position.symbol} a ${position.trailingStopPrice.toFixed(6)}`);
                    await this.notify(`📈 Trailing stop attivato per ${position.symbol}\nPrezzo attuale: +${priceChange.toFixed(2)}%`, 'trade');
                }
                
                if (position.trailingStopActive && currentPrice <= position.trailingStopPrice) {
                    console.log(`📉 TRAILING STOP ${position.symbol}: ${priceChange.toFixed(2)}%`);
                    await this.conservativeSell(tokenAddress, 'trailing_stop');
                    clearInterval(monitorInterval);
                    return;
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio ${tokenAddress}:`, error.message);
            }
        }, 30000); // Ogni 30 secondi
        
        // Timeout massimo per posizione
        setTimeout(async () => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                console.log(`⏰ Timeout raggiunto per ${this.positions.get(tokenAddress).symbol}`);
                await this.conservativeSell(tokenAddress, 'timeout');
            }
        }, this.config.conservative.maxHoldTime || 3600000); // 1 ora default
    }

    async conservativeSell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            // Mock prezzo corrente per calcolo P&L
            const currentPrice = position.entryPrice * (1 + (Math.random() - 0.3) * 0.6);
            const pnl = (currentPrice - position.entryPrice) * (position.amount / position.entryPrice);
            const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
            
            console.log(`💸 VENDITA ${position.symbol} | Motivo: ${reason}`);
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
            console.error('❌ Errore vendita conservativa:', error.message);
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

    resetDailyStats() {
        const today = new Date().toDateString();
        if (this.stats.lastResetDate !== today) {
            this.stats.dailyPnL = 0;
            this.stats.lastResetDate = today;
            console.log('📊 Statistiche giornaliere resettate');
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

    // Utility methods
    formatTON(nanotons) {
        return (Number(nanotons) / 1000000000).toFixed(4);
    }
    
    async getWalletBalance() {
        if (!this.wallet) return this.stats.startBalance; // Mock se non inizializzato
        
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
}

// CONFIGURAZIONE CONSERVATIVA
const conservativeConfig = {
    // Wallet
    mnemonic: [], // Le tue 24 parole
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    
    // Telegram (OBBLIGATORIO per notifiche)
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
        chatId: process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID'
    },
    
    // Configurazione conservativa
    conservative: {
        // Gestione rischio
        maxTradeSize: 0.5,           // TON per trade (piccolo!)
        maxPositions: 3,             // Max 3 posizioni simultanee
        minStartBalance: 10,         // Balance minimo per iniziare
        maxDailyLoss: 2,            // Max perdita giornaliera
        maxDrawdownPercent: 15,      // Max drawdown 15%
        
        // Stop/Profit
        stopLossPercent: -8,         // Stop loss veloce a -8%
        takeProfitPercent: 15,       // Take profit modesto a +15%
        maxHoldTime: 3600000,       // Max 1 ora per posizione
        
        // Qualità token
        minConfidenceScore: 75,      // Score minimo per trading
        minLiquidity: 100,          // Liquidità minima più alta
        minTokenAge: 1800,          // Min 30 minuti di vita
        maxTokenAge: 86400,         // Max 24 ore
        
        // Keywords forte per meme coin affidabili
        strongKeywords: ['doge', 'pepe', 'shiba'],
        
        // Trading
        scanInterval: 60000,        // Scan ogni minuto (meno frequente)
        sizeMultiplier: 0.8,        // Size più piccolo (80% del max)
    }
};

// Mock dei metodi di scansione (implementare con API reali)
ConservativeTONBot.prototype.scanDEX = async function(dex) {
    // Simula tokens trovati
    return [
        { 
            name: 'DogeCoin2', 
            symbol: 'DOGE2', 
            address: '0x123...', 
            liquidity: 150, 
            dex: dex,
            createdAt: Date.now() - 3600000,
            volume24h: 500
        }
    ];
};

ConservativeTONBot.prototype.updateStats = async function() {
    // Aggiorna stats periodicamente
    console.log(`📊 Stats: ${this.stats.totalTrades} trades | P&L: ${this.stats.totalPnL.toFixed(4)} TON | Win Rate: ${this.getWinRate()}%`);
};

// AVVIO BOT CONSERVATIVO
// const bot = new ConservativeTONBot(conservativeConfig);
// bot.start();

module.exports = { ConservativeTONBot, conservativeConfig };
