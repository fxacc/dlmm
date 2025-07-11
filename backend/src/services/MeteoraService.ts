import { PublicKey } from '@solana/web3.js';
import { connection, NETWORK } from '../config/solana.js';
import { TradingPair, PairRealtimeData } from '../models/TradingPair.js';
import { MeteoraDLMMDiscoveryService, DLMMPoolInfo } from './MeteoraDLMMDiscoveryService.js';
import axios from 'axios';

export class MeteoraService {
  private static instance: MeteoraService;
  private readonly API_BASE_URL = 'https://dlmm-api.meteora.ag';
  private dlmmDiscovery: MeteoraDLMMDiscoveryService;

  private constructor() {
    this.dlmmDiscovery = MeteoraDLMMDiscoveryService.getInstance();
  }

  public static getInstance(): MeteoraService {
    if (!MeteoraService.instance) {
      MeteoraService.instance = new MeteoraService();
    }
    return MeteoraService.instance;
  }

  // 发现可用的 DLMM 池 (针对当前网络)
  async discoverDLMMPools(): Promise<TradingPair[]> {
    try {
      console.log(`🔍 Discovering DLMM pools for ${NETWORK}...`);
      
      const dlmmPools = await this.dlmmDiscovery.discoverDLMMPools();
      
      const tradingPairs: TradingPair[] = dlmmPools.map(pool => ({
        poolAddress: pool.poolAddress,
        tokenAAddress: pool.tokenX,
        tokenBAddress: pool.tokenY,
        tokenASymbol: pool.tokenXSymbol || 'UNKNOWN',
        tokenBSymbol: pool.tokenYSymbol || 'UNKNOWN',
        tokenADecimals: 9, // 默认值，可以后续查询
        tokenBDecimals: 6, // 默认值，可以后续查询
        feeRate: pool.binStep / 10000, // 将 bin step 转换为费率
        isActive: pool.isActive
      }));

      console.log(`✅ Discovered ${tradingPairs.length} DLMM pools on ${NETWORK}`);
      return tradingPairs;
    } catch (error) {
      console.error('❌ Error discovering DLMM pools:', error);
      
      // 如果发现失败，回退到模拟数据
      if (NETWORK === 'devnet') {
        console.log('⚠️ Falling back to devnet mock data...');
        return this.getDevnetMockPairs();
      }
      
      return this.getMockPairs();
    }
  }

  // 获取所有交易对
  async getAllPairs(): Promise<TradingPair[]> {
    try {
      console.log('📊 Fetching all trading pairs from Meteora...');
      
      // 尝试多个可能的API端点
      const possibleEndpoints = [
        '/pair/all',
        '/pairs',
        '/lb-pair/all',
        '/pools',
        '/pool/all'
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${this.API_BASE_URL}${endpoint}`);
          const response = await axios.get(`${this.API_BASE_URL}${endpoint}`);
          
          if (response.data && (response.data.data || Array.isArray(response.data))) {
            const data = response.data.data || response.data;
            
            if (Array.isArray(data) && data.length > 0) {
              console.log(`✅ Found working endpoint: ${endpoint}`);
              
              const pairs: TradingPair[] = data.map((pair: any) => ({
                poolAddress: pair.address || pair.pool_address || pair.pubkey,
                tokenAAddress: pair.mint_x || pair.token_x || pair.base_mint,
                tokenBAddress: pair.mint_y || pair.token_y || pair.quote_mint,
                tokenASymbol: this.extractTokenSymbol(pair, 'A'),
                tokenBSymbol: this.extractTokenSymbol(pair, 'B'),
                tokenADecimals: pair.decimals_x || pair.token_x_decimals || 9,
                tokenBDecimals: pair.decimals_y || pair.token_y_decimals || 6,
                feeRate: pair.fee_rate || pair.bin_step || 0.0025,
                isActive: pair.activated !== false && pair.active !== false
              }));

              console.log(`✅ Retrieved ${pairs.length} trading pairs from ${endpoint}`);
              return pairs;
            }
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed: ${endpointError.message}`);
        }
      }

      throw new Error('No working API endpoint found');
    } catch (error) {
      console.error('❌ Error fetching trading pairs:', error);
      console.log('⚠️  Falling back to mock data for testing...');
      
      // 如果 API 失败，返回模拟数据用于测试
      return this.getMockPairs();
    }
  }

  private extractTokenSymbol(pair: any, position: 'A' | 'B'): string {
    // 尝试从不同字段提取代币符号
    if (position === 'A') {
      return pair.token_x_symbol || pair.base_symbol || pair.name?.split('/')[0] || pair.name?.split('-')[0] || 'TOKEN_A';
    } else {
      return pair.token_y_symbol || pair.quote_symbol || pair.name?.split('/')[1] || pair.name?.split('-')[1] || 'TOKEN_B';
    }
  }

  // 获取交易对实时数据
  async getPairRealtimeData(poolAddress: string): Promise<PairRealtimeData | null> {
    try {
      console.log(`📈 Fetching realtime data for pool: ${poolAddress}`);
      
      // 尝试多个可能的API端点获取池数据
      const possibleEndpoints = [
        `/pair/${poolAddress}`,
        `/pool/${poolAddress}`,
        `/lb-pair/${poolAddress}`,
        `/pairs/${poolAddress}`,
        `/pools/${poolAddress}`
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(`${this.API_BASE_URL}${endpoint}`);
          
          if (response.data && (response.data.data || response.data.pool || response.data)) {
            const data = response.data.data || response.data.pool || response.data;
            
            return {
              poolAddress,
              currentPrice: parseFloat(data.current_price || data.price || data.active_price || '0'),
              tvlUsd: parseFloat(data.total_liquidity || data.tvl || data.liquidity_usd || '0'),
              volume24hUsd: parseFloat(data.volume_24h || data.volume_24h_usd || data.day_volume || '0'),
              fees24hUsd: parseFloat(data.fees_24h || data.fees_24h_usd || data.day_fees || '0'),
              apr: this.calculateAPR(
                parseFloat(data.fees_24h || data.fees_24h_usd || data.day_fees || '0'), 
                parseFloat(data.total_liquidity || data.tvl || data.liquidity_usd || '0')
              ),
              dailyYield: this.calculateDailyYield(
                parseFloat(data.fees_24h || data.fees_24h_usd || data.day_fees || '0'), 
                parseFloat(data.total_liquidity || data.tvl || data.liquidity_usd || '0')
              ),
              priceChange24h: parseFloat(data.price_change_24h || data.price_change || '0'),
              lastUpdated: new Date()
            };
          }
        } catch (endpointError) {
          // 继续尝试下一个端点
          continue;
        }
      }
      
      console.log(`⚠️  No working API endpoint found for ${poolAddress}, using mock data`);
      // 如果所有API都失败，使用模拟数据
      return this.getMockRealtimeData(poolAddress);
    } catch (error) {
      console.error(`❌ Error fetching realtime data for ${poolAddress}:`, error);
      return this.getMockRealtimeData(poolAddress);
    }
  }

  // 批量获取交易对实时数据
  async getBatchRealtimeData(poolAddresses: string[]): Promise<PairRealtimeData[]> {
    try {
      console.log(`📊 Fetching batch realtime data for ${poolAddresses.length} pools`);
      
      const promises = poolAddresses.map(address => this.getPairRealtimeData(address));
      const results = await Promise.allSettled(promises);
      
      const realtimeData: PairRealtimeData[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          realtimeData.push(result.value);
        } else {
          console.warn(`⚠️ Failed to fetch data for pool: ${poolAddresses[index]}`);
        }
      });

      console.log(`✅ Retrieved realtime data for ${realtimeData.length} pools`);
      return realtimeData;
    } catch (error) {
      console.error('❌ Error fetching batch realtime data:', error);
      return [];
    }
  }

  // 计算年化收益率
  private calculateAPR(fees24h: number, tvl: number): number {
    if (tvl === 0) return 0;
    return (fees24h / tvl) * 365 * 100;
  }

  // 计算日化收益率
  private calculateDailyYield(fees24h: number, tvl: number): number {
    if (tvl === 0) return 0;
    return (fees24h / tvl) * 100;
  }

  // 获取 devnet 模拟数据
  private getDevnetMockPairs(): TradingPair[] {
    return [
      {
        poolAddress: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
        tokenAAddress: 'So11111111111111111111111111111111111111112',
        tokenBAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        tokenASymbol: 'SOL',
        tokenBSymbol: 'USDC',
        tokenADecimals: 9,
        tokenBDecimals: 6,
        feeRate: 0.0025,
        isActive: true
      },
      {
        poolAddress: '9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2',
        tokenAAddress: 'So11111111111111111111111111111111111111112',
        tokenBAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        tokenASymbol: 'SOL',
        tokenBSymbol: 'USDC',
        tokenADecimals: 9,
        tokenBDecimals: 6,
        feeRate: 0.01,
        isActive: true
      },
      {
        poolAddress: 'BoeMUkCLHchTD31HdXsbDExuZZfcUppSLpYtV3LZTH6U',
        tokenAAddress: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        tokenBAddress: 'So11111111111111111111111111111111111111112',
        tokenASymbol: 'jitoSOL',
        tokenBSymbol: 'SOL',
        tokenADecimals: 9,
        tokenBDecimals: 9,
        feeRate: 0.0025,
        isActive: true
      },
      {
        poolAddress: 'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq',
        tokenAAddress: 'EgQ3yNtVhJzt9VBoPKvPwdYuaq7fFWKUwB8Rbpg2dEJV',
        tokenBAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        tokenASymbol: 'USDT',
        tokenBSymbol: 'USDC',
        tokenADecimals: 6,
        tokenBDecimals: 6,
        feeRate: 0.0005,
        isActive: true
      }
    ];
  }

  // 获取模拟数据用于测试
  private getMockPairs(): TradingPair[] {
    return [
      {
        poolAddress: 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
        tokenAAddress: 'So11111111111111111111111111111111111111112',
        tokenBAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenASymbol: 'SOL',
        tokenBSymbol: 'USDC',
        tokenADecimals: 9,
        tokenBDecimals: 6,
        feeRate: 0.0025,
        isActive: true
      },
      {
        poolAddress: 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
        tokenAAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        tokenBAddress: 'So11111111111111111111111111111111111111112',
        tokenASymbol: 'mSOL',
        tokenBSymbol: 'SOL',
        tokenADecimals: 9,
        tokenBDecimals: 9,
        feeRate: 0.0025,
        isActive: true
      },
      {
        poolAddress: 'DdpuaJgjB2RptGMnfnCZVmC4vkKsMV6SvRDYgxwTZh5A',
        tokenAAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenBAddress: 'So11111111111111111111111111111111111111112',
        tokenASymbol: 'BONK',
        tokenBSymbol: 'SOL',
        tokenADecimals: 5,
        tokenBDecimals: 9,
        feeRate: 0.0025,
        isActive: true
      },
      {
        poolAddress: 'FQhNLi5xY9YPNwJf8dE8L5HTYKLkJ9ZXQe5JHJ7BWVk',
        tokenAAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        tokenBAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenASymbol: 'USDT',
        tokenBSymbol: 'USDC',
        tokenADecimals: 6,
        tokenBDecimals: 6,
        feeRate: 0.0005,
        isActive: true
      },
      {
        poolAddress: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        tokenAAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        tokenBAddress: 'So11111111111111111111111111111111111111112',
        tokenASymbol: 'JUP',
        tokenBSymbol: 'SOL',
        tokenADecimals: 6,
        tokenBDecimals: 9,
        feeRate: 0.0025,
        isActive: true
      }
    ];
  }

  // 获取模拟实时数据
  getMockRealtimeData(poolAddress: string): PairRealtimeData {
    const mockData: { [key: string]: PairRealtimeData } = {
      'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA': {
        poolAddress,
        currentPrice: 95.42,
        tvlUsd: 2100000,
        volume24hUsd: 450000,
        fees24hUsd: 1125,
        apr: 19.6,
        dailyYield: 0.054,
        priceChange24h: 2.34,
        lastUpdated: new Date()
      },
      'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE': {
        poolAddress,
        currentPrice: 1.045,
        tvlUsd: 1800000,
        volume24hUsd: 320000,
        fees24hUsd: 960,
        apr: 19.5,
        dailyYield: 0.053,
        priceChange24h: -0.12,
        lastUpdated: new Date()
      },
      'DdpuaJgjB2RptGMnfnCZVmC4vkKsMV6SvRDYgxwTZh5A': {
        poolAddress,
        currentPrice: 0.00001247,
        tvlUsd: 980000,
        volume24hUsd: 280000,
        fees24hUsd: 840,
        apr: 31.4,
        dailyYield: 0.086,
        priceChange24h: 15.6,
        lastUpdated: new Date()
      },
      'FQhNLi5xY9YPNwJf8dE8L5HTYKLkJ9ZXQe5JHJ7BWVk': {
        poolAddress,
        currentPrice: 0.9998,
        tvlUsd: 5200000,
        volume24hUsd: 1200000,
        fees24hUsd: 600,
        apr: 4.2,
        dailyYield: 0.012,
        priceChange24h: 0.01,
        lastUpdated: new Date()
      },
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': {
        poolAddress,
        currentPrice: 0.85,
        tvlUsd: 1300000,
        volume24hUsd: 180000,
        fees24hUsd: 540,
        apr: 15.2,
        dailyYield: 0.042,
        priceChange24h: -3.2,
        lastUpdated: new Date()
      }
    };

    return mockData[poolAddress] || {
      poolAddress,
      currentPrice: Math.random() * 100,
      tvlUsd: Math.random() * 1000000,
      volume24hUsd: Math.random() * 500000,
      fees24hUsd: Math.random() * 2000,
      apr: Math.random() * 50,
      dailyYield: Math.random() * 0.1,
      priceChange24h: (Math.random() - 0.5) * 20,
      lastUpdated: new Date()
    };
  }
}