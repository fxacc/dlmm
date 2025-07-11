import axios from 'axios';
import { redisClient } from '../config/database.js';
import { TokenPrice, PriceCache } from '../types/lp.js';
import { TOKEN_ADDRESSES, NETWORK } from '../config/solana.js';

export class PriceService {
  private priceCache: PriceCache = {};
  private readonly CACHE_DURATION = 10 * 1000; // 10秒缓存
  private readonly JUPITER_API_URL = 'https://api.jup.ag/price/v2';
  private readonly BIRDEYE_API_URL = 'https://public-api.birdeye.so/defi/price';

  constructor() {
    this.startPriceUpdater();
  }

  /**
   * 获取单个代币价格
   */
  async getTokenPrice(mint: string): Promise<TokenPrice | null> {
    // 先从缓存获取
    const cached = this.priceCache[mint];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }

    // 缓存过期，从API获取
    return await this.fetchTokenPrice(mint);
  }

  /**
   * 获取多个代币价格
   */
  async getTokenPrices(mints: string[]): Promise<{ [mint: string]: TokenPrice }> {
    const results: { [mint: string]: TokenPrice } = {};
    
    // 分批获取价格
    const batchSize = 10;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(mint => this.getTokenPrice(mint))
      );
      
      batch.forEach((mint, index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled' && result.value) {
          results[mint] = result.value;
        }
      });
    }
    
    return results;
  }

  /**
   * 从API获取代币价格
   */
  private async fetchTokenPrice(mint: string): Promise<TokenPrice | null> {
    try {
      // 在测试网环境下，如果启用了模拟数据，返回模拟价格
      if (NETWORK !== 'mainnet-beta' && process.env.ENABLE_MOCK_DATA === 'true') {
        return this.getMockPrice(mint);
      }

      // 优先使用 Jupiter API
      const jupiterPrice = await this.fetchFromJupiter(mint);
      if (jupiterPrice) {
        this.priceCache[mint] = jupiterPrice;
        return jupiterPrice;
      }

      // 备用 Birdeye API
      const birdeyePrice = await this.fetchFromBirdeye(mint);
      if (birdeyePrice) {
        this.priceCache[mint] = birdeyePrice;
        return birdeyePrice;
      }

      // 如果都失败了，在测试网返回模拟价格
      if (NETWORK !== 'mainnet-beta') {
        console.warn(`⚠️  No price found for token: ${mint}, using mock price`);
        return this.getMockPrice(mint);
      }

      console.warn(`⚠️  No price found for token: ${mint}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching price for ${mint}:`, error);
      
      // 错误时在测试网返回模拟价格
      if (NETWORK !== 'mainnet-beta') {
        return this.getMockPrice(mint);
      }
      
      return null;
    }
  }

  /**
   * 从 Jupiter API 获取价格
   */
  private async fetchFromJupiter(mint: string): Promise<TokenPrice | null> {
    try {
      const response = await axios.get(`${this.JUPITER_API_URL}?ids=${mint}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = response.data;
      if (data.data && data.data[mint]) {
        const priceData = data.data[mint];
        return {
          mint,
          symbol: this.getTokenSymbol(mint),
          price: priceData.price,
          source: 'jupiter',
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Jupiter API error for ${mint}:`, error);
      return null;
    }
  }

  /**
   * 从 Birdeye API 获取价格
   */
  private async fetchFromBirdeye(mint: string): Promise<TokenPrice | null> {
    try {
      const response = await axios.get(this.BIRDEYE_API_URL, {
        params: {
          address: mint,
          'x-chain': 'solana'
        },
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || ''
        }
      });

      const data = response.data;
      if (data.success && data.data && data.data.value) {
        return {
          mint,
          symbol: this.getTokenSymbol(mint),
          price: data.data.value,
          source: 'birdeye',
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Birdeye API error for ${mint}:`, error);
      return null;
    }
  }

  /**
   * 获取代币符号
   */
  private getTokenSymbol(mint: string): string {
    const symbolMap: { [key: string]: string } = {};
    
    // 反向映射 TOKEN_ADDRESSES
    Object.entries(TOKEN_ADDRESSES).forEach(([symbol, address]) => {
      symbolMap[address] = symbol;
    });
    
    return symbolMap[mint] || 'UNKNOWN';
  }

  /**
   * 启动价格更新器
   */
  private startPriceUpdater(): void {
    // 每10秒更新一次主要代币价格
    setInterval(async () => {
      const mainTokens = Object.values(TOKEN_ADDRESSES);
      await this.updatePricesInBackground(mainTokens);
    }, 10000);

    console.log('🚀 Price updater started (10s interval)');
  }

  /**
   * 后台更新价格
   */
  private async updatePricesInBackground(mints: string[]): Promise<void> {
    try {
      const promises = mints.map(mint => this.fetchTokenPrice(mint));
      await Promise.allSettled(promises);
      
      // 可选：保存到 Redis
      if (redisClient.isOpen) {
        const cacheKey = 'price_cache';
        await redisClient.setEx(cacheKey, 60, JSON.stringify(this.priceCache));
      }
    } catch (error) {
      console.error('❌ Error updating prices in background:', error);
    }
  }

  /**
   * 获取所有缓存的价格
   */
  getAllCachedPrices(): PriceCache {
    return { ...this.priceCache };
  }

  /**
   * 清除价格缓存
   */
  clearCache(): void {
    this.priceCache = {};
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { total: number; fresh: number; stale: number } {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    
    Object.values(this.priceCache).forEach(price => {
      if (now - price.timestamp < this.CACHE_DURATION) {
        fresh++;
      } else {
        stale++;
      }
    });
    
    return {
      total: Object.keys(this.priceCache).length,
      fresh,
      stale
    };
  }

  /**
   * 获取模拟价格（用于测试网）
   */
  private getMockPrice(mint: string): TokenPrice {
    const symbol = this.getTokenSymbol(mint);
    
    // 模拟价格映射
    const mockPrices: { [key: string]: number } = {
      'SOL': 95.42,
      'USDC': 1.0,
      'USDT': 0.9998,
      'mSOL': 99.87,
      'stSOL': 97.34,
      'BONK': 0.00001247,
      'WIF': 2.35,
      'JUP': 0.85
    };

    // 添加一些随机波动（±2%）
    const basePrice = mockPrices[symbol] || 1.0;
    const volatility = (Math.random() - 0.5) * 0.04; // ±2%
    const price = basePrice * (1 + volatility);

    return {
      mint,
      symbol,
      price: Math.max(0.000001, price), // 确保价格为正
      source: 'meteora', // 标记为模拟数据
      timestamp: Date.now()
    };
  }
}

export const priceService = new PriceService();