export interface TradingPair {
  id?: number;
  poolAddress: string;
  tokenAAddress: string;
  tokenBAddress: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenADecimals: number;
  tokenBDecimals: number;
  feeRate: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PairRealtimeData {
  id?: number;
  poolAddress: string;
  currentPrice: number;
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  apr: number;
  dailyYield: number;
  priceChange24h: number;
  lastUpdated?: Date;
}

export interface PairHistoricalData {
  id?: number;
  poolAddress: string;
  date: Date;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volumeUsd: number;
  feesUsd: number;
  tvlUsd: number;
  apr: number;
  transactionsCount: number;
  createdAt?: Date;
}

export interface TradingPairWithStats extends TradingPair {
  realtimeData?: PairRealtimeData;
}

export interface PairStatistics {
  totalPairs: number;
  totalTvl: number;
  totalVolume24h: number;
  totalFees24h: number;
  avgApr: number;
  topPairsByVolume: TradingPairWithStats[];
  topPairsByApr: TradingPairWithStats[];
}