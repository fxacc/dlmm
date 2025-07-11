import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { connection } from '../config/solana.js';
import { priceService } from './PriceService.js';
import { LPPosition, TokenAsset } from '../types/lp.js';
import { walletService } from '../config/wallet.js';

export class PositionService {
  private connection: Connection;

  constructor() {
    this.connection = connection;
  }

  /**
   * 获取钱包的所有LP持仓
   */
  async getWalletPositions(walletId: string): Promise<LPPosition[]> {
    try {
      const walletConfig = walletService.getWallet(walletId);
      if (!walletConfig) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // 检查钱包是否正确配置
      if (!walletService.isWalletConfigured(walletId)) {
        console.log(`📊 Wallet ${walletId} not properly configured, using mock data`);
        return this.generateMockPositions(walletConfig.publicKey);
      }

      // 在测试网环境下，如果启用模拟数据，返回模拟持仓
      if (process.env.ENABLE_MOCK_DATA === 'true') {
        console.log(`📊 Using mock LP positions for wallet ${walletId} (test mode)`);
        return this.generateMockPositions(walletConfig.publicKey);
      }

      const userPubkey = new PublicKey(walletConfig.publicKey);

      // 尝试获取真实的DLMM持仓
      try {
        // 注意：这个API可能在测试网不可用
        const userPositions = await this.getUserPositionsFromAPI(userPubkey);
        
        console.log(`📊 Found ${userPositions.length} LP positions for wallet ${walletId}`);

        // 转换为我们的数据结构
        const positions: LPPosition[] = [];
        for (const positionData of userPositions) {
          try {
            const position = await this.convertToLPPosition(positionData);
            if (position) {
              positions.push(position);
            }
          } catch (error) {
            console.error(`❌ Error processing position ${positionData.publicKey.toString()}:`, error);
          }
        }

        return positions;
      } catch (error) {
        console.warn(`⚠️  Failed to get real positions, falling back to mock data:`, error.message);
        return this.generateMockPositions(walletConfig.publicKey);
      }
    } catch (error) {
      console.error(`❌ Error getting wallet positions for ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * 从API获取用户持仓
   */
  private async getUserPositionsFromAPI(userPubkey: PublicKey): Promise<any[]> {
    // 这里应该使用实际的Meteora API或SDK方法
    // 但由于测试网可能不支持，先返回空数组
    return [];
  }

  /**
   * 生成模拟LP持仓数据
   */
  private generateMockPositions(walletAddress: string): LPPosition[] {
    const mockPositions: LPPosition[] = [
      {
        poolAddress: 'mock-pool-sol-usdc',
        positionKey: 'mock-position-1',
        liquidityAssets: {
          token1: {
            mint: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            decimals: 9,
            amount: 5.25,
            price: 95.42,
            value: 501.46
          },
          token2: {
            mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            symbol: 'USDC',
            decimals: 6,
            amount: 485.75,
            price: 1.0,
            value: 485.75
          },
          totalLiquidityValue: 987.21
        },
        feeEarnings: {
          claimedFees: {
            token1: {
              mint: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              amount: 0.05,
              price: 95.42,
              value: 4.77
            },
            token2: {
              mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
              symbol: 'USDC',
              decimals: 6,
              amount: 8.5,
              price: 1.0,
              value: 8.5
            },
            totalClaimedValue: 13.27
          },
          unclaimedFees: {
            token1: {
              mint: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              amount: 0.03,
              price: 95.42,
              value: 2.86
            },
            token2: {
              mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
              symbol: 'USDC',
              decimals: 6,
              amount: 5.2,
              price: 1.0,
              value: 5.2
            },
            totalUnclaimedValue: 8.06
          },
          totalFeeValue: 21.33
        },
        priceRange: {
          min: 85.0,
          max: 105.0,
          current: 95.42
        },
        totalPositionValue: 1008.54,
        isActive: true,
        apr: 18.5,
        lastUpdated: new Date()
      },
      {
        poolAddress: 'mock-pool-sol-usdt',
        positionKey: 'mock-position-2',
        liquidityAssets: {
          token1: {
            mint: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            decimals: 9,
            amount: 2.1,
            price: 95.42,
            value: 200.38
          },
          token2: {
            mint: 'EgQ3yNtVhJzt9VBoPKvPwdYuaq7fFWKUwB8Rbpg2dEJV',
            symbol: 'USDT',
            decimals: 6,
            amount: 195.5,
            price: 0.9998,
            value: 195.46
          },
          totalLiquidityValue: 395.84
        },
        feeEarnings: {
          claimedFees: {
            token1: {
              mint: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              amount: 0.02,
              price: 95.42,
              value: 1.91
            },
            token2: {
              mint: 'EgQ3yNtVhJzt9VBoPKvPwdYuaq7fFWKUwB8Rbpg2dEJV',
              symbol: 'USDT',
              decimals: 6,
              amount: 3.2,
              price: 0.9998,
              value: 3.20
            },
            totalClaimedValue: 5.11
          },
          unclaimedFees: {
            token1: {
              mint: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              amount: 0.015,
              price: 95.42,
              value: 1.43
            },
            token2: {
              mint: 'EgQ3yNtVhJzt9VBoPKvPwdYuaq7fFWKUwB8Rbpg2dEJV',
              symbol: 'USDT',
              decimals: 6,
              amount: 2.8,
              price: 0.9998,
              value: 2.80
            },
            totalUnclaimedValue: 4.23
          },
          totalFeeValue: 9.34
        },
        priceRange: {
          min: 90.0,
          max: 100.0,
          current: 95.42
        },
        totalPositionValue: 405.18,
        isActive: true,
        apr: 22.3,
        lastUpdated: new Date()
      }
    ];

    return mockPositions;
  }

  /**
   * 获取单个LP持仓详情
   */
  async getPositionDetails(positionKey: string): Promise<LPPosition | null> {
    try {
      if (process.env.ENABLE_MOCK_DATA === 'true') {
        // 返回模拟持仓中的第一个
        const mockPositions = this.generateMockPositions('mock-wallet');
        return mockPositions.find(p => p.positionKey === positionKey) || mockPositions[0] || null;
      }

      // 真实环境下的逻辑
      const positionPubkey = new PublicKey(positionKey);
      
      // 这里需要实际的API调用
      // 暂时返回null
      return null;
    } catch (error) {
      console.error(`❌ Error getting position details for ${positionKey}:`, error);
      return null;
    }
  }

  /**
   * 转换Meteora持仓数据为我们的数据结构（暂时简化）
   */
  private async convertToLPPosition(positionData: any): Promise<LPPosition | null> {
    // 在测试环境下暂时返回null，等待真实API实现
    return null;
  }

  /**
   * 刷新持仓数据
   */
  async refreshPositions(walletId: string): Promise<LPPosition[]> {
    console.log(`🔄 Refreshing positions for wallet ${walletId}`);
    return await this.getWalletPositions(walletId);
  }
}

export const positionService = new PositionService();