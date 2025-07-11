# LP持仓监控系统

## 🎯 功能概述

全新的LP持仓监控系统已完成开发，支持：
- ✅ 多钱包LP持仓监控
- ✅ 实时价格更新（每10秒）
- ✅ 手续费收入计算（已领取+未领取）
- ✅ 农场奖励统计
- ✅ 多LP组合聚合
- ✅ 完整的API接口
- ✅ 定时任务调度

## 🚀 快速开始

### 1. 配置钱包

编辑 `backend/wallet.json` 文件：

```json
{
  "wallets": {
    "wallet1": {
      "name": "主钱包",
      "publicKey": "你的钱包公钥地址",
      "privateKey": "你的钱包私钥（base58格式）",
      "description": "用于LP持仓监控的主钱包"
    }
  }
}
```

### 2. 启动服务

```bash
cd backend
npm install
npm run dev
```

### 3. 测试API

服务启动后访问：
- 健康检查: `http://localhost:3000/health`
- 钱包列表: `http://localhost:3000/api/positions/wallets`
- 钱包持仓: `http://localhost:3000/api/positions/wallet1`

## 📊 API 端点

### 核心API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/positions/wallets` | 获取所有钱包列表 |
| GET | `/api/positions/:walletId` | 获取钱包完整LP组合 |
| GET | `/api/positions/:walletId/summary` | 获取钱包LP摘要 |
| GET | `/api/positions/:walletId/unclaimed-fees` | 获取未领取手续费 |
| GET | `/api/positions/:walletId/earnings` | 获取收益统计 |
| POST | `/api/positions/:walletId/refresh` | 刷新持仓数据 |

### 辅助API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 系统健康检查 |
| GET | `/api/prices/cache` | 查看价格缓存 |
| DELETE | `/api/prices/cache` | 清空价格缓存 |

## 📈 数据结构

### 钱包LP组合

```json
{
  "walletAddress": "钱包地址",
  "totalValue": 5420.75,
  "totalPositions": 3,
  "totalUnclaimedFees": 125.50,
  "positions": [
    {
      "poolAddress": "池子地址",
      "positionKey": "持仓Key",
      "liquidityAssets": {
        "token1": {
          "symbol": "SOL",
          "amount": 10.5,
          "price": 95.42,
          "value": 1001.91
        },
        "token2": {
          "symbol": "USDC",
          "amount": 850.00,
          "price": 1.0,
          "value": 850.00
        },
        "totalLiquidityValue": 1851.91
      },
      "feeEarnings": {
        "claimedFees": {
          "token1": { "amount": 0.15, "value": 14.31 },
          "token2": { "amount": 12.50, "value": 12.50 },
          "totalClaimedValue": 26.81
        },
        "unclaimedFees": {
          "token1": { "amount": 0.08, "value": 7.63 },
          "token2": { "amount": 8.20, "value": 8.20 },
          "totalUnclaimedValue": 15.83
        },
        "totalFeeValue": 42.64
      },
      "totalPositionValue": 1894.55,
      "isActive": true,
      "apr": 19.6
    }
  ],
  "summary": {
    "tokenBreakdown": {
      "SOL": {
        "totalAmount": 25.73,
        "totalValue": 2458.94,
        "sources": {
          "liquidity": 2380.50,
          "claimedFees": 35.62,
          "unclaimedFees": 18.45,
          "farming": 24.37
        }
      }
    },
    "earningsStats": {
      "totalLiquidityValue": 5230.50,
      "totalClaimedFees": 100.92,
      "totalUnclaimedFees": 50.60,
      "totalFarmingRewards": 38.72,
      "estimatedDailyEarnings": 2.85
    }
  }
}
```

## ⚡ 自动化任务

系统包含以下定时任务：

1. **价格更新** - 每10秒更新主要代币价格
2. **持仓更新** - 每30秒更新LP持仓数据
3. **缓存刷新** - 每5分钟刷新缓存
4. **数据清理** - 每小时清理过期数据
5. **数据存档** - 每天8点自动存档

## 🔧 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    LP Portfolio Monitor                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Price Service │  │Position Service │  │  Fee Service    │ │
│  │                 │  │                 │  │                 │ │
│  │ • Jupiter API   │  │ • Meteora SDK   │  │ • Unclaimed     │ │
│  │ • Birdeye API   │  │ • Multi-LP      │  │ • Claimed       │ │
│  │ • Cache (10s)   │  │ • Position      │  │ • Farming       │ │
│  │                 │  │   Tracking      │  │   Rewards       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                       │                       │     │
│           └───────────────────────┼───────────────────────┘     │
│                                   │                             │
│                    ┌─────────────────┐                         │
│                    │Portfolio Service│                         │
│                    │   + Scheduler   │                         │
│                    │                 │                         │
│                    │ • Multi-LP      │                         │
│                    │ • Token合并     │                         │
│                    │ • 总价值计算    │                         │
│                    │ • 定时更新      │                         │
│                    └─────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 使用示例

### 获取钱包1的LP持仓

```bash
curl http://localhost:3000/api/positions/wallet1
```

### 获取未领取手续费

```bash
curl http://localhost:3000/api/positions/wallet1/unclaimed-fees
```

### 手动刷新持仓

```bash
curl -X POST http://localhost:3000/api/positions/wallet1/refresh
```

## 💡 配置说明

### 环境变量

```env
# Solana配置
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed

# API配置
BIRDEYE_API_KEY=your_birdeye_api_key_here

# 数据库配置（可选）
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 钱包安全

- 私钥以base58格式存储在`wallet.json`
- 建议生产环境使用加密存储
- 文件权限设置为600（仅所有者可读写）

## 🚨 注意事项

1. **钱包配置**: 首次使用需要配置真实的钱包公钥和私钥
2. **API限制**: Jupiter和Birdeye API可能有调用频率限制
3. **网络延迟**: Solana网络状况可能影响数据获取速度
4. **数据精度**: 价格和数量计算基于链上数据，可能有微小误差

## 🛠️ 开发和调试

### 启动开发模式

```bash
npm run dev  # 带热重载的开发模式
npm start    # 生产模式
```

### 查看日志

系统会输出详细的操作日志，包括：
- 价格更新状态
- 持仓查询结果
- 手续费计算过程
- 错误和警告信息

### 测试API

推荐使用Postman或curl测试API端点，所有响应都是JSON格式。

---

**开发完成！** 🎉

LP持仓监控系统现已完全实现，支持多钱包、实时价格、手续费统计等所有功能。