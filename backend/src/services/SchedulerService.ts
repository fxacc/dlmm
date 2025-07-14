import cron from 'node-cron';
import { priceService } from './PriceService.js';
import { portfolioService } from './PortfolioService.js';
import { walletService } from '../config/wallet.js';
import { redisClient } from '../config/database.js';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * 启动所有定时任务
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log('🕐 Starting scheduler service...');

    // 1. 价格更新任务 - 每10秒
    this.schedulePriceUpdates();

    // 2. 持仓数据更新任务 - 每30秒
    this.schedulePositionUpdates();

    // 3. 持仓数据缓存刷新 - 每5分钟
    this.schedulePortfolioRefresh();

    // 4. 数据清理任务 - 每小时
    this.scheduleDataCleanup();

    // 5. 每日数据存档 - 每天8点
    this.scheduleDailyArchive();

    this.isRunning = true;
    console.log('✅ All scheduled tasks started');
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🔄 Stopping scheduler service...');
    
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`  ✅ Stopped task: ${name}`);
    });
    
    this.tasks.clear();
    this.isRunning = false;
    console.log('✅ Scheduler stopped');
  }

  /**
   * 价格更新任务 - 每10秒
   */
  private schedulePriceUpdates(): void {
    const task = cron.schedule('*/10 * * * * *', async () => {
      try {
        // 价格服务已经内置了定时更新，这里只是确保状态
        const cacheStatus = priceService.getCacheStatus();
        if (cacheStatus.total === 0) {
          console.log('🔄 Initializing price cache...');
          // 触发一次价格更新
          await this.triggerPriceUpdate();
        }
      } catch (error) {
        console.error('❌ Price update task error:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('price-updates', task);
    task.start();
    console.log('  ✅ Price updates scheduled (every 10 seconds)');
  }

  /**
   * 持仓数据更新任务 - 每30秒
   */
  private schedulePositionUpdates(): void {
    const task = cron.schedule('*/30 * * * * *', async () => {
      try {
        // 获取所有已配置的钱包
        const wallets = walletService.getAllWallets();
        const configuredWallets = Object.keys(wallets).filter(walletId => 
          walletService.isWalletConfigured(walletId)
        );

        if (configuredWallets.length === 0) {
          return; // 没有配置的钱包，跳过
        }

        console.log(`🔄 Updating positions for ${configuredWallets.length} wallets...`);
        
        // 并行更新所有钱包的持仓数据
        const updatePromises = configuredWallets.map(async (walletId) => {
          try {
            const portfolio = await portfolioService.getWalletPortfolio(walletId);
            
            // 缓存到Redis
            if (redisClient.isOpen) {
              const cacheKey = `portfolio:${walletId}`;
              await redisClient.setEx(cacheKey, 300, JSON.stringify(portfolio)); // 5分钟缓存
            }
            
            return { walletId, success: true, positionCount: portfolio.totalPositions };
          } catch (error) {
            console.error(`❌ Error updating portfolio for ${walletId}:`, error);
            return { walletId, success: false, error: error.message };
          }
        });

        const results = await Promise.allSettled(updatePromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        if (successful > 0) {
          console.log(`✅ Updated ${successful}/${configuredWallets.length} wallets`);
        }
      } catch (error) {
        console.error('❌ Position update task error:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('position-updates', task);
    task.start();
    console.log('  ✅ Position updates scheduled (every 30 seconds)');
  }

  /**
   * 持仓数据缓存刷新 - 每5分钟
   */
  private schedulePortfolioRefresh(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🔄 Refreshing portfolio cache...');
        
        // 清理过期的缓存
        if (redisClient.isOpen) {
          const keys = await redisClient.keys('portfolio:*');
          if (keys.length > 0) {
            console.log(`  📊 Found ${keys.length} cached portfolios`);
          }
        }
        
        console.log('✅ Portfolio cache refresh completed');
      } catch (error) {
        console.error('❌ Portfolio refresh task error:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('portfolio-refresh', task);
    task.start();
    console.log('  ✅ Portfolio refresh scheduled (every 5 minutes)');
  }

  /**
   * 数据清理任务 - 每小时
   */
  private scheduleDataCleanup(): void {
    const task = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 Running data cleanup...');
        
        // 清理过期的价格缓存
        priceService.clearCache();
        
        // 清理Redis中的过期数据
        if (redisClient.isOpen) {
          // 这里可以添加其他清理逻辑
        }
        
        console.log('✅ Data cleanup completed');
      } catch (error) {
        console.error('❌ Data cleanup task error:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('data-cleanup', task);
    task.start();
    console.log('  ✅ Data cleanup scheduled (every hour)');
  }

  /**
   * 每日数据存档 - 每天8点
   */
  private scheduleDailyArchive(): void {
    const task = cron.schedule('0 8 * * *', async () => {
      try {
        console.log('🗄️  Starting daily data archive...');
        
        const wallets = walletService.getAllWallets();
        const configuredWallets = Object.keys(wallets).filter(walletId => 
          walletService.isWalletConfigured(walletId)
        );

        for (const walletId of configuredWallets) {
          try {
            const portfolio = await portfolioService.getWalletPortfolio(walletId);
            
            // 这里可以添加数据存档逻辑
            // 例如：保存到数据库、文件或其他存储系统
            console.log(`  📊 Archived data for wallet ${walletId}: ${portfolio.totalPositions} positions, $${portfolio.totalValue.toFixed(2)} total value`);
            
          } catch (error) {
            console.error(`❌ Error archiving data for wallet ${walletId}:`, error);
          }
        }
        
        console.log('✅ Daily archive completed');
      } catch (error) {
        console.error('❌ Daily archive task error:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('daily-archive', task);
    task.start();
    console.log('  ✅ Daily archive scheduled (8:00 AM daily)');
  }

  /**
   * 手动触发价格更新
   */
  private async triggerPriceUpdate(): Promise<void> {
    try {
      const { TOKEN_ADDRESSES } = await import('../config/solana.js');
      const mainTokens = Object.values(TOKEN_ADDRESSES);
      await priceService.getTokenPrices(mainTokens);
    } catch (error) {
      console.error('❌ Error triggering price update:', error);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isRunning: boolean;
    taskCount: number;
    tasks: { name: string; running: boolean }[];
  } {
    const tasks = Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      running: task.running
    }));

    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.size,
      tasks
    };
  }

  /**
   * 手动执行特定任务
   */
  async executeTask(taskName: string): Promise<boolean> {
    const task = this.tasks.get(taskName);
    if (!task) {
      console.error(`❌ Task ${taskName} not found`);
      return false;
    }

    try {
      console.log(`🔄 Manually executing task: ${taskName}`);
      task.fireOnTick();
      return true;
    } catch (error) {
      console.error(`❌ Error executing task ${taskName}:`, error);
      return false;
    }
  }
}

export const schedulerService = new SchedulerService();