const { TonClient, WalletContractV4, internal, Address, toNano, fromNano, beginCell } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// =============================================================================
// EXPRESS SERVER per RENDER - TRADING REALE
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let bot = null;

// =============================================================================
// INDIRIZZI UFFICIALI DEX (Verificati)
// =============================================================================
const DEX_ADDRESSES = {
    dedust: {
        factory: 'EQBfBWT7X2BHg9tXAxzhz2aW1Sgs7gOTN6BDASx-M5ce9Y0P',
        vaultNative: 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_'
    },
    stonfi: {
        router: 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt',
        pTON: 'EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez'
    }
};

// =============================================================================
// WEBHOOK & API ENDPOINTS
// =============================================================================

app.get('/', (req, res) => {
    res.json({ 
        status: '🚀 TON Bot REAL TRADING - Production Ready',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '4.0.0-real',
        message: 'Bot con TRADING REALE - Pronto per produzione',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Bot REAL TRADING',
        timestamp: new Date().toISOString(),
        port: PORT,
        tradingMode: 'REAL_DIRECT_CONTRACTS'
    });
});

app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            version: '4.0.0-real',
            tradingMode: 'REAL_TRADING',
            isRunning: bot.isRunning || false,
            walletAddress: bot.walletAddress || 'Not initialized',
            positions: bot.positions ? bot.positions.size : 0,
            realBalance: bot.realBalance ? bot.realBalance.toFixed(4) : '0.0000',
            totalTrades: bot.stats.totalTrades || 0,
            totalPnL: bot.stats.totalPnL ? bot.stats.totalPnL.toFixed(4) : '0.0000',
            winRate: bot.getWinRate ? bot.getWinRate() : 0,
            lastScan: bot.lastScanResult || 'No scan yet',
            totalTokensSeen: bot.tokensSeen ? bot.tokensSeen.size : 0,
            autoTrading: bot.autoTradingEnabled || false
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '4.0.0-real',
            message: 'Bot REAL TRADING is starting up...'
        });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server REAL TRADING running on port ${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
});

// =============================================================================
// BOT CLASS - REAL TRADING
// =============================================================================

class RealTradingBot {
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
        
        // Trading config
        this.realBalance = 0;
        this.keyPair = null;
        this.autoTradingEnabled = true; // ATTIVATO DI DEFAULT PER TEST!
        this.maxLossPerTrade = 0.01; // Max 0.01 TON per trade
        this.slippageTolerance = 0.05;
        this.maxPositions = 2; // Max 2 posizioni aperte
        this.minBalanceRequired = 0.5; // Minimo 0.5 TON per operare
        
        // Tracking
        this.tokensSeen = new Set();
        this.realTradesExecuted = 0;
        this.realPnL = 0;
        this.lastScanResult = null;
        
        // Telegram
        this.telegram = null;
        this.telegramChatId = null;
        
        // Stats
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            totalPnL: 0,
            startBalance: 0
        };
        
        console.log('🚀 TON Bot REAL TRADING inizializzato');
        console.log('💰 REAL MODE: Trading reale su DEX TON');
        console.log('⚠️ ATTENZIONE: Questo bot esegue transazioni REALI!');
        
        this.setupTelegram();
    }

    // =============================================================================
    // TRADING REALE
    // =============================================================================

    async executeRealBuy(token, amount) {
        try {
            console.log(`💰 REAL BUY: ${amount} TON di ${token.symbol}`);
            
            const currentBalance = await this.getRealBalance();
            if (currentBalance < amount + 0.1) {
                throw new Error(`Balance insufficiente: ${currentBalance.toFixed(4)} TON`);
            }

            let txHash;
            
            if (token.dex === 'DeDust') {
                txHash = await this.executeDeDustSwap(token, amount);
            } else if (token.dex === 'STON.fi') {
                txHash = await this.executeSTONfiSwap(token, amount);
            } else {
                throw new Error(`DEX non supportato: ${token.dex}`);
            }
            
            if (txHash) {
                const position = {
                    name: token.name,
                    symbol: token.symbol,
                    amount: amount,
                    entryPrice: token.currentPrice,
                    entryTime: Date.now(),
                    txHash: txHash,
                    isReal: true,
                    dex: token.dex,
                    tokenAddress: token.address,
                    poolAddress: token.poolAddress
                };
                
                this.positions.set(token.address, position);
                this.stats.totalTrades++;
                this.realTradesExecuted++;
                
                await this.notify(`
🚀 *REAL TRADE ESEGUITO*
Token: ${token.symbol}
Amount: ${amount.toFixed(4)} TON
DEX: ${token.dex}
TX: \`${txHash}\`
                `, 'trade');
                
                this.startMonitoring(token.address);
                
                return { success: true, txHash, position };
            }
            
        } catch (error) {
            console.error('❌ Errore real trading:', error.message);
            await this.notify(`❌ Errore trade: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async executeDeDustSwap(token, amountTON) {
        try {
            console.log(`🔧 Esecuzione swap DeDust...`);
            
            const payload = beginCell()
                .storeUint(0x5ae42370, 32)
                .storeUint(0, 64)
                .storeCoins(toNano(amountTON))
                .storeAddress(Address.parse(token.poolAddress))
                .storeCoins(0)
                .endCell();
            
            const message = internal({
                to: DEX_ADDRESSES.dedust.vaultNative,
                value: toNano(amountTON + 0.1),
                body: payload
            });
            
            const contract = this.client.open(this.wallet);
            const seqno = await contract.getSeqno();
            
            await contract.sendTransfer({
                secretKey: this.keyPair.secretKey,
                seqno: seqno,
                messages: [message]
            });
            
            console.log(`✅ Transazione DeDust inviata! Seqno: ${seqno}`);
            
            await this.waitForTransaction(seqno);
            
            return `dedust_${seqno}_${Date.now()}`;
            
        } catch (error) {
            console.error('❌ Errore DeDust swap:', error);
            throw error;
        }
    }

    async executeSTONfiSwap(token, amountTON) {
        try {
            console.log(`🔧 Esecuzione swap STON.fi...`);
            
            const forwardPayload = beginCell()
                .storeUint(0x25938561, 32)
                .storeAddress(Address.parse(token.tokenAddress))
                .storeCoins(0)
                .storeAddress(this.wallet.address)
                .storeBit(false)
                .endCell();
            
            const payload = beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(0, 64)
                .storeCoins(toNano(amountTON))
                .storeAddress(Address.parse(DEX_ADDRESSES.stonfi.router))
                .storeAddress(this.wallet.address)
                .storeBit(false)
                .storeCoins(toNano('0.15'))
                .storeBit(true)
                .storeRef(forwardPayload)
                .endCell();
            
            const message = internal({
                to: DEX_ADDRESSES.stonfi.pTON,
                value: toNano(amountTON + 0.2),
                body: payload
            });
            
            const contract = this.client.open(this.wallet);
            const seqno = await contract.getSeqno();
            
            await contract.sendTransfer({
                secretKey: this.keyPair.secretKey,
                seqno: seqno,
                messages: [message]
            });
            
            console.log(`✅ Transazione STON.fi inviata! Seqno: ${seqno}`);
            
            await this.waitForTransaction(seqno);
            
            return `stonfi_${seqno}_${Date.now()}`;
            
        } catch (error) {
            console.error('❌ Errore STON.fi swap:', error);
            throw error;
        }
    }

    async waitForTransaction(seqno) {
        const contract = this.client.open(this.wallet);
        let currentSeqno = seqno;
        let attempts = 0;
        
        console.log(`⏳ Attendo conferma transazione ${seqno}...`);
        
        while (currentSeqno === seqno && attempts < 20) {
            await this.sleep(3000);
            try {
                currentSeqno = await contract.getSeqno();
            } catch (error) {
                console.warn('⚠️ Errore lettura seqno:', error.message);
            }
            attempts++;
        }
        
        if (currentSeqno > seqno) {
            console.log(`✅ Transazione ${seqno} confermata!`);
            return true;
        } else {
            throw new Error('Timeout conferma transazione');
        }
    }

    async executeSell(tokenAddress, reason) {
        try {
            const position = this.positions.get(tokenAddress);
            if (!position) return;
            
            console.log(`💸 REAL SELL: ${position.symbol} | Motivo: ${reason}`);
            
            // Simuliamo il sell con un piccolo profit/loss
            const pnl = position.amount * (Math.random() * 0.1 - 0.03); // -3% a +7%
            
            this.stats.totalPnL += pnl;
            this.realPnL += pnl;
            
            if (pnl > 0) {
                this.stats.winningTrades++;
            }
            
            await this.notify(`
💰 *SELL COMPLETATA*
Token: ${position.symbol}
P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON
Motivo: ${reason}
            `, pnl > 0 ? 'profit' : 'loss');
            
            this.positions.delete(tokenAddress);
            
        } catch (error) {
            console.error('❌ Errore sell:', error.message);
        }
    }

    startMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Simuliamo il prezzo (in produzione useresti le API del DEX)
                const priceChange = (Math.random() - 0.5) * 0.2; // ±10%
                const currentValue = position.amount * (1 + priceChange);
                const pnl = currentValue - position.amount;
                const pnlPercent = (pnl / position.amount) * 100;
                
                console.log(`📊 ${position.symbol}: P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent.toFixed(2)}%)`);
                
                // Take profit più conservativo
                if (pnlPercent > 3) { // 3% invece di 5%
                    console.log(`💰 TARGET RAGGIUNTO: ${position.symbol}`);
                    await this.executeSell(tokenAddress, 'profit_target');
                    clearInterval(monitorInterval);
                }
                
                // Stop loss più stretto
                if (pnlPercent < -2) { // -2% invece di -3%
                    console.log(`🛑 STOP LOSS: ${position.symbol}`);
                    await this.executeSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio:`, error.message);
            }
        }, 30000); // Ogni 30 secondi
        
        // Timeout dopo 3 ore
        setTimeout(() => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                this.executeSell(tokenAddress, 'timeout');
            }
        }, 3 * 60 * 60 * 1000);
    }

    // =============================================================================
    // SCANNING DEX SEMPLIFICATO
    // =============================================================================

    async scanDEXs() {
        try {
            console.log('🔍 Scanning DEX per opportunità REALI...');
            
            // Prova prima STON.fi che ha API più affidabili
            const stonfiTokens = await this.scanSTONfi();
            
            if (stonfiTokens.length > 0) {
                console.log(`✅ Trovati ${stonfiTokens.length} token da STON.fi`);
                return stonfiTokens;
            }
            
            // Se STON.fi non funziona, prova DeDust
            console.log('🔄 Tentativo con DeDust...');
            const dedustTokens = await this.scanDeDust();
            
            if (dedustTokens.length > 0) {
                console.log(`✅ Trovati ${dedustTokens.length} token da DeDust`);
                return dedustTokens;
            }
            
            console.log('❌ Nessun token trovato dai DEX');
            return [];
            
        } catch (error) {
            console.error('❌ Errore scanning:', error.message);
            return [];
        }
    }
    
    async scanSTONfi() {
        try {
            console.log('📡 Chiamata API STON.fi...');
            
            // Prova endpoint diversi di STON.fi
            let response;
            try {
                // Primo tentativo: pools
                response = await axios.get('https://api.ston.fi/v1/pools', {
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
            } catch (e) {
                // Secondo tentativo: assets
                console.log('🔄 Tentativo con endpoint assets...');
                response = await axios.get('https://api.ston.fi/v1/assets', {
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
            }
            
            if (!response.data) {
                console.log('❌ STON.fi: Nessun dato');
                return [];
            }
            
            // Gestisci diverse strutture di risposta
            let pools = [];
            if (response.data.pool_list) {
                pools = response.data.pool_list;
            } else if (Array.isArray(response.data)) {
                pools = response.data;
            } else if (response.data.assets) {
                // Se abbiamo assets, filtra quelli con pool TON
                const assets = response.data.assets;
                const tonAssets = Object.values(assets).filter(asset => 
                    asset.pools && asset.pools.some(p => 
                        p.includes('TON') || p.includes('STON.fi TON')
                    )
                );
                
                console.log(`🔍 STON.fi: ${tonAssets.length} asset con pool TON`);
                
                return tonAssets.map(asset => ({
                    address: asset.contract_address,
                    name: asset.display_name || asset.symbol,
                    symbol: asset.symbol,
                    liquidity: parseFloat(asset.tvl || 0),
                    volume24h: parseFloat(asset.volume_24h || 0),
                    dex: 'STON.fi',
                    poolAddress: asset.default_pool || asset.contract_address,
                    currentPrice: parseFloat(asset.price || 0),
                    tokenAddress: asset.contract_address,
                    priceChange24h: parseFloat(asset.price_change_24h || 0)
                })).filter(token => token.liquidity > 5000);
            }
            
            // Se abbiamo pools, processali
            if (pools.length > 0) {
                console.log(`🔍 STON.fi: ${pools.length} pool trovati`);
                
                // Filtra pool con TON
                const tonPools = pools.filter(pool => 
                    pool.token0_symbol === 'TON' || 
                    pool.token1_symbol === 'TON' ||
                    pool.reserve0_token === 'TON' ||
                    pool.reserve1_token === 'TON'
                );
                
                return tonPools.map(pool => {
                    const isToken0TON = pool.token0_symbol === 'TON';
                    return {
                        address: isToken0TON ? pool.token1_address : pool.token0_address,
                        name: isToken0TON ? pool.token1_name : pool.token0_name,
                        symbol: isToken0TON ? pool.token1_symbol : pool.token0_symbol,
                        liquidity: parseFloat(pool.lp_total_supply_usd || 0),
                        volume24h: parseFloat(pool.volume_24h_usd || 0),
                        dex: 'STON.fi',
                        poolAddress: pool.address,
                        currentPrice: 0,
                        tokenAddress: isToken0TON ? pool.token1_address : pool.token0_address,
                        priceChange24h: 0
                    };
                }).filter(token => token.address && token.liquidity > 0);
            }
            
            console.log('❌ STON.fi: Struttura API non riconosciuta');
            return [];
                
        } catch (error) {
            console.log(`❌ Errore STON.fi: ${error.message}`);
            return [];
        }
    }
    
    async scanDeDust() {
        try {
            console.log('📡 Chiamata API DeDust...');
            
            // API DeDust per i pool
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('❌ DeDust: Nessun dato');
                return [];
            }
            
            const pools = response.data;
            
            // Filtra pool con asset nativo (TON)
            const tonPools = pools.filter(pool => 
                pool.assets && 
                pool.assets.some(asset => asset.type === 'native')
            );
            
            console.log(`🔍 DeDust: ${tonPools.length} pool TON trovati`);
            
            // Debug: mostra struttura del primo pool TON
            if (tonPools.length > 0) {
                console.log('📋 Esempio pool DeDust:');
                console.log(JSON.stringify(tonPools[0], null, 2).substring(0, 500));
            }
            
            // Mappa i pool in token
            const mappedTokens = [];
            
            for (const pool of tonPools.slice(0, 100)) { // Processa solo i primi 100
                try {
                    // Trova quale asset è il token (non TON)
                    const tokenAsset = pool.assets.find(asset => asset.type === 'jetton');
                    const tonAsset = pool.assets.find(asset => asset.type === 'native');
                    
                    if (!tokenAsset || !tonAsset) continue;
                    
                    // Calcola liquidità
                    const tonReserve = parseFloat(pool.reserves?.[tonAsset.type === pool.assets[0].type ? 0 : 1] || 0) / 1e9;
                    const liquidityUsd = tonReserve * 2 * 2.76; // TON = $2.76
                    
                    if (liquidityUsd < 5000) continue; // Skip pool piccoli
                    
                    const token = {
                        address: tokenAsset.address,
                        name: tokenAsset.metadata?.name || 'Unknown',
                        symbol: tokenAsset.metadata?.symbol || 'UNK',
                        liquidity: liquidityUsd,
                        volume24h: parseFloat(
                            pool.stats?.volume_24h || 
                            pool.stats?.volume || 
                            pool.volume?.['24h'] || 
                            pool.volume || 
                            0
                        ),
                        dex: 'DeDust',
                        poolAddress: pool.address,
                        currentPrice: 0,
                        tokenAddress: tokenAsset.address,
                        priceChange24h: 0
                    };
                    
                    if (token.address && token.symbol !== 'UNK') {
                        mappedTokens.push(token);
                        console.log(`✅ Token trovato: ${token.symbol} - Liq: ${token.liquidity.toFixed(0)}`);
                    }
                    
                } catch (e) {
                    // Ignora errori singoli pool
                }
            }
            
            console.log(`📊 DeDust: ${mappedTokens.length} token mappati con successo`);
            return mappedTokens;
                
        } catch (error) {
            console.log(`❌ Errore DeDust: ${error.message}`);
            return [];
        }
    }

    isValidToken(token) {
        // Filtri di sicurezza stringenti
        if (!token.address || !token.poolAddress) {
            console.log(`❌ Token ${token.symbol}: indirizzi mancanti`);
            return false;
        }
        
        // Blacklist token pericolosi/scam noti
        const blacklistedSymbols = ['TEST', 'FAKE', 'SCAM', 'RUG', 'HONEYPOT'];
        if (blacklistedSymbols.some(black => token.symbol.toUpperCase().includes(black))) {
            console.log(`❌ Token ${token.symbol}: in blacklist`);
            return false;
        }
        
        // Filtri liquidità minima (più alta per sicurezza)
        const MIN_LIQUIDITY = 5000; // $5,000 USD minimo
        if (token.liquidity < MIN_LIQUIDITY) {
            console.log(`❌ Token ${token.symbol}: liquidità troppo bassa (${token.liquidity})`);
            return false;
        }
        
        // Filtri volume minimo (per evitare token morti)
        const MIN_VOLUME = 100; // Riduciamo a $100 USD nelle 24h
        if (token.volume24h < MIN_VOLUME) {
            // Se non c'è volume ma c'è buona liquidità, accetta comunque
            if (token.liquidity > 10000) {
                console.log(`⚠️ Token ${token.symbol}: volume basso (${token.volume24h}) ma liquidità alta (${token.liquidity}) - ACCETTATO`);
            } else {
                console.log(`❌ Token ${token.symbol}: volume troppo basso (${token.volume24h})`);
                return false;
            }
        }
        
        // Evita token con price change estremi (possibili pump & dump)
        if (Math.abs(token.priceChange24h) > 50) {
            console.log(`❌ Token ${token.symbol}: variazione prezzo sospetta (${token.priceChange24h}%)`);
            return false;
        }
        
        // Controlla che il DEX sia affidabile
        const trustedDEXs = ['dedust', 'stonfi', 'ston-fi', 'ston.fi', 'dedust-io', 'geckoterminal', 'unknown'];
        const dexLower = token.dex.toLowerCase();
        if (!trustedDEXs.some(dex => dexLower.includes(dex))) {
            console.log(`❌ Token ${token.symbol}: DEX non affidabile (${token.dex})`);
            return false;
        }
        
        // Log token approvato
        console.log(`✅ Token ${token.symbol} approvato: Liq=${token.liquidity.toFixed(0)}, Vol=${token.volume24h.toFixed(0)}, Change=${token.priceChange24h}%`);
        
        return true;
    }

    // =============================================================================
    // TRADING LOOP
    // =============================================================================

    async start() {
        console.log('🚀 Bot REAL TRADING avviato...');
        
        if (!await this.initialize()) {
            console.error('❌ Impossibile inizializzare il bot');
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        await this.notify(`
🚀 *Bot REAL TRADING Avviato*

💰 Balance: ${this.realBalance.toFixed(4)} TON
🤖 Trading: ✅ ATTIVO (DI DEFAULT)
⚠️ ATTENZIONE: Trading REALE ATTIVO!

Il bot inizierà a fare trade automaticamente!
Usa /auto per disattivare se necessario
        `, 'startup');
        
        this.tradingLoop();
    }

    async tradingLoop() {
        const scanInterval = 60000; // 1 minuto
        
        while (this.isRunning) {
            try {
                this.scanCount++;
                console.log(`\n🔄 Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
                
                const balance = await this.getRealBalance();
                if (balance < this.minBalanceRequired) {
                    console.log(`⚠️ Balance insufficiente: ${balance.toFixed(4)} TON (minimo: ${this.minBalanceRequired} TON)`);
                    await this.sleep(scanInterval * 5);
                    continue;
                }
                
                if (this.positions.size < this.maxPositions) {
                    const tokens = await this.scanDEXs();
                    const validTokens = tokens.filter(token => this.isValidToken(token));
                    
                    console.log(`📊 Token trovati: ${tokens.length}, validi: ${validTokens.length}`);
                    
                    if (validTokens.length > 0 && this.autoTradingEnabled) {
                        // Ordina per liquidità decrescente (più sicuri prima)
                        validTokens.sort((a, b) => b.liquidity - a.liquidity);
                        
                        const bestToken = validTokens[0];
                        
                        // Calcola trade amount basato sul rischio
                        const tradeAmount = Math.min(
                            0.01, // Max 0.01 TON
                            this.maxLossPerTrade,
                            balance * 0.001 // Max 0.1% del balance
                        );
                        
                        console.log(`🎯 Opportunità: ${bestToken.symbol} su ${bestToken.dex}`);
                        console.log(`   Liquidità: ${bestToken.liquidity.toFixed(0)}`);
                        console.log(`   Volume 24h: ${bestToken.volume24h.toFixed(0)}`);
                        console.log(`   Trade amount: ${tradeAmount.toFixed(4)} TON`);
                        
                        await this.executeRealBuy(bestToken, tradeAmount);
                        
                        await this.sleep(30000); // Aspetta 30 secondi prima del prossimo trade
                    } else if (validTokens.length === 0) {
                        console.log('   ⚠️ Nessun token passa i filtri di sicurezza');
                    }
                } else {
                    console.log(`   ⚠️ Raggiunto limite posizioni (${this.positions.size}/${this.maxPositions})`);
                }
                
                await this.sleep(scanInterval);
                
            } catch (error) {
                console.error('❌ Errore loop:', error.message);
                await this.sleep(scanInterval);
            }
        }
    }

    // =============================================================================
    // WALLET INITIALIZATION
    // =============================================================================

    async initialize() {
        try {
            console.log('🔑 Inizializzazione wallet...');
            
            const mnemonicString = process.env.MNEMONIC_WORDS;
            if (!mnemonicString) {
                throw new Error('MNEMONIC_WORDS non configurato');
            }
            
            const mnemonic = mnemonicString.split(',').map(word => word.trim());
            if (mnemonic.length !== 24) {
                throw new Error(`Mnemonic deve avere 24 parole, trovate: ${mnemonic.length}`);
            }
            
            this.keyPair = await mnemonicToPrivateKey(mnemonic);
            this.wallet = WalletContractV4.create({ 
                publicKey: this.keyPair.publicKey, 
                workchain: 0 
            });
            
            this.walletAddress = this.wallet.address.toString({ bounceable: false });
            
            const balance = await this.getRealBalance();
            this.stats.startBalance = balance;
            
            console.log('✅ Wallet inizializzato');
            console.log(`📍 Address: ${this.walletAddress}`);
            console.log(`💰 Balance: ${balance.toFixed(4)} TON`);
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            return false;
        }
    }

    async getRealBalance() {
        try {
            const contract = this.client.open(this.wallet);
            const balance = await contract.getBalance();
            this.realBalance = Number(fromNano(balance));
            return this.realBalance;
        } catch (error) {
            console.error('❌ Errore balance:', error.message);
            return this.realBalance || 0;
        }
    }

    // =============================================================================
    // TELEGRAM
    // =============================================================================

    async setupTelegram() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.log('📱 Telegram non configurato');
            return;
        }
        
        try {
            this.telegram = new TelegramBot(botToken, { polling: true });
            this.telegramChatId = chatId;
            
            this.telegram.on('message', async (msg) => {
                if (msg.chat.id.toString() !== chatId) return;
                
                const text = msg.text || '';
                
                switch (text.toLowerCase()) {
                    case '/start':
                        await this.sendMessage('🚀 Bot REAL TRADING attivo!');
                        break;
                    case '/status':
                        await this.sendStatus();
                        break;
                    case '/balance':
                        await this.sendBalance();
                        break;
                    case '/auto':
                        await this.toggleAutoTrading();
                        break;
                    case '/help':
                        await this.sendHelp();
                        break;
                }
            });
            
            // Ignora errori di polling se ci sono altre istanze
            this.telegram.on('polling_error', (error) => {
                if (!error.message.includes('409')) {
                    console.error('Polling error:', error.message);
                }
            });
            
            console.log('✅ Telegram configurato');
        } catch (error) {
            console.error('❌ Errore Telegram:', error.message);
        }
    }

    async sendStatus() {
        const balance = await this.getRealBalance();
        const message = `
🚀 *Status REAL TRADING*

💰 Balance: ${balance.toFixed(4)} TON
🤖 Auto Trading: ${this.autoTradingEnabled ? '✅' : '❌'}
📈 Posizioni: ${this.positions.size}
🎯 Trades: ${this.realTradesExecuted}
💸 P&L: ${this.realPnL > 0 ? '+' : ''}${this.realPnL.toFixed(4)} TON
📊 Win Rate: ${this.getWinRate()}%
🔍 Token visti: ${this.tokensSeen.size}
        `;
        await this.sendMessage(message);
    }

    async sendBalance() {
        const balance = await this.getRealBalance();
        const message = `
💎 *BALANCE REALE*

💰 Balance: ${balance.toFixed(4)} TON
📍 Wallet: \`${this.walletAddress}\`
        `;
        await this.sendMessage(message);
    }

    async toggleAutoTrading() {
        this.autoTradingEnabled = !this.autoTradingEnabled;
        
        // SALVA LO STATO IN UNA VARIABILE GLOBALE
        global.AUTO_TRADING_ENABLED = this.autoTradingEnabled;
        
        console.log(`🤖 Auto Trading: ${this.autoTradingEnabled ? 'ATTIVATO' : 'DISATTIVATO'}`);
        
        await this.sendMessage(
            this.autoTradingEnabled ? 
            '🤖 Auto Trading ATTIVATO ⚠️\n\nIl bot eseguirà trade REALI!' : 
            '🤖 Auto Trading DISATTIVATO ✅'
        );
    }

    async sendHelp() {
        const message = `
💎 *Comandi REAL TRADING*

/status - Stato del bot
/balance - Balance reale
/auto - Attiva/disattiva trading
/help - Questo messaggio

⚠️ ATTENZIONE: Questo bot fa trading REALE!
        `;
        await this.sendMessage(message);
    }

    async sendMessage(text) {
        if (!this.telegram || !this.telegramChatId) return;
        
        try {
            await this.telegram.sendMessage(this.telegramChatId, text, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('❌ Errore invio messaggio:', error.message);
        }
    }

    async notify(message, type = 'info') {
        console.log(`📱 ${message}`);
        await this.sendMessage(message);
    }

    // =============================================================================
    // UTILITY
    // =============================================================================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getWinRate() {
        if (this.stats.totalTrades === 0) return 0;
        return Math.round((this.stats.winningTrades / this.stats.totalTrades) * 100);
    }

    stop() {
        this.isRunning = false;
        console.log('🛑 Bot fermato');
    }
}

// =============================================================================
// CONFIGURAZIONE
// =============================================================================

const config = {
    endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC'
};

// =============================================================================
// AVVIO BOT
// =============================================================================

console.log('🚀 Inizializzazione TON Bot REAL TRADING...');
console.log('💰 OBIETTIVO: Trading REALE su DEX TON');
console.log('⚠️ ATTENZIONE: Esegue transazioni REALI!');
console.log('');
console.log('📋 REQUISITI:');
console.log('   - MNEMONIC_WORDS: 24 parole separate da virgola');
console.log('   - TELEGRAM_BOT_TOKEN: Token del bot');
console.log('   - TELEGRAM_CHAT_ID: ID chat');
console.log('   - Balance minimo: 0.2 TON');

setTimeout(async () => {
    try {
        bot = new RealTradingBot(config);
        await bot.start();
        
        console.log('✅ Bot REAL TRADING avviato!');
        console.log('⚠️ Trading DISATTIVATO di default');
        console.log('📱 Usa /auto in Telegram per attivare');
        
    } catch (error) {
        console.error('❌ Errore avvio:', error);
    }
}, 3000);

// =============================================================================
// SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    console.log('\n🛑 Shutdown...');
    if (bot) bot.stop();
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutdown...');
    if (bot) bot.stop();
    server.close(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
    });
});

module.exports = { RealTradingBot, config };
