import { pool } from '../config/database.js';
import { TradingPair, PairRealtimeData, TradingPairWithStats } from '../models/TradingPair.js';
import { MeteoraService } from './MeteoraService.js';

export class TradingPairService {
  private static instance: TradingPairService;
  private meteoraService: MeteoraService;

  private constructor() {
    this.meteoraService = MeteoraService.getInstance();
  }

  public static getInstance(): TradingPairService {
    if (!TradingPairService.instance) {
      TradingPairService.instance = new TradingPairService();
    }
    return TradingPairService.instance;
  }

  // 同步交易对数据
  async syncTradingPairs(): Promise<void> {
    try {
      console.log('🔄 Syncing trading pairs from Meteora...');
      
      const pairs = await this.meteoraService.getAllPairs();
      
      for (const pair of pairs) {
        await this.upsertTradingPair(pair);
      }
      
      console.log(`✅ Synced ${pairs.length} trading pairs`);
    } catch (error) {
      console.error('❌ Error syncing trading pairs:', error);
      throw error;
    }
  }

  // 插入或更新交易对
  private async upsertTradingPair(pair: TradingPair): Promise<void> {
    const query = `
      INSERT INTO trading_pairs (
        pool_address, token_a_address, token_b_address, 
        token_a_symbol, token_b_symbol, token_a_decimals, 
        token_b_decimals, fee_rate, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (pool_address) 
      DO UPDATE SET
        token_a_symbol = EXCLUDED.token_a_symbol,
        token_b_symbol = EXCLUDED.token_b_symbol,
        fee_rate = EXCLUDED.fee_rate,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const values = [
      pair.poolAddress,
      pair.tokenAAddress,
      pair.tokenBAddress,
      pair.tokenASymbol,
      pair.tokenBSymbol,
      pair.tokenADecimals,
      pair.tokenBDecimals,
      pair.feeRate,
      pair.isActive
    ];
    
    await pool.query(query, values);
  }

  // 获取所有交易对
  async getAllTradingPairs(): Promise<TradingPair[]> {
    try {
      const query = `
        SELECT * FROM trading_pairs 
        WHERE is_active = true 
        ORDER BY token_a_symbol, token_b_symbol
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => this.mapRowToTradingPair(row));
    } catch (error) {
      console.error('❌ Error getting trading pairs:', error);
      throw error;
    }
  }

  // 获取交易对详情
  async getTradingPairByAddress(poolAddress: string): Promise<TradingPair | null> {
    try {
      const query = `
        SELECT * FROM trading_pairs 
        WHERE pool_address = $1 AND is_active = true
      `;
      
      const result = await pool.query(query, [poolAddress]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToTradingPair(result.rows[0]);
    } catch (error) {
      console.error('❌ Error getting trading pair by address:', error);
      throw error;
    }
  }

  // 刷新交易对实时数据
  async refreshRealtimeData(): Promise<void> {
    try {
      console.log('🔄 Refreshing realtime data for all trading pairs...');
      
      const pairs = await this.getAllTradingPairs();
      const poolAddresses = pairs.map(pair => pair.poolAddress);
      
      const realtimeData = await this.meteoraService.getBatchRealtimeData(poolAddresses);
      
      for (const data of realtimeData) {
        await this.upsertRealtimeData(data);
      }
      
      console.log(`✅ Refreshed realtime data for ${realtimeData.length} pairs`);
    } catch (error) {
      console.error('❌ Error refreshing realtime data:', error);
      throw error;
    }
  }

  // 插入或更新实时数据
  private async upsertRealtimeData(data: PairRealtimeData): Promise<void> {
    const query = `
      INSERT INTO pair_realtime_data (
        pool_address, current_price, tvl_usd, volume_24h_usd,
        fees_24h_usd, apr, daily_yield, price_change_24h, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (pool_address)
      DO UPDATE SET
        current_price = EXCLUDED.current_price,
        tvl_usd = EXCLUDED.tvl_usd,
        volume_24h_usd = EXCLUDED.volume_24h_usd,
        fees_24h_usd = EXCLUDED.fees_24h_usd,
        apr = EXCLUDED.apr,
        daily_yield = EXCLUDED.daily_yield,
        price_change_24h = EXCLUDED.price_change_24h,
        last_updated = EXCLUDED.last_updated
    `;
    
    const values = [
      data.poolAddress,
      data.currentPrice,
      data.tvlUsd,
      data.volume24hUsd,
      data.fees24hUsd,
      data.apr,
      data.dailyYield,
      data.priceChange24h,
      data.lastUpdated
    ];
    
    await pool.query(query, values);
  }

  // 获取带统计数据的交易对
  async getTradingPairsWithStats(): Promise<TradingPairWithStats[]> {
    try {
      const query = `
        SELECT 
          tp.*,
          prd.current_price,
          prd.tvl_usd,
          prd.volume_24h_usd,
          prd.fees_24h_usd,
          prd.apr,
          prd.daily_yield,
          prd.price_change_24h,
          prd.last_updated
        FROM trading_pairs tp
        LEFT JOIN pair_realtime_data prd ON tp.pool_address = prd.pool_address
        WHERE tp.is_active = true
        ORDER BY prd.tvl_usd DESC NULLS LAST
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        ...this.mapRowToTradingPair(row),
        realtimeData: row.current_price ? {
          poolAddress: row.pool_address,
          currentPrice: parseFloat(row.current_price),
          tvlUsd: parseFloat(row.tvl_usd),
          volume24hUsd: parseFloat(row.volume_24h_usd),
          fees24hUsd: parseFloat(row.fees_24h_usd),
          apr: parseFloat(row.apr),
          dailyYield: parseFloat(row.daily_yield),
          priceChange24h: parseFloat(row.price_change_24h),
          lastUpdated: row.last_updated
        } : undefined
      }));
    } catch (error) {
      console.error('❌ Error getting trading pairs with stats:', error);
      throw error;
    }
  }

  // 映射数据库行到交易对对象
  private mapRowToTradingPair(row: any): TradingPair {
    return {
      id: row.id,
      poolAddress: row.pool_address,
      tokenAAddress: row.token_a_address,
      tokenBAddress: row.token_b_address,
      tokenASymbol: row.token_a_symbol,
      tokenBSymbol: row.token_b_symbol,
      tokenADecimals: row.token_a_decimals,
      tokenBDecimals: row.token_b_decimals,
      feeRate: parseFloat(row.fee_rate),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}