import { TradingPair, PairRealtimeData, TradingPairWithStats } from '../models/TradingPair.js';
import { MeteoraService } from './MeteoraService.js';

export class TradingPairServiceSimple {
  private static instance: TradingPairServiceSimple;
  private meteoraService: MeteoraService;
  private cachedPairs: TradingPair[] = [];
  private cachedRealtimeData: Map<string, PairRealtimeData> = new Map();

  private constructor() {
    this.meteoraService = MeteoraService.getInstance();
  }

  public static getInstance(): TradingPairServiceSimple {
    if (!TradingPairServiceSimple.instance) {
      TradingPairServiceSimple.instance = new TradingPairServiceSimple();
    }
    return TradingPairServiceSimple.instance;
  }

  // 同步交易对数据（从内存缓存）
  async syncTradingPairs(): Promise<void> {
    try {
      console.log('🔄 Syncing trading pairs from Meteora...');
      
      const pairs = await this.meteoraService.getAllPairs();
      this.cachedPairs = pairs;
      
      console.log(`✅ Synced ${pairs.length} trading pairs to memory cache`);
    } catch (error) {
      console.error('❌ Error syncing trading pairs:', error);
      throw error;
    }
  }

  // 获取所有交易对
  async getAllTradingPairs(): Promise<TradingPair[]> {
    return this.cachedPairs;
  }

  // 获取交易对详情
  async getTradingPairByAddress(poolAddress: string): Promise<TradingPair | null> {
    return this.cachedPairs.find(pair => pair.poolAddress === poolAddress) || null;
  }

  // 刷新交易对实时数据
  async refreshRealtimeData(): Promise<void> {
    try {
      console.log('🔄 Refreshing realtime data for all trading pairs...');
      
      if (this.cachedPairs.length === 0) {
        await this.syncTradingPairs();
      }

      const poolAddresses = this.cachedPairs.map(pair => pair.poolAddress);
      const realtimeData = await this.meteoraService.getBatchRealtimeData(poolAddresses);
      
      // 更新缓存
      this.cachedRealtimeData.clear();
      for (const data of realtimeData) {
        this.cachedRealtimeData.set(data.poolAddress, data);
      }
      
      console.log(`✅ Refreshed realtime data for ${realtimeData.length} pairs`);
    } catch (error) {
      console.error('❌ Error refreshing realtime data:', error);
      throw error;
    }
  }

  // 获取带统计数据的交易对
  async getTradingPairsWithStats(): Promise<TradingPairWithStats[]> {
    try {
      if (this.cachedPairs.length === 0) {
        await this.syncTradingPairs();
      }

      // 如果没有实时数据，先获取
      if (this.cachedRealtimeData.size === 0) {
        await this.refreshRealtimeData();
      }

      return this.cachedPairs.map(pair => ({
        ...pair,
        realtimeData: this.cachedRealtimeData.get(pair.poolAddress)
      }));
    } catch (error) {
      console.error('❌ Error getting trading pairs with stats:', error);
      throw error;
    }
  }

  // 获取统计数据
  async getStatistics() {
    const pairs = await this.getTradingPairsWithStats();
    const pairsWithData = pairs.filter(pair => pair.realtimeData);

    if (pairsWithData.length === 0) {
      return {
        totalPairs: 0,
        totalTvl: 0,
        totalVolume24h: 0,
        totalFees24h: 0,
        avgApr: 0,
        topPairsByVolume: [],
        topPairsByApr: []
      };
    }

    const totalTvl = pairsWithData.reduce((sum, pair) => sum + (pair.realtimeData?.tvlUsd || 0), 0);
    const totalVolume24h = pairsWithData.reduce((sum, pair) => sum + (pair.realtimeData?.volume24hUsd || 0), 0);
    const totalFees24h = pairsWithData.reduce((sum, pair) => sum + (pair.realtimeData?.fees24hUsd || 0), 0);
    const avgApr = pairsWithData.reduce((sum, pair) => sum + (pair.realtimeData?.apr || 0), 0) / pairsWithData.length;

    const topPairsByVolume = pairsWithData
      .sort((a, b) => (b.realtimeData?.volume24hUsd || 0) - (a.realtimeData?.volume24hUsd || 0))
      .slice(0, 10);

    const topPairsByApr = pairsWithData
      .sort((a, b) => (b.realtimeData?.apr || 0) - (a.realtimeData?.apr || 0))
      .slice(0, 10);

    return {
      totalPairs: pairsWithData.length,
      totalTvl,
      totalVolume24h,
      totalFees24h,
      avgApr,
      topPairsByVolume,
      topPairsByApr
    };
  }
}