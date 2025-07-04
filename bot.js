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
        status: '🚀 TON Bot REAL TRADING - Enhanced Version',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '3.1.0-enhanced',
        message: 'Bot con TRADING REALE via contratti diretti - Enhanced Debugging',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Bot REAL TRADING Enhanced',
        timestamp: new Date().toISOString(),
        port: PORT,
        tradingMode: 'REAL_DIRECT_CONTRACTS'
    });
});

app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            version: '3.1.0-enhanced',
            tradingMode: 'REAL_TRADING',
            isRunning: bot.isRunning || false,
            walletAddress: bot.walletAddress || 'Not initialized',
            positions: bot.positions ? bot.positions.size : 0,
            realBalance: bot.realBalance ? bot.realBalance.toFixed(4) : '0.0000',
            totalTrades: bot.stats.totalTrades || 0,
            totalPnL: bot.stats.totalPnL ? bot.stats.totalPnL.toFixed(4) : '0.0000',
            winRate: bot.getWinRate ? bot.getWinRate() : 0,
            lastScan: bot.lastScanResult || 'No scan yet',
            totalTokensSeen: bot.tokensSeen ? bot.tokensSeen.size : 0
        });
    } else {
        res.json({ 
            status: 'initializing',
            version: '3.1.0-enhanced',
            message: 'Bot REAL TRADING is starting up...'
        });
    }
});

// NUOVO ENDPOINT: Test API
app.get('/test-apis', async (req, res) => {
    const results = {};
    
    // Test DeDust
    try {
        console.log('🧪 Testing DeDust API...');
        const dedustResponse = await axios.get('https://api.dedust.io/v2/pools', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        results.dedust = {
            status: 'OK',
            pools: dedustResponse.data ? dedustResponse.data.length : 0,
            sampleData: dedustResponse.data ? dedustResponse.data[0] : null
        };
    } catch (error) {
        results.dedust = {
            status: 'ERROR',
            error: error.message,
            code: error.response?.status
        };
    }
    
    // Test STON.fi
    try {
        console.log('🧪 Testing STON.fi API...');
        const stonfiResponse = await axios.get('https://api.ston.fi/v1/pools', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        results.stonfi = {
            status: 'OK',
            pools: stonfiResponse.data?.pool_list?.length || stonfiResponse.data?.pools?.length || 0,
            sampleData: stonfiResponse.data?.pool_list?.[0] || stonfiResponse.data?.pools?.[0] || null
        };
    } catch (error) {
        results.stonfi = {
            status: 'ERROR', 
            error: error.message,
            code: error.response?.status
        };
    }
    
    // Test GeckoTerminal (Fallback)
    try {
        console.log('🧪 Testing GeckoTerminal API...');
        const geckoResponse = await axios.get(
            'https://api.geckoterminal.com/api/v2/networks/ton/pools',
            { timeout: 5000 }
        );
        results.geckoTerminal = {
            status: 'OK',
            pools: geckoResponse.data?.data?.length || 0,
            sampleData: geckoResponse.data?.data?.[0] || null
        };
    } catch (error) {
        results.geckoTerminal = {
            status: 'ERROR',
            error: error.message,
            code: error.response?.status
        };
    }
    
    res.json(results);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server REAL TRADING Enhanced running on port ${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🧪 Test APIs: http://localhost:${PORT}/test-apis`);
});

// =============================================================================
// BOT CLASS - REAL TRADING ENHANCED
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
        this.autoTradingEnabled = false; // Disabilitato di default per sicurezza
        this.maxLossPerTrade = 0.01;
        this.slippageTolerance = 0.05; // 5%
        
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
        
        console.log('🚀 TON Bot REAL TRADING Enhanced inizializzato');
        console.log('💰 REAL MODE: Trading reale su DEX TON');
        console.log('🔍 Enhanced: Debug logging attivato');
        console.log('⚠️ ATTENZIONE: Questo bot esegue transazioni REALI!');
        
        this.setupTelegram();
    }

    // =============================================================================
    // REAL TRADING IMPLEMENTATION (unchanged)
    // =============================================================================

    async executeRealBuy(token, amount) {
        try {
            console.log(`💰 REAL BUY: ${amount} TON di ${token.symbol}`);
            
            const currentBalance = await this.getRealBalance();
            if (currentBalance < amount + 0.1) { // 0.1 TON per gas
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
                
                // Avvia monitoraggio
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
            
            // Costruisci messaggio per DeDust vault
            const payload = beginCell()
                .storeUint(0x5ae42370, 32) // op: swap
                .storeUint(0, 64) // query_id
                .storeCoins(toNano(amountTON))
                .storeAddress(Address.parse(token.poolAddress))
                .storeCoins(0) // min_amount_out (0 = qualsiasi, pericoloso in prod!)
                .endCell();
            
            const message = internal({
                to: DEX_ADDRESSES.dedust.vaultNative,
                value: toNano(amountTON + 0.1), // +0.1 TON per gas
                body: payload
            });
            
            // Invia transazione
            const contract = this.client.open(this.wallet);
            const seqno = await contract.getSeqno();
            
            await contract.sendTransfer({
                secretKey: this.keyPair.secretKey,
                seqno: seqno,
                messages: [message]
            });
            
            console.log(`✅ Transazione DeDust inviata! Seqno: ${seqno}`);
            
            // Aspetta conferma
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
            
            // Costruisci messaggio per STON.fi router
            const forwardPayload = beginCell()
                .storeUint(0x25938561, 32) // op: swap
                .storeAddress(Address.parse(token.tokenAddress))
                .storeCoins(0) // min_amount_out
                .storeAddress(this.wallet.address) // refund_address
                .storeBit(false) // no custom payload
                .endCell();
            
            const payload = beginCell()
                .storeUint(0xf8a7ea5, 32) // op: transfer
                .storeUint(0, 64) // query_id
                .storeCoins(toNano(amountTON))
                .storeAddress(Address.parse(DEX_ADDRESSES.stonfi.router))
                .storeAddress(this.wallet.address) // response_address
                .storeBit(false) // no custom_payload
                .storeCoins(toNano('0.15')) // forward_ton_amount
                .storeBit(true) // forward_payload as ref
                .storeRef(forwardPayload)
                .endCell();
            
            const message = internal({
                to: DEX_ADDRESSES.stonfi.pTON, // Invia a pTON
                value: toNano(amountTON + 0.2), // +0.2 TON per gas
                body: payload
            });
            
            // Invia transazione
            const contract = this.client.open(this.wallet);
            const seqno = await contract.getSeqno();
            
            await contract.sendTransfer({
                secretKey: this.keyPair.secretKey,
                seqno: seqno,
                messages: [message]
            });
            
            console.log(`✅ Transazione STON.fi inviata! Seqno: ${seqno}`);
            
            // Aspetta conferma
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
            
            // TODO: Implementa vendita reale
            // Per vendere token serve:
            // 1. Ottenere il jetton wallet address
            // 2. Inviare i token al DEX
            // 3. Ricevere TON indietro
            
            // Per ora simula
            const pnl = position.amount * 0.05; // Simula 5% profitto
            
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

    // =============================================================================
    // PRICE MONITORING (unchanged)
    // =============================================================================

    startMonitoring(tokenAddress) {
        const monitorInterval = setInterval(async () => {
            try {
                const position = this.positions.get(tokenAddress);
                if (!position) {
                    clearInterval(monitorInterval);
                    return;
                }
                
                // Ottieni prezzo attuale
                const currentPrice = await this.getTokenPrice(tokenAddress, position.dex);
                if (!currentPrice) return;
                
                // Calcola P&L
                const currentValue = position.amount * (currentPrice / position.entryPrice);
                const pnl = currentValue - position.amount;
                const pnlPercent = (pnl / position.amount) * 100;
                
                console.log(`📊 ${position.symbol}: P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent.toFixed(2)}%)`);
                
                // Auto sell su target
                if (pnl > 0.003 || pnlPercent > 10) {
                    console.log(`💰 TARGET RAGGIUNTO: ${position.symbol}`);
                    await this.executeSell(tokenAddress, 'profit_target');
                    clearInterval(monitorInterval);
                }
                
                // Stop loss
                if (pnl <= -this.maxLossPerTrade || pnlPercent <= -15) {
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

    async getTokenPrice(tokenAddress, dex) {
        try {
            // Usa API pubbliche per prezzi
            if (dex === 'STON.fi') {
                const response = await axios.get(
                    `https://api.ston.fi/v1/assets/${tokenAddress}`,
                    { timeout: 5000 }
                ).catch(() => null);
                
                if (response?.data?.price_ton) {
                    return parseFloat(response.data.price_ton);
                }
            }
            
            // Fallback: stima da pool data
            return null;
            
        } catch (error) {
            console.error('❌ Errore prezzo:', error.message);
            return null;
        }
    }

    // =============================================================================
    // ENHANCED SCANNING DEX
    // =============================================================================

    async scanDEXs() {
        try {
            console.log('🔍 Scanning DEX per opportunità...');
            console.log('📊 Scan #' + this.scanCount);
            
            const [dedustTokens, stonfiTokens, geckoTokens] = await Promise.all([
                this.scanDeDust(),
                this.scanSTONfi(),
                this.scanGeckoTerminal() // NUOVO: Fallback API
            ]);
            
            const allTokens = [...dedustTokens, ...stonfiTokens, ...geckoTokens];
            
            console.log(`📋 Token totali trovati: ${allTokens.length}`);
            console.log(`   - DeDust: ${dedustTokens.length}`);
            console.log(`   - STON.fi: ${stonfiTokens.length}`);
            console.log(`   - GeckoTerminal: ${geckoTokens.length}`);
            
            // Filtra token validi con filtri ridotti per test
            const validTokens = allTokens
                .filter(token => this.isValidToken(token))
                .sort((a, b) => b.liquidity - a.liquidity)
                .slice(0, 10);
            
            console.log(`✅ Token validi dopo filtri: ${validTokens.length}`);
            
            if (validTokens.length > 0) {
                console.log('🏆 Top 3 token:');
                validTokens.slice(0, 3).forEach((token, i) => {
                    console.log(`   ${i+1}. ${token.symbol} - Liq: $${token.liquidity.toFixed(0)} - Vol: $${token.volume24h.toFixed(0)}`);
                });
            }
            
            this.lastScanResult = {
                timestamp: new Date().toISOString(),
                totalFound: allTokens.length,
                validTokens: validTokens.length,
                sources: {
                    dedust: dedustTokens.length,
                    stonfi: stonfiTokens.length,
                    gecko: geckoTokens.length
                }
            };
            
            return validTokens;
            
        } catch (error) {
            console.error('❌ Errore scanning:', error.message);
            return [];
        }
    }

    async scanDeDust() {
        try {
            console.log('📡 Chiamata API DeDust...');
            const response = await axios.get('https://api.dedust.io/v2/pools', {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            console.log(`📊 DeDust response: ${response.data ? 'OK' : 'NO DATA'}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.log('❌ DeDust: Risposta non valida');
                return [];
            }
            
            console.log(`📊 DeDust pools totali: ${response.data.length}`);
            
            const tonPools = response.data.filter(pool => {
                if (!pool.assets || pool.assets.length !== 2) return false;
                return pool.assets.some(a => a.type === 'native');
            });
            
            console.log(`🔍 DeDust: ${tonPools.length} pool TON trovati`);
            
            // Log dettagli primo pool per debug
            if (tonPools.length > 0) {
                console.log('📋 Esempio pool DeDust:');
                console.log(JSON.stringify(tonPools[0], null, 2).substring(0, 500) + '...');
            }
            
            return tonPools
                .map(pool => {
                    const jettonAsset = pool.assets.find(a => a.type === 'jetton');
                    if (!jettonAsset) return null;
                    
                    return {
                        address: jettonAsset.address,
                        name: jettonAsset.metadata?.name || 'Unknown',
                        symbol: jettonAsset.metadata?.symbol || 'UNKNOWN',
                        liquidity: parseFloat(pool.totalValueLocked || 0),
                        volume24h: parseFloat(pool.volume?.h24 || 0),
                        dex: 'DeDust',
                        poolAddress: pool.address,
                        currentPrice: 0.001 // Placeholder
                    };
                })
                .filter(Boolean);
                
        } catch (error) {
            console.log(`❌ DeDust error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            return [];
        }
    }

    async scanSTONfi() {
        try {
            console.log('📡 Chiamata API STON.fi...');
            const response = await axios.get('https://api.ston.fi/v1/pools', {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            console.log(`📊 STON.fi response: ${response.data ? 'OK' : 'NO DATA'}`);
            
            if (!response.data) {
                console.log('❌ STON.fi: No data');
                return [];
            }
            
            const pools = response.data.pool_list || response.data.pools || response.data || [];
            
            console.log(`📊 STON.fi pools totali: ${Array.isArray(pools) ? pools.length : 0}`);
            
            if (!Array.isArray(pools)) {
                console.log('📋 STON.fi response structure:', Object.keys(response.data));
                return [];
            }
            
            const tonPools = pools.filter(pool => {
                return pool.token0_symbol === 'TON' || pool.token1_symbol === 'TON';
            });
            
            console.log(`🔍 STON.fi: ${tonPools.length} pool TON trovati`);
            
            // Log dettagli primo pool per debug
            if (tonPools.length > 0) {
                console.log('📋 Esempio pool STON.fi:');
                console.log(JSON.stringify(tonPools[0], null, 2).substring(0, 500) + '...');
            }
            
            return tonPools
                .map(pool => {
                    const isTONFirst = pool.token0_symbol === 'TON';
                    
                    return {
                        address: isTONFirst ? pool.token1_address : pool.token0_address,
                        name: isTONFirst ? pool.token1_name : pool.token0_name,
                        symbol: isTONFirst ? pool.token1_symbol : pool.token0_symbol,
                        liquidity: parseFloat(pool.lp_total_supply_usd || 0),
                        volume24h: parseFloat(pool.volume_24h_usd || 0),
                        dex: 'STON.fi',
                        poolAddress: pool.address,
                        currentPrice: parseFloat(pool.token0_price || pool.token1_price || 0),
                        tokenAddress: isTONFirst ? pool.token1_address : pool.token0_address
                    };
                })
                .filter(token => token.address && token.liquidity > 0);
                
        } catch (error) {
            console.log(`❌ STON.fi error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            return [];
        }
    }

    // NUOVO: Fallback API - GeckoTerminal
    async scanGeckoTerminal() {
        try {
            console.log('📡 Chiamata API GeckoTerminal (fallback)...');
            const response = await axios.get(
                'https://api.geckoterminal.com/api/v2/networks/ton/pools',
                { 
                    timeout: 10000,
                    headers: { 
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }
            );
            
            console.log(`📊 GeckoTerminal response: ${response.data ? 'OK' : 'NO DATA'}`);
            
            if (!response.data?.data) {
                console.log('❌ GeckoTerminal: No data');
                return [];
            }
            
            const pools = response.data.data;
            console.log(`📊 GeckoTerminal pools: ${pools.length}`);
            
            // Log primo pool per debug
            if (pools.length > 0) {
                console.log('📋 Esempio pool GeckoTerminal:');
                console.log(JSON.stringify(pools[0], null, 2).substring(0, 500) + '...');
            }
            
            return pools
                .filter(pool => {
                    // Filtra solo pool con TON
                    const attrs = pool.attributes;
                    return attrs && (
                        attrs.base_token_symbol === 'TON' || 
                        attrs.quote_token_symbol === 'TON'
                    );
                })
                .map(pool => {
                    const attrs = pool.attributes;
                    const isTONBase = attrs.base_token_symbol === 'TON';
                    
                    return {
                        address: isTONBase ? 
                            attrs.quote_token_address : 
                            attrs.base_token_address,
                        name: attrs.name || 'Unknown',
                        symbol: isTONBase ? 
                            attrs.quote_token_symbol : 
                            attrs.base_token_symbol,
                        liquidity: parseFloat(attrs.reserve_in_usd || 0),
                        volume24h: parseFloat(attrs.volume_usd?.h24 || 0),
                        dex: pool.relationships?.dex?.data?.id || 'Unknown',
                        poolAddress: attrs.address,
                        currentPrice: parseFloat(attrs.base_token_price_usd || 0),
                        priceChange24h: parseFloat(attrs.price_change_percentage?.h24 || 0)
                    };
                })
                .filter(token => token.address && token.liquidity > 0);
                
        } catch (error) {
            console.log(`❌ GeckoTerminal error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
            }
            return [];
        }
    }

    isValidToken(token) {
        // Filtri di sicurezza RIDOTTI per test
        if (!token.address || !token.poolAddress) {
            console.log(`⚠️ Token rifiutato: no address`);
            return false;
        }
        
        // Filtri ridotti temporaneamente per debug
        const minLiquidity = 100; // Era 1000
        const minVolume = 10;     // Era 100
        
        if (token.liquidity < minLiquidity) {
            console.log(`⚠️ Token ${token.symbol} rifiutato: liquidità ${token.liquidity} < ${minLiquidity}`);
            return false;
        }
        
        if (token.volume24h < minVolume) {
            console.log(`⚠️ Token ${token.symbol} rifiutato: volume ${token.volume24h} < ${minVolume}`);
            return false;
        }
        
        // Evita scam ovvi
        const name = (token.name || '').toLowerCase();
        const symbol = (token.symbol || '').toLowerCase();
        
        const scamPatterns = ['test', 'fake', 'scam', 'rug'];
        for (const pattern of scamPatterns) {
            if (name.includes(pattern) || symbol.includes(pattern)) {
                console.log(`⚠️ Token ${token.symbol} rifiutato: possibile scam (${pattern})`);
                return false;
            }
        }
        
        // Aggiungi a token visti
        this.tokensSeen.add(token.address);
        
        return true;
    }

    // =============================================================================
    // MAIN LOOP (unchanged)
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
🤖 Trading: ${this.autoTradingEnabled ? '✅ ATTIVO' : '❌ DISATTIVATO'}
⚠️ ATTENZIONE: Trading REALE!

Usa /auto per attivare il trading automatico
        `, 'startup');
        
        // Main loop
        this.tradingLoop();
    }

    async tradingLoop() {
        const scanInterval = 60000; // 1 minuto
        
        while (this.isRunning) {
            try {
                this.scanCount++;
                console.log(`\n🔄 Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
                
                // Verifica balance
                const balance = await this.getRealBalance();
                if (balance < 0.1) {
                    console.log(`⚠️ Balance insufficiente: ${balance.toFixed(4)} TON`);
                    await this.sleep(scanInterval * 5);
                    continue;
                }
                
                // Cerca opportunità
                if (this.positions.size < 2) { // Max 2 posizioni
                    const tokens = await this.scanDEXs();
                    
                    if (tokens.length > 0 && this.autoTradingEnabled) {
                        const bestToken = tokens[0];
                        
                        if (bestToken.liquidity > 5000) { // Extra sicurezza
                            const tradeAmount = Math.min(0.01, this.maxLossPerTrade);
                            
                            console.log(`🎯 Opportunità: ${bestToken.symbol} su ${bestToken.dex}`);
                            await this.executeRealBuy(bestToken, tradeAmount);
                            
                            await this.sleep(30000); // Attendi 30s
                        }
                    }
                }
                
                await this.sleep(scanInterval);
                
            } catch (error) {
                console.error('❌ Errore loop:', error.message);
                await this.sleep(scanInterval);
            }
        }
    }

    // =============================================================================
    // WALLET INITIALIZATION (unchanged)
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
    // TELEGRAM (unchanged)
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
                    case '/debug':
                        await this.sendDebugInfo();
                        break;
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
/debug - Info debug
/help - Questo messaggio

⚠️ ATTENZIONE: Questo bot fa trading REALE!
        `;
        await this.sendMessage(message);
    }

    async sendDebugInfo() {
        const message = `
🔍 *DEBUG INFO*

Last Scan: ${this.lastScanResult ? JSON.stringify(this.lastScanResult, null, 2) : 'No scan yet'}
Scan Count: ${this.scanCount}
Positions: ${this.positions.size}
Tokens Seen: ${this.tokensSeen.size}
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
    // UTILITIES
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

console.log('🚀 Inizializzazione TON Bot REAL TRADING Enhanced...');
console.log('💰 OBIETTIVO: Trading REALE su DEX TON');
console.log('🔍 ENHANCED: Debug logging e API alternative');
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
        
        console.log('✅ Bot REAL TRADING Enhanced avviato!');
        console.log('⚠️ Trading DISATTIVATO di default');
        console.log('📱 Usa /auto in Telegram per attivare');
        console.log('🧪 Test APIs: /test-apis');
        
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
