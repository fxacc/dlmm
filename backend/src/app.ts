import express from 'express';
import cors from 'cors';
import { positionRoutes } from './routes/positionRoutes.js';
import tradingRoutes from './routes/tradingRoutes.js';
import { priceService } from './services/PriceService.js';
import { schedulerService } from './services/SchedulerService.js';
import { validateSolanaConnection } from './config/solana.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  const schedulerStatus = schedulerService.getStatus();
  const priceStatus = priceService.getCacheStatus();
  
  res.json({
    success: true,
    message: 'Meteora LP Monitor API is running',
    timestamp: new Date().toISOString(),
    services: {
      priceService: {
        running: true,
        cache: priceStatus
      },
      scheduler: schedulerStatus,
      positionService: true
    }
  });
});

// API路由
app.use('/api/positions', positionRoutes);
app.use('/api/trading', tradingRoutes);

// 价格API路由
app.get('/api/prices/cache', (req, res) => {
  const cacheStatus = priceService.getCacheStatus();
  const cachedPrices = priceService.getAllCachedPrices();
  
  res.json({
    success: true,
    data: {
      cacheStatus,
      prices: cachedPrices
    }
  });
});

app.delete('/api/prices/cache', (req, res) => {
  priceService.clearCache();
  res.json({
    success: true,
    message: 'Price cache cleared'
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export { app, PORT };