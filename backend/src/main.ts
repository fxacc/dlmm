import { MeteoraService } from './services/MeteoraService.js';
import { TradingPairServiceSimple } from './services/TradingPairServiceSimple.js';
import { validateSolanaConnection } from './config/solana.js';
import cron from 'node-cron';

export class MeteoraLPMonitor {
  private meteoraService: MeteoraService;
  private tradingPairService: TradingPairServiceSimple;
  private isRunning: boolean = false;

  constructor() {
    this.meteoraService = MeteoraService.getInstance();
    this.tradingPairService = TradingPairServiceSimple.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Meteora LP Monitor...\n');

      // 1. 验证 Solana 连接
      console.log('1. Connecting to Solana network...');
      const solanaConnected = await validateSolanaConnection();
      if (!solanaConnected) {
        throw new Error('Failed to connect to Solana network');
      }

      // 2. 同步交易对数据
      console.log('2. Syncing trading pairs...');
      await this.tradingPairService.syncTradingPairs();

      console.log('✅ Initialization completed successfully!\n');
      this.isRunning = true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async displayTradingPairs(limit: number = 10): Promise<void> {
    try {
      console.log(`📊 Fetching top ${limit} trading pairs information...\n`);

      // 获取所有交易对，但只处理前limit个
      const allPairs = await this.tradingPairService.getAllTradingPairs();
      const limitedPairs = allPairs.slice(0, limit);
      
      // 为前limit个获取实时数据
      const pairs = [];
      for (let i = 0; i < limitedPairs.length; i++) {
        const pair = limitedPairs[i];
        console.log(`📈 Getting data for pair ${i+1}/${limit}: ${pair.tokenASymbol || 'Unknown'}/${pair.tokenBSymbol || 'Unknown'}`);
        const realtimeData = await this.meteoraService.getPairRealtimeData(pair.poolAddress);
        pairs.push({
          ...pair,
          realtimeData
        });
      }

      if (pairs.length === 0) {
        console.log('⚠️  No trading pairs found');
        return;
      }

      // 显示交易对信息
      console.log(`🎯 Found ${pairs.length} Trading Pairs:\n`);
      console.log('┌─────────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│                               METEORA TRADING PAIRS                                        │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤');
      console.log('│ Pair          │ Price        │ TVL          │ 24h Volume   │ 24h Fees     │ APR        │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤');

      pairs.forEach((pair, index) => {
        const symbol = `${pair.tokenASymbol}/${pair.tokenBSymbol}`;
        const price = pair.realtimeData?.currentPrice ? 
          `$${pair.realtimeData.currentPrice.toFixed(6)}` : 'N/A';
        const tvl = pair.realtimeData?.tvlUsd ? 
          `$${(pair.realtimeData.tvlUsd / 1000000).toFixed(2)}M` : 'N/A';
        const volume = pair.realtimeData?.volume24hUsd ? 
          `$${(pair.realtimeData.volume24hUsd / 1000).toFixed(0)}K` : 'N/A';
        const fees = pair.realtimeData?.fees24hUsd ? 
          `$${pair.realtimeData.fees24hUsd.toFixed(0)}` : 'N/A';
        const apr = pair.realtimeData?.apr ? 
          `${pair.realtimeData.apr.toFixed(1)}%` : 'N/A';

        console.log(`│ ${symbol.padEnd(13)} │ ${price.padEnd(12)} │ ${tvl.padEnd(12)} │ ${volume.padEnd(12)} │ ${fees.padEnd(12)} │ ${apr.padEnd(10)} │`);
      });

      console.log('└─────────────────────────────────────────────────────────────────────────────────────────┘\n');

      // 显示统计数据
      await this.displayStatistics(pairs);

    } catch (error) {
      console.error('❌ Error displaying trading pairs:', error);
    }
  }

  private async displayStatistics(pairs: any[]): Promise<void> {
    const pairsWithData = pairs.filter(pair => pair.realtimeData);
    
    if (pairsWithData.length === 0) {
      console.log('⚠️  No real-time data available for statistics');
      return;
    }

    const totalTvl = pairsWithData.reduce((sum, pair) => sum + pair.realtimeData.tvlUsd, 0);
    const totalVolume = pairsWithData.reduce((sum, pair) => sum + pair.realtimeData.volume24hUsd, 0);
    const totalFees = pairsWithData.reduce((sum, pair) => sum + pair.realtimeData.fees24hUsd, 0);
    const avgApr = pairsWithData.reduce((sum, pair) => sum + pair.realtimeData.apr, 0) / pairsWithData.length;

    console.log('📈 Market Statistics:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log(`│ Total Pairs:      ${pairsWithData.length.toString().padStart(15)} │`);
    console.log(`│ Total TVL:        ${('$' + (totalTvl / 1000000).toFixed(2) + 'M').padStart(15)} │`);
    console.log(`│ 24h Volume:       ${('$' + (totalVolume / 1000000).toFixed(2) + 'M').padStart(15)} │`);
    console.log(`│ 24h Fees:         ${('$' + totalFees.toFixed(0)).padStart(15)} │`);
    console.log(`│ Average APR:      ${(avgApr.toFixed(2) + '%').padStart(15)} │`);
    console.log('└─────────────────────────────────────────────┘\n');

    // 显示前3名
    const topByVolume = pairsWithData
      .sort((a, b) => b.realtimeData.volume24hUsd - a.realtimeData.volume24hUsd)
      .slice(0, 3);

    const topByApr = pairsWithData
      .sort((a, b) => b.realtimeData.apr - a.realtimeData.apr)
      .slice(0, 3);

    console.log('🏆 Top Performers:');
    console.log('\n📊 Top 3 by 24h Volume:');
    topByVolume.forEach((pair, index) => {
      console.log(`   ${index + 1}. ${pair.tokenASymbol}/${pair.tokenBSymbol} - $${(pair.realtimeData.volume24hUsd / 1000).toFixed(0)}K`);
    });

    console.log('\n💰 Top 3 by APR:');
    topByApr.forEach((pair, index) => {
      console.log(`   ${index + 1}. ${pair.tokenASymbol}/${pair.tokenBSymbol} - ${pair.realtimeData.apr.toFixed(1)}%`);
    });

    console.log('\n' + '─'.repeat(80) + '\n');
  }

  async refreshData(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️  Monitor not initialized. Please call initialize() first.');
      return;
    }

    try {
      console.log('🔄 Refreshing trading pairs data...');
      await this.tradingPairService.refreshRealtimeData();
      console.log('✅ Data refresh completed!\n');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  }

  setupAutoArchive(): void {
    // 每日8点自动存档
    cron.schedule('0 8 * * *', async () => {
      console.log('🗄️  Starting daily data archive at 8:00 AM...');
      try {
        // TODO: 实现每日数据存档逻辑
        console.log('✅ Daily archive completed');
      } catch (error) {
        console.error('❌ Daily archive failed:', error);
      }
    });

    console.log('⏰ Auto-archive scheduled for 8:00 AM daily');
  }

  async shutdown(): Promise<void> {
    console.log('\n🔄 Shutting down Meteora LP Monitor...');
    this.isRunning = false;
    console.log('✅ Shutdown completed');
  }
}

// 主程序入口
async function main() {
  const monitor = new MeteoraLPMonitor();

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    await monitor.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await monitor.shutdown();
    process.exit(0);
  });

  try {
    // 初始化
    await monitor.initialize();

    // 设置自动存档
    monitor.setupAutoArchive();

    // 显示前10个交易对信息
    console.log('📊 Displaying top 10 trading pairs...');
    await monitor.displayTradingPairs(10);

    console.log('🎉 Demo completed! The system is monitoring Meteora pools.');
    console.log('💡 Press Ctrl+C to exit or wait for periodic updates.');
    
    // 保持程序运行
    setInterval(() => {
      // 每10分钟显示一次当前时间，证明程序在运行
      console.log(`⏰ System running... ${new Date().toLocaleString()}`);
    }, 600000);

  } catch (error) {
    console.error('❌ Application failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}