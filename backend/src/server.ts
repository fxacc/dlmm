import { app, PORT } from './app.js';
import { validateSolanaConnection } from './config/solana.js';
import { priceService } from './services/PriceService.js';
import { schedulerService } from './services/SchedulerService.js';

async function startServer() {
  try {
    console.log('🚀 Starting Meteora LP Monitor Server...\n');

    // 1. 验证 Solana 连接
    console.log('1. Connecting to Solana network...');
    const solanaConnected = await validateSolanaConnection();
    if (!solanaConnected) {
      throw new Error('Failed to connect to Solana network');
    }

    // 2. 初始化价格服务（自动启动价格更新器）
    console.log('2. Initializing price service...');
    console.log('✅ Price service initialized with 10s update interval');

    // 3. 启动定时任务调度器
    console.log('3. Starting scheduler service...');
    schedulerService.start();

    // 4. 启动HTTP服务器
    console.log('4. Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API endpoints:`);
      console.log(`   GET /api/positions/wallets - List all wallets`);
      console.log(`   GET /api/positions/wallet1 - Get wallet1 LP portfolio`);
      console.log(`   GET /api/positions/wallet1/summary - Get wallet1 summary`);
      console.log(`   GET /api/positions/wallet1/unclaimed-fees - Get unclaimed fees`);
      console.log(`   GET /api/positions/wallet1/earnings - Get earnings stats`);
      console.log(`   POST /api/positions/wallet1/refresh - Refresh positions`);
      console.log(`   GET /api/prices/cache - View price cache`);
      console.log(`\n🎉 Meteora LP Monitor is ready!`);
      console.log(`💡 Configure your wallet in wallet.json file`);
    });

    // 优雅关闭处理
    process.on('SIGINT', () => {
      console.log('\n🔄 Shutting down server...');
      schedulerService.stop();
      server.close(() => {
        console.log('✅ Server shut down complete');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🔄 Shutting down server...');
      schedulerService.stop();
      server.close(() => {
        console.log('✅ Server shut down complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();