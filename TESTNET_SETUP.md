# 🧪 测试网配置指南

## ✅ 已完成的配置更新

我已经为您更新了以下配置文件以支持测试网测试：

### 1. Solana网络配置 (`src/config/solana.ts`)
- ✅ 支持动态网络切换 (mainnet-beta/devnet/testnet)
- ✅ 自动选择对应的RPC URL
- ✅ 测试网代币地址映射
- ✅ 网络信息日志显示

### 2. 环境变量配置 (`.env`)
- ✅ 设置为devnet网络
- ✅ 启用调试日志
- ✅ 启用模拟数据
- ✅ 使用devnet RPC URL

### 3. 价格服务优化 (`src/services/PriceService.ts`)
- ✅ 测试网模拟价格功能
- ✅ API失败时自动降级到模拟数据
- ✅ 价格波动模拟（±2%）

### 4. 钱包配置模板 (`wallet.json`)
- ✅ 更新为测试网钱包配置
- ✅ 添加详细的设置说明
- ✅ 包含测试网水龙头链接

## 🚀 测试网启动步骤

### 步骤1: 创建测试网钱包

1. **使用钱包插件创建新钱包**
   ```
   推荐: Phantom, Solflare, Backpack
   ```

2. **切换到Devnet网络**
   - 在钱包设置中选择 "Devnet"

3. **获取测试SOL**
   ```bash
   # 水龙头地址
   https://faucet.solana.com/
   https://solfaucet.com/
   ```

4. **配置钱包信息**
   ```json
   // 编辑 backend/wallet.json
   {
     "wallets": {
       "wallet1": {
         "name": "测试钱包",
         "publicKey": "你的测试网钱包公钥",
         "privateKey": "你的测试网钱包私钥",
         "description": "用于测试网LP持仓监控的钱包"
       }
     }
   }
   ```

### 步骤2: 启动系统

```bash
cd backend

# 安装依赖（如果还没有）
npm install

# 启动开发服务器
npm run dev
```

### 步骤3: 验证配置

系统启动后会显示：
```
✅ Solana connection established (devnet), version: ...
🌐 RPC URL: https://api.devnet.solana.com
🔗 Meteora Program ID: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo
```

### 步骤4: 测试API

```bash
# 健康检查
curl http://localhost:3000/health

# 查看钱包列表
curl http://localhost:3000/api/positions/wallets

# 查看价格缓存（测试模拟数据）
curl http://localhost:3000/api/prices/cache
```

## 🎯 测试方案

### 方案A: 模拟数据测试
当前默认配置，无需真实LP操作：
- ✅ 模拟价格数据自动生成
- ✅ 测试所有API接口
- ✅ 验证系统架构

### 方案B: 真实LP测试
如果测试网有Meteora DLMM：
1. 在测试网创建LP持仓
2. 关闭模拟数据: `ENABLE_MOCK_DATA=false`
3. 测试真实数据获取

## 📊 当前配置摘要

| 配置项 | 值 | 说明 |
|--------|-----|------|
| SOLANA_NETWORK | devnet | 使用开发网 |
| SOLANA_RPC_URL | https://api.devnet.solana.com | 官方devnet RPC |
| ENABLE_MOCK_DATA | true | 启用模拟数据 |
| ENABLE_DEBUG_LOGS | true | 启用详细日志 |
| PORT | 3000 | API服务端口 |

## 🔧 切换网络

### 切换到主网
```bash
# 修改 .env 文件
SOLANA_NETWORK=mainnet-beta
ENABLE_MOCK_DATA=false
```

### 切换到测试网
```bash
# 修改 .env 文件  
SOLANA_NETWORK=testnet
ENABLE_MOCK_DATA=true
```

## ⚠️ 注意事项

1. **钱包安全**
   - 确保使用测试网钱包
   - 不要在测试网配置中使用主网钱包

2. **API限制**
   - 测试网可能没有完整的价格API支持
   - 模拟数据功能可以解决这个问题

3. **LP数据**
   - 测试网的LP池可能很少或没有
   - 模拟数据模式下会生成示例持仓

4. **性能考虑**
   - 测试网RPC可能比较慢
   - 启用详细日志会影响性能

## 🔍 故障排除

### 连接问题
```bash
# 检查网络连接
curl https://api.devnet.solana.com

# 检查钱包配置
cat backend/wallet.json
```

### 价格数据问题
```bash
# 检查模拟数据状态
curl http://localhost:3000/api/prices/cache

# 手动清除价格缓存
curl -X DELETE http://localhost:3000/api/prices/cache
```

### 日志分析
```bash
# 查看详细日志
tail -f logs/app.log  # 如果有日志文件
# 或观察控制台输出
```

---

**测试网配置完成！** 🎉

现在您可以在安全的测试网环境中验证LP持仓监控系统的所有功能。