import { positionService } from './PositionService.js';
import { feeService } from './FeeService.js';
import { priceService } from './PriceService.js';
import { 
  WalletLPPortfolio, 
  LPPosition, 
  PortfolioSummary, 
  TokenAsset 
} from '../types/lp.js';

export class PortfolioService {
  /**
   * 获取钱包的完整LP组合
   */
  async getWalletPortfolio(walletId: string): Promise<WalletLPPortfolio> {
    try {
      console.log(`📊 Building portfolio for wallet ${walletId}`);
      
      // 获取所有LP持仓
      const positions = await positionService.getWalletPositions(walletId);
      
      // 为每个持仓计算手续费
      const enrichedPositions = await Promise.all(
        positions.map(async (position) => {
          try {
            // 计算手续费收入
            const feeEarnings = await feeService.calculatePositionFees(position.positionKey);
            
            // 计算农场奖励
            const farmingRewards = await feeService.getFarmingRewards(position.positionKey);
            
            // 更新持仓总价值
            const totalPositionValue = 
              position.liquidityAssets.totalLiquidityValue +
              feeEarnings.totalFeeValue +
              farmingRewards.totalRewardValue;
            
            return {
              ...position,
              feeEarnings,
              farmingRewards,
              totalPositionValue
            };
          } catch (error) {
            console.error(`❌ Error enriching position ${position.positionKey}:`, error);
            return position;
          }
        })
      );

      // 计算组合摘要
      const summary = this.calculatePortfolioSummary(enrichedPositions);
      
      // 计算总价值
      const totalValue = enrichedPositions.reduce((sum, pos) => sum + pos.totalPositionValue, 0);
      const totalUnclaimedFees = enrichedPositions.reduce((sum, pos) => sum + pos.feeEarnings.unclaimedFees.totalUnclaimedValue, 0);

      const portfolio: WalletLPPortfolio = {
        walletAddress: walletId,
        totalValue,
        totalPositions: enrichedPositions.length,
        totalUnclaimedFees,
        positions: enrichedPositions,
        summary,
        lastUpdated: new Date()
      };

      console.log(`✅ Portfolio built: ${enrichedPositions.length} positions, total value: $${totalValue.toFixed(2)}`);
      
      return portfolio;
    } catch (error) {
      console.error(`❌ Error building portfolio for wallet ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * 计算组合摘要
   */
  private calculatePortfolioSummary(positions: LPPosition[]): PortfolioSummary {
    const tokenBreakdown: { [symbol: string]: any } = {};
    const poolBreakdown: { [poolPair: string]: any } = {};
    
    let totalLiquidityValue = 0;
    let totalClaimedFees = 0;
    let totalUnclaimedFees = 0;
    let totalFarmingRewards = 0;

    // 遍历所有持仓
    positions.forEach(position => {
      // 更新总计数据
      totalLiquidityValue += position.liquidityAssets.totalLiquidityValue;
      totalClaimedFees += position.feeEarnings.claimedFees.totalClaimedValue;
      totalUnclaimedFees += position.feeEarnings.unclaimedFees.totalUnclaimedValue;
      totalFarmingRewards += position.farmingRewards?.totalRewardValue || 0;

      // 处理代币分解
      this.processTokenBreakdown(tokenBreakdown, position);
      
      // 处理池子分解
      this.processPoolBreakdown(poolBreakdown, position);
    });

    return {
      tokenBreakdown,
      poolBreakdown,
      earningsStats: {
        totalLiquidityValue,
        totalClaimedFees,
        totalUnclaimedFees,
        totalFarmingRewards,
        estimatedDailyEarnings: this.estimatePortfolioDailyEarnings(positions)
      }
    };
  }

  /**
   * 处理代币分解统计
   */
  private processTokenBreakdown(tokenBreakdown: any, position: LPPosition): void {
    // 处理流动性资产
    [position.liquidityAssets.token1, position.liquidityAssets.token2].forEach(token => {
      if (!tokenBreakdown[token.symbol]) {
        tokenBreakdown[token.symbol] = {
          totalAmount: 0,
          totalValue: 0,
          sources: {
            liquidity: 0,
            claimedFees: 0,
            unclaimedFees: 0,
            farming: 0
          }
        };
      }

      tokenBreakdown[token.symbol].totalAmount += token.amount;
      tokenBreakdown[token.symbol].totalValue += token.value;
      tokenBreakdown[token.symbol].sources.liquidity += token.value;
    });

    // 处理已领取手续费
    [position.feeEarnings.claimedFees.token1, position.feeEarnings.claimedFees.token2].forEach(token => {
      if (token.amount > 0) {
        if (!tokenBreakdown[token.symbol]) {
          tokenBreakdown[token.symbol] = {
            totalAmount: 0,
            totalValue: 0,
            sources: { liquidity: 0, claimedFees: 0, unclaimedFees: 0, farming: 0 }
          };
        }

        tokenBreakdown[token.symbol].totalAmount += token.amount;
        tokenBreakdown[token.symbol].totalValue += token.value;
        tokenBreakdown[token.symbol].sources.claimedFees += token.value;
      }
    });

    // 处理未领取手续费
    [position.feeEarnings.unclaimedFees.token1, position.feeEarnings.unclaimedFees.token2].forEach(token => {
      if (token.amount > 0) {
        if (!tokenBreakdown[token.symbol]) {
          tokenBreakdown[token.symbol] = {
            totalAmount: 0,
            totalValue: 0,
            sources: { liquidity: 0, claimedFees: 0, unclaimedFees: 0, farming: 0 }
          };
        }

        tokenBreakdown[token.symbol].totalAmount += token.amount;
        tokenBreakdown[token.symbol].totalValue += token.value;
        tokenBreakdown[token.symbol].sources.unclaimedFees += token.value;
      }
    });

    // 处理农场奖励
    position.farmingRewards?.rewardTokens.forEach(token => {
      if (token.amount > 0) {
        if (!tokenBreakdown[token.symbol]) {
          tokenBreakdown[token.symbol] = {
            totalAmount: 0,
            totalValue: 0,
            sources: { liquidity: 0, claimedFees: 0, unclaimedFees: 0, farming: 0 }
          };
        }

        tokenBreakdown[token.symbol].totalAmount += token.amount;
        tokenBreakdown[token.symbol].totalValue += token.value;
        tokenBreakdown[token.symbol].sources.farming += token.value;
      }
    });
  }

  /**
   * 处理池子分解统计
   */
  private processPoolBreakdown(poolBreakdown: any, position: LPPosition): void {
    const poolPair = `${position.liquidityAssets.token1.symbol}/${position.liquidityAssets.token2.symbol}`;
    
    if (!poolBreakdown[poolPair]) {
      poolBreakdown[poolPair] = {
        positionCount: 0,
        totalValue: 0,
        totalFees: 0,
        avgAPR: 0
      };
    }

    poolBreakdown[poolPair].positionCount += 1;
    poolBreakdown[poolPair].totalValue += position.totalPositionValue;
    poolBreakdown[poolPair].totalFees += position.feeEarnings.totalFeeValue;
    poolBreakdown[poolPair].avgAPR = (poolBreakdown[poolPair].avgAPR + position.apr) / poolBreakdown[poolPair].positionCount;
  }

  /**
   * 估算组合日化收益
   */
  private estimatePortfolioDailyEarnings(positions: LPPosition[]): number {
    return positions.reduce((sum, position) => {
      // 基于APR和持仓价值估算日化收益
      const dailyRate = position.apr / 365 / 100;
      const dailyEarnings = position.totalPositionValue * dailyRate;
      return sum + dailyEarnings;
    }, 0);
  }

  /**
   * 获取钱包LP摘要
   */
  async getWalletSummary(walletId: string): Promise<PortfolioSummary> {
    const portfolio = await this.getWalletPortfolio(walletId);
    return portfolio.summary;
  }

  /**
   * 获取未领取手续费汇总
   */
  async getUnclaimedFeesSummary(walletId: string): Promise<{
    totalValue: number;
    byToken: { [symbol: string]: { amount: number; value: number } };
    byPool: { [poolPair: string]: { value: number; positions: number } };
  }> {
    const portfolio = await this.getWalletPortfolio(walletId);
    
    const byToken: { [symbol: string]: { amount: number; value: number } } = {};
    const byPool: { [poolPair: string]: { value: number; positions: number } } = {};
    let totalValue = 0;

    portfolio.positions.forEach(position => {
      const poolPair = `${position.liquidityAssets.token1.symbol}/${position.liquidityAssets.token2.symbol}`;
      
      // 按池子统计
      if (!byPool[poolPair]) {
        byPool[poolPair] = { value: 0, positions: 0 };
      }
      byPool[poolPair].value += position.feeEarnings.unclaimedFees.totalUnclaimedValue;
      byPool[poolPair].positions += 1;

      // 按代币统计
      [position.feeEarnings.unclaimedFees.token1, position.feeEarnings.unclaimedFees.token2].forEach(token => {
        if (token.amount > 0) {
          if (!byToken[token.symbol]) {
            byToken[token.symbol] = { amount: 0, value: 0 };
          }
          byToken[token.symbol].amount += token.amount;
          byToken[token.symbol].value += token.value;
        }
      });

      totalValue += position.feeEarnings.unclaimedFees.totalUnclaimedValue;
    });

    return {
      totalValue,
      byToken,
      byPool
    };
  }

  /**
   * 获取收益统计
   */
  async getEarningsStats(walletId: string): Promise<{
    totalLiquidityValue: number;
    totalClaimedFees: number;
    totalUnclaimedFees: number;
    totalFarmingRewards: number;
    estimatedDailyEarnings: number;
    estimatedMonthlyEarnings: number;
    estimatedYearlyEarnings: number;
  }> {
    const portfolio = await this.getWalletPortfolio(walletId);
    const stats = portfolio.summary.earningsStats;
    
    return {
      ...stats,
      estimatedMonthlyEarnings: stats.estimatedDailyEarnings * 30,
      estimatedYearlyEarnings: stats.estimatedDailyEarnings * 365
    };
  }
}

export const portfolioService = new PortfolioService();