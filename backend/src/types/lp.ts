export interface TokenAsset {
  mint: string;
  symbol: string;
  decimals: number;
  amount: number;               // 实际数量
  price: number;                // 单价
  value: number;                // 价值 = amount * price
}

export interface FeeEarnings {
  claimedFees: {
    token1: TokenAsset;
    token2: TokenAsset;
    totalClaimedValue: number;
  };
  unclaimedFees: {
    token1: TokenAsset;
    token2: TokenAsset;
    totalUnclaimedValue: number;
  };
  totalFeeValue: number;        // 已领取 + 未领取
}

export interface LPPosition {
  poolAddress: string;
  positionKey: string;
  
  // 流动性资产
  liquidityAssets: {
    token1: TokenAsset;
    token2: TokenAsset;
    totalLiquidityValue: number;
  };
  
  // 手续费收入
  feeEarnings: FeeEarnings;
  
  // 农场奖励（额外收益）
  farmingRewards?: {
    rewardTokens: TokenAsset[];
    totalRewardValue: number;
  };
  
  // 价格区间信息
  priceRange: {
    min: number;
    max: number;
    current: number;
  };
  
  // 头寸总价值 = 流动性 + 手续费 + 奖励
  totalPositionValue: number;
  isActive: boolean;
  apr: number;                   // 年化收益率
  lastUpdated: Date;
}

export interface PortfolioSummary {
  // 按代币聚合
  tokenBreakdown: {
    [symbol: string]: {
      totalAmount: number;
      totalValue: number;
      sources: {
        liquidity: number;
        claimedFees: number;
        unclaimedFees: number;
        farming: number;
      };
    };
  };
  
  // 按池子聚合
  poolBreakdown: {
    [poolPair: string]: {
      positionCount: number;
      totalValue: number;
      totalFees: number;
      avgAPR: number;
    };
  };
  
  // 收益统计
  earningsStats: {
    totalLiquidityValue: number;
    totalClaimedFees: number;
    totalUnclaimedFees: number;
    totalFarmingRewards: number;
    estimatedDailyEarnings: number;
  };
}

export interface WalletLPPortfolio {
  walletAddress: string;
  totalValue: number;           // 总价值（包含所有LP和手续费）
  totalPositions: number;       // LP头寸数量
  totalUnclaimedFees: number;   // 未领取手续费总价值
  positions: LPPosition[];      // 所有LP头寸
  summary: PortfolioSummary;    // 组合汇总
  lastUpdated: Date;
}

export interface TokenPrice {
  mint: string;
  symbol: string;
  price: number;
  source: 'jupiter' | 'birdeye' | 'meteora';
  timestamp: number;
}

export interface PriceCache {
  [mint: string]: TokenPrice;
}