# Meteora LP Monitor

一个用于监控和管理 Meteora.ag 流动性池的系统。

## 快速开始

### 1. 启动数据库

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d

# 检查容器状态
docker-compose ps
```

### 2. 安装依赖

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install
```

### 3. 启动后端服务

```bash
# 开发模式
npm run dev

# 构建并启动
npm run build
npm start
```

### 4. API 测试

服务启动后，可以访问以下端点：

- 健康检查: `http://localhost:3000/health`
- 获取所有交易对: `http://localhost:3000/api/pairs`
- 获取统计数据: `http://localhost:3000/api/pairs/statistics`
- 同步交易对: `POST http://localhost:3000/api/pairs/sync`
- 刷新实时数据: `POST http://localhost:3000/api/pairs/refresh`

## 核心功能

### 1. 交易对监控
- ✅ 获取所有 Meteora 交易对
- ✅ 实时数据刷新（手动触发）
- ✅ 显示 TVL、交易量、手续费
- ✅ 计算年化收益率和日化收益率

### 2. 数据管理
- ✅ PostgreSQL 数据持久化
- ✅ Redis 缓存加速
- ✅ 数据同步和更新

### 3. 统计分析
- ✅ 总体统计数据
- ✅ 按交易量排序的前10名
- ✅ 按APR排序的前10名

## 技术栈

- **后端**: Node.js + TypeScript + Express
- **数据库**: PostgreSQL + Redis
- **区块链**: Solana + Meteora SDK
- **容器化**: Docker + Docker Compose

## 数据库配置

数据库连接信息在 `.env` 文件中配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meteora_lp
DB_USER=meteora_user
DB_PASSWORD=meteora_password123
```

## 参考文档

- [Meteora 技术文档](https://docs.meteora.ag/integration/dlmm-integration/dlmm-sdk/dlmm-typescript-sdk)
- [Meteora GitHub](https://github.com/MeteoraAg/dlmm-sdk)

## 下一步开发计划

- [ ] 钱包管理功能
- [ ] 价格预警系统
- [ ] 前端界面
- [ ] 流动性操作功能
- [ ] 数据可视化图表