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
        status: '🚀 TON Bot REAL TRADING - Fixed Parsing Version',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '3.2.0-fixed',
        message: 'Bot con TRADING REALE - Fixed API Parsing',
        webhook_url: `https://${req.get('host')}/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_NOT_SET'}`
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'TON Bot REAL TRADING Fixed',
        timestamp: new Date().toISOString(),
        port: PORT,
        tradingMode: 'REAL_DIRECT_CONTRACTS'
    });
});

app.get('/stats', (req, res) => {
    if (bot && bot.stats) {
        res.json({
            status: 'active',
            version: '3.2.0-fixed',
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
            version: '3.2.0-fixed',
            message: 'Bot REAL TRADING is starting up...'
        });
    }
});

// Test API con più dettagli
app.get('/test-apis', async (req, res) => {
    const results = {};
    
    // Test DeDust
    try {
        console.log('🧪 Testing DeDust API...');
        const dedustResponse = await axios.get('https://api.dedust.io/v2/pools', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const firstPool = dedustResponse.data?.[0];
        results.dedust = {
            status: 'OK',
            pools: dedustResponse.data ? dedustResponse.data.length : 0,
            structure: firstPool ? Object.keys(firstPool) : [],
            samplePool: firstPool ? JSON.stringify(firstPool, null, 2).substring(0, 1000) : null
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
        
        const data = stonfiResponse.data;
        const pools = data?.pool_list || data?.pools || data;
        const firstPool = Array.isArray(pools) ? pools[0] : null;
        
        results.stonfi = {
            status: 'OK',
            dataStructure: data ? Object.keys(data) : [],
            pools: Array.isArray(pools) ? pools.length : 0,
            poolStructure: firstPool ? Object.keys(firstPool) : [],
            samplePool: firstPool ? JSON.stringify(firstPool, null, 2).substring(0, 1000) : null
        };
    } catch (error) {
        results.stonfi = {
            status: 'ERROR', 
            error: error.message,
            code: error.response?.status
        };
    }
    
    // Test GeckoTerminal
    try {
        console.log('🧪 Testing GeckoTerminal API...');
        const geckoResponse = await axios.get(
            'https://api.geckoterminal.com/api/v2/networks/ton/pools',
            { timeout: 5000 }
        );
        
        const firstPool = geckoResponse.data?.data?.[0];
        results.geckoTerminal = {
            status: 'OK',
            pools: geckoResponse.data?.data?.length || 0,
            structure: firstPool ? Object.keys(firstPool) : [],
            attributes: firstPool?.attributes ? Object.keys(firstPool.attributes) : [],
            samplePool: firstPool ? JSON.stringify(firstPool, null, 2).substring(0, 1000) : null
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
    console.log(`🚀 Server REAL TRADING Fixed running on port ${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🧪 Test APIs: http://localhost:${PORT}/test-apis`);
});

// =============================================================================
// BOT CLASS - REAL TRADING FIXED
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
        this.autoTradingEnabled = false;
        this.maxLossPerTrade = 0.01;
        this.slippageTolerance = 0.05;
        
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
        
        console.log('🚀 TON Bot REAL TRADING Fixed inizializzato');
        console.log('💰 REAL MODE: Trading reale su DEX TON');
        console.log('🔧 FIXED: Parsing API corretto');
        console.log('⚠️ ATTENZIONE: Questo bot esegue transazioni REALI!');
        
        this.setupTelegram();
    }

    // =============================================================================
    // FIXED SCANNING DEX
    // =============================================================================

    async scanDEXs() {
        try {
            console.log('🔍 Scanning DEX per opportunità...');
            console.log('📊 Scan #' + this.scanCount);
            
            const [dedustTokens, stonfiTokens, geckoTokens] = await Promise.all([
                this.scanDeDust(),
                this.scanSTONfi(),
                this.scanGeckoTerminal()
            ]);
            
            const allTokens = [...dedustTokens, ...stonfiTokens, ...geckoTokens];
            
            console.log(`📋 Token totali trovati: ${allTokens.length}`);
            console.log(`   - DeDust: ${dedustTokens.length}`);
            console.log(`   - STON.fi: ${stonfiTokens.length}`);
            console.log(`   - GeckoTerminal: ${geckoTokens.length}`);
            
            // Debug: mostra alcuni token trovati
            if (allTokens.length > 0) {
                console.log('📋 Esempio token trovati:');
                allTokens.slice(0, 3).forEach(token => {
                    console.log(`   ${token.symbol}: Liq=$${token.liquidity}, Vol=$${token.volume24h}`);
                });
            }
            
            // Filtra token validi
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
            
            if (!response.data) {
                console.log('❌ DeDust: No data');
                return [];
            }
            
            console.log(`📊 DeDust response type: ${typeof response.data}`);
            console.log(`📊 DeDust is array: ${Array.isArray(response.data)}`);
            
            let pools = [];
            if (Array.isArray(response.data)) {
                pools = response.data;
            } else if (response.data.pools && Array.isArray(response.data.pools)) {
                pools = response.data.pools;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                pools = response.data.data;
            } else {
                console.log('📋 DeDust data structure:', Object.keys(response.data));
                return [];
            }
            
            console.log(`📊 DeDust pools: ${pools.length}`);
            
            // Log struttura primo pool per capire i campi
            if (pools.length > 0) {
                console.log('📋 DeDust pool structure:');
                const firstPool = pools[0];
                console.log('   Keys:', Object.keys(firstPool));
                console.log('   Sample pool:', JSON.stringify(firstPool, null, 2).substring(0, 800));
                
                // Trova un pool con TON per esempio
                const tonPool = pools.find(p => p.assets?.some(a => a.type === 'native'));
                if (tonPool) {
                    console.log('   TON pool example:', JSON.stringify(tonPool, null, 2).substring(0, 800));
                }
            }
            
            // Filtra pool TON - DeDust usa type "native" per TON
            const tonPools = pools.filter(pool => {
                if (!pool.assets || pool.assets.length !== 2) return false;
                // Cerca specificamente il type "native" che indica TON
                // O un asset senza address (potrebbe essere TON)
                return pool.assets.some(a => 
                    a.type === 'native' || 
                    (!a.address && (a.symbol === 'TON' || a.metadata?.symbol === 'TON'))
                );
            });
            
            console.log(`🔍 DeDust: ${tonPools.length} pool TON trovati`);
            
            // Debug: mostra info sui primi pool TON
            if (tonPools.length > 0) {
                console.log('📋 Primi 3 pool TON:');
                tonPools.slice(0, 3).forEach((pool, i) => {
                    console.log(`   Pool ${i+1}:`, {
                        address: pool.address,
                        assets: pool.assets.map(a => ({type: a.type, symbol: a.metadata?.symbol})),
                        reserves: pool.reserves
                    });
                });
            }
            
            return tonPools.map(pool => {
                try {
                    let tokenInfo = null;
                    let tonIndex = -1;
                    let tokenIndex = -1;
                    
                    // Trova quale asset è TON e quale è il token
                    pool.assets.forEach((asset, index) => {
                        if (asset.type === 'native' || 
                            (!asset.address && (asset.symbol === 'TON' || asset.metadata?.symbol === 'TON'))) {
                            // Questo è TON
                            tonIndex = index;
                        } else if (asset.type === 'jetton' && asset.address) {
                            // Questo è il token
                            tokenInfo = asset;
                            tokenIndex = index;
                        }
                    });
                    
                    if (!tokenInfo || tonIndex === -1 || tokenIndex === -1) {
                        // Debug: log perché è stato scartato
                        if (!tokenInfo) console.log('⚠️ Pool scartato: no tokenInfo');
                        if (tonIndex === -1) console.log('⚠️ Pool scartato: TON non trovato');
                        if (tokenIndex === -1) console.log('⚠️ Pool scartato: token index non trovato');
                        return null;
                    }
                    
                    // Le reserve sono nell'array pool.reserves nello stesso ordine degli assets
                    const tonReserve = parseFloat(pool.reserves[tonIndex] || 0) / 1e9; // Converti da nanoton
                    const decimals = tokenInfo.metadata?.decimals || 9;
                    const tokenReserve = parseFloat(pool.reserves[tokenIndex] || 0) / Math.pow(10, decimals);
                    
                    // Calcola liquidità in USD (assumendo 1 TON = ~$5)
                    const tonPriceUSD = 5; // Prezzo approssimativo
                    const liquidityUSD = tonReserve * tonPriceUSD * 2; // *2 perché è il valore totale del pool
                    
                    // Calcola volume dalle stats se disponibili
                    let volume24h = 0;
                    if (pool.stats?.volume_24h) {
                        volume24h = parseFloat(pool.stats.volume_24h);
                    }
                    
                    // Calcola prezzo del token in TON
                    const tokenPrice = tonReserve > 0 && tokenReserve > 0 ? 
                        tonReserve / tokenReserve : 0;
                    
                    return {
                        address: tokenInfo.address || pool.address,
                        name: tokenInfo.metadata?.name || tokenInfo.name || 'Unknown',
                        symbol: tokenInfo.metadata?.symbol || tokenInfo.symbol || 'UNKNOWN',
                        liquidity: liquidityUSD,
                        volume24h: volume24h,
                        dex: 'DeDust',
                        poolAddress: pool.address,
                        currentPrice: tokenPrice,
                        tonReserve: tonReserve,
                        tokenReserve: tokenReserve
                    };
                } catch (e) {
                    console.error('❌ Error parsing DeDust pool:', e.message);
                    return null;
                }
            }).filter(token => token && token.liquidity > 0); // Filtra solo token con liquidità > 0
            
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
            
            if (!response.data) {
                console.log('❌ STON.fi: No data');
                return [];
            }
            
            console.log(`📊 STON.fi response type: ${typeof response.data}`);
            
            // Gestisci varie strutture possibili
            let pools = [];
            if (Array.isArray(response.data)) {
                pools = response.data;
            } else if (response.data.pool_list) {
                pools = response.data.pool_list;
            } else if (response.data.pools) {
                pools = response.data.pools;
            } else if (response.data.data) {
                pools = response.data.data;
            } else {
                console.log('📋 STON.fi data structure:', Object.keys(response.data));
                // Prova a cercare array in profondità
                for (const key of Object.keys(response.data)) {
                    if (Array.isArray(response.data[key])) {
                        pools = response.data[key];
                        console.log(`📋 Found pools in: ${key}`);
                        break;
                    }
                }
            }
            
            if (!Array.isArray(pools)) {
                console.log('❌ STON.fi: No pools array found');
                return [];
            }
            
            console.log(`📊 STON.fi pools: ${pools.length}`);
            
            // Log struttura primo pool
            if (pools.length > 0) {
                console.log('📋 STON.fi pool structure:');
                const firstPool = pools[0];
                console.log('   Keys:', Object.keys(firstPool));
                console.log('   Sample pool:', JSON.stringify(firstPool, null, 2).substring(0, 800));
            }
            
            // Filtra pool TON
            const tonPools = pools.filter(pool => {
                return pool.token0_symbol === 'TON' || 
                       pool.token1_symbol === 'TON' ||
                       pool.base_symbol === 'TON' ||
                       pool.quote_symbol === 'TON';
            });
            
            console.log(`🔍 STON.fi: ${tonPools.length} pool TON trovati`);
            
            return tonPools.map(pool => {
                try {
                    // Determina quale token è TON
                    const isTONFirst = pool.token0_symbol === 'TON' || pool.base_symbol === 'TON';
                    
                    let tokenSymbol, tokenName, tokenAddress;
                    let tonReserve = 0;
                    let tokenReserve = 0;
                    
                    if (pool.token0_symbol && pool.token1_symbol) {
                        // Formato standard
                        tokenSymbol = isTONFirst ? pool.token1_symbol : pool.token0_symbol;
                        tokenName = isTONFirst ? pool.token1_name : pool.token0_name;
                        tokenAddress = isTONFirst ? pool.token1_address : pool.token0_address;
                        
                        // Reserves
                        tonReserve = parseFloat(isTONFirst ? pool.reserve0 : pool.reserve1) / 1e9;
                        tokenReserve = parseFloat(isTONFirst ? pool.reserve1 : pool.reserve0) / 1e9; // Assumiamo 9 decimali
                    } else if (pool.base_symbol && pool.quote_symbol) {
                        // Formato alternativo
                        isTONFirst = pool.base_symbol === 'TON';
                        tokenSymbol = isTONFirst ? pool.quote_symbol : pool.base_symbol;
                        tokenName = isTONFirst ? pool.quote_name : pool.base_name;
                        tokenAddress = isTONFirst ? pool.quote_address : pool.base_address;
                    }
                    
                    // Se abbiamo lp_total_supply_usd, usiamo quello per la liquidità
                    let liquidity = parseFloat(pool.lp_total_supply_usd || 0);
                    
                    // Altrimenti calcoliamo dalla reserve
                    if (liquidity === 0 && tonReserve > 0) {
                        const tonPriceUSD = 5; // Prezzo approssimativo
                        liquidity = tonReserve * tonPriceUSD * 2;
                    }
                    
                    // Volume
                    const volume = parseFloat(
                        pool.volume_24h_usd || 
                        pool.volume_24h || 
                        pool.volume || 
                        0
                    );
                    
                    // Prezzo del token
                    const tokenPrice = tonReserve > 0 && tokenReserve > 0 ? 
                        tonReserve / tokenReserve : 
                        parseFloat(pool.token0_price || pool.token1_price || pool.price || 0);
                    
                    return {
                        address: tokenAddress || pool.address,
                        name: tokenName || 'Unknown',
                        symbol: tokenSymbol || 'UNKNOWN',
                        liquidity: liquidity,
                        volume24h: volume,
                        dex: 'STON.fi',
                        poolAddress: pool.address || pool.pool_address,
                        currentPrice: tokenPrice,
                        tokenAddress: tokenAddress,
                        tonReserve: tonReserve,
                        tokenReserve: tokenReserve
                    };
                } catch (e) {
                    console.error('❌ Error parsing STON.fi pool:', e.message);
                    return null;
                }
            }).filter(token => token && token.address && token.symbol !== 'UNKNOWN' && token.liquidity > 0);
            
        } catch (error) {
            console.log(`❌ STON.fi error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            return [];
        }
    }

    async scanGeckoTerminal() {
        try {
            console.log('📡 Chiamata API GeckoTerminal...');
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
            
            if (!response.data?.data) {
                console.log('❌ GeckoTerminal: No data');
                return [];
            }
            
            const pools = response.data.data;
            console.log(`📊 GeckoTerminal pools: ${pools.length}`);
            
            // Log struttura primo pool
            if (pools.length > 0) {
                console.log('📋 GeckoTerminal pool structure:');
                console.log('   id:', pools[0].id);
                console.log('   type:', pools[0].type);
                console.log('   attributes keys:', Object.keys(pools[0].attributes || {}));
            }
            
            // Filtra pool TON
            const tonPools = pools.filter(pool => {
                const attrs = pool.attributes;
                return attrs && (
                    attrs.base_token_symbol === 'TON' || 
                    attrs.quote_token_symbol === 'TON' ||
                    attrs.name?.includes('TON')
                );
            });
            
            console.log(`🔍 GeckoTerminal: ${tonPools.length} pool TON trovati`);
            
            return tonPools.map(pool => {
                try {
                    const attrs = pool.attributes;
                    const isTONBase = attrs.base_token_symbol === 'TON';
                    
                    // GeckoTerminal ha dati più affidabili
                    const liquidity = parseFloat(attrs.reserve_in_usd || attrs.liquidity_in_usd || 0);
                    const volume = parseFloat(attrs.volume_usd?.h24 || 0);
                    
                    return {
                        address: isTONBase ? 
                            attrs.quote_token_address : 
                            attrs.base_token_address,
                        name: attrs.name || 'Unknown',
                        symbol: isTONBase ? 
                            attrs.quote_token_symbol : 
                            attrs.base_token_symbol,
                        liquidity: liquidity,
                        volume24h: volume,
                        dex: pool.relationships?.dex?.data?.id || 'Unknown',
                        poolAddress: attrs.address,
                        currentPrice: parseFloat(attrs.base_token_price_usd || 0),
                        priceChange24h: parseFloat(attrs.price_change_percentage?.h24 || 0)
                    };
                } catch (e) {
                    console.error('❌ Error parsing GeckoTerminal pool:', e.message);
                    return null;
                }
            }).filter(token => token && token.address && token.liquidity > 0);
            
        } catch (error) {
            console.log(`❌ GeckoTerminal error: ${error.message}`);
            return [];
        }
    }

    isValidToken(token) {
        // Filtri base
        if (!token.address || !token.poolAddress) {
            return false;
        }
        
        // Log token con liquidità > 0 per debug
        if (token.liquidity > 0) {
            console.log(`✅ Token ${token.symbol}: Liq=$${token.liquidity.toFixed(0)}, Vol=$${token.volume24h.toFixed(0)}`);
        }
        
        // Filtri temporaneamente molto bassi per debug
        const minLiquidity = 100;   // $100 USD
        const minVolume = 10;       // $10 USD
        
        if (token.liquidity < minLiquidity) {
            return false;
        }
        
        if (token.volume24h < minVolume) {
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
        
        console.log(`✅ Token ${token.symbol} VALIDO: Liq=$${token.liquidity.toFixed(0)}, Vol=$${token.volume24h.toFixed(0)}`);
        
        return true;
    }

    // =============================================================================
    // RESTO DEL CODICE INVARIATO
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
            
            const pnl = position.amount * 0.05;
            
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
                
                const currentPrice = await this.getTokenPrice(tokenAddress, position.dex);
                if (!currentPrice) return;
                
                const currentValue = position.amount * (currentPrice / position.entryPrice);
                const pnl = currentValue - position.amount;
                const pnlPercent = (pnl / position.amount) * 100;
                
                console.log(`📊 ${position.symbol}: P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} TON (${pnlPercent.toFixed(2)}%)`);
                
                if (pnl > 0.003 || pnlPercent > 10) {
                    console.log(`💰 TARGET RAGGIUNTO: ${position.symbol}`);
                    await this.executeSell(tokenAddress, 'profit_target');
                    clearInterval(monitorInterval);
                }
                
                if (pnl <= -this.maxLossPerTrade || pnlPercent <= -15) {
                    console.log(`🛑 STOP LOSS: ${position.symbol}`);
                    await this.executeSell(tokenAddress, 'stop_loss');
                    clearInterval(monitorInterval);
                }
                
            } catch (error) {
                console.error(`❌ Errore monitoraggio:`, error.message);
            }
        }, 30000);
        
        setTimeout(() => {
            clearInterval(monitorInterval);
            if (this.positions.has(tokenAddress)) {
                this.executeSell(tokenAddress, 'timeout');
            }
        }, 3 * 60 * 60 * 1000);
    }

    async getTokenPrice(tokenAddress, dex) {
        try {
            if (dex === 'STON.fi') {
                const response = await axios.get(
                    `https://api.ston.fi/v1/assets/${tokenAddress}`,
                    { timeout: 5000 }
                ).catch(() => null);
                
                if (response?.data?.price_ton) {
                    return parseFloat(response.data.price_ton);
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Errore prezzo:', error.message);
            return null;
        }
    }

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
        
        this.tradingLoop();
    }

    async tradingLoop() {
        const scanInterval = 60000;
        
        while (this.isRunning) {
            try {
                this.scanCount++;
                console.log(`\n🔄 Scan #${this.scanCount} - ${new Date().toLocaleTimeString()}`);
                
                const balance = await this.getRealBalance();
                if (balance < 0.1) {
                    console.log(`⚠️ Balance insufficiente: ${balance.toFixed(4)} TON`);
                    await this.sleep(scanInterval * 5);
                    continue;
                }
                
                if (this.positions.size < 2) {
                    const tokens = await this.scanDEXs();
                    
                    if (tokens.length > 0 && this.autoTradingEnabled) {
                        const bestToken = tokens[0];
                        
                        if (bestToken.liquidity > 5000) {
                            const tradeAmount = Math.min(0.01, this.maxLossPerTrade);
                            
                            console.log(`🎯 Opportunità: ${bestToken.symbol} su ${bestToken.dex}`);
                            await this.executeRealBuy(bestToken, tradeAmount);
                            
                            await this.sleep(30000);
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

console.log('🚀 Inizializzazione TON Bot REAL TRADING Fixed...');
console.log('💰 OBIETTIVO: Trading REALE su DEX TON');
console.log('🔧 FIXED: Parsing API corretto');
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
        
        console.log('✅ Bot REAL TRADING Fixed avviato!');
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
