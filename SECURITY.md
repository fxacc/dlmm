# 🔐 安全指南 - Meteora Trading System

## 🚨 重要安全提醒

### ⚠️ 敏感文件管理

以下文件包含敏感信息，**绝对不能提交到版本控制系统**：

#### 钱包和密钥文件
- `wallet.json` - 包含私钥的钱包配置
- `keypair.json` - Solana钱包密钥对
- `*.key` - 任何密钥文件
- `*.pem` - PEM格式的证书或密钥

#### 配置文件
- `.env` - 环境变量配置
- `config/production.json` - 生产环境配置
- 任何包含API密钥、数据库密码的配置文件

## ✅ 已配置的安全措施

### 1. `.gitignore` 配置
已经更新了 `.gitignore` 文件，包含以下保护：

```gitignore
# 敏感文件 - 钱包和密钥
wallet.json
wallets.json
*.key
*.pem
*.p12
keypair.json
authority.json

# 环境变量
.env
.env.local
backend/.env
frontend/.env

# 配置文件中的敏感信息
config/production.json
*-config.json
settings.local.json
```

### 2. 示例文件
提供了安全的示例文件：
- `wallet.example.json` - 钱包配置模板
- `.env.example` - 环境变量模板

## 🛡️ 最佳实践

### 钱包安全
1. **测试网优先**: 开发阶段只使用测试网钱包
2. **小额测试**: 使用最小金额进行测试
3. **密钥轮换**: 定期更换钱包和密钥
4. **分离环境**: 测试网和主网钱包完全分离

### 环境变量安全
1. **本地配置**: 在本地复制 `.env.example` 为 `.env`
2. **生产隔离**: 生产环境使用独立的密钥管理服务
3. **强密码**: 使用复杂且唯一的密码
4. **定期更新**: 定期轮换所有密钥和密码

### API密钥安全
1. **最小权限**: API密钥只授予必要的权限
2. **环境隔离**: 不同环境使用不同的API密钥
3. **监控使用**: 监控API密钥的使用情况
4. **及时撤销**: 发现异常立即撤销密钥

## 🔧 安全配置步骤

### 步骤 1: 设置钱包
```bash
# 复制示例文件
cp backend/wallet.example.json backend/wallet.json

# 编辑配置（使用测试网钱包）
nano backend/wallet.json
```

### 步骤 2: 设置环境变量
```bash
# 复制示例文件
cp backend/.env.example backend/.env

# 编辑配置
nano backend/.env
```

### 步骤 3: 验证 .gitignore
```bash
# 检查敏感文件是否被忽略
git status

# 确保以下文件不在待提交列表中：
# - wallet.json
# - .env
# - *.key
```

## 🚨 紧急响应

### 如果意外提交了敏感信息

#### 立即行动
1. **停止使用**: 立即停止使用泄露的密钥/钱包
2. **创建新密钥**: 生成新的钱包和密钥
3. **清理历史**: 从Git历史中移除敏感信息

#### Git历史清理
```bash
# 移除特定文件的历史记录
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch wallet.json' \
--prune-empty --tag-name-filter cat -- --all

# 强制推送（危险操作）
git push origin --force --all
```

#### 更安全的方法
```bash
# 使用 git-filter-repo (推荐)
pip install git-filter-repo
git filter-repo --path wallet.json --invert-paths
```

## 🔍 安全检查清单

### 开发环境
- [ ] `wallet.json` 在 `.gitignore` 中
- [ ] `.env` 在 `.gitignore` 中
- [ ] 使用测试网钱包
- [ ] 设置了强密码
- [ ] 定期备份重要数据

### 生产环境
- [ ] 使用环境变量或密钥管理服务
- [ ] 启用所有安全日志
- [ ] 配置防火墙和访问控制
- [ ] 设置监控和告警
- [ ] 定期安全审计

### 代码审查
- [ ] 检查硬编码的密钥
- [ ] 验证 `.gitignore` 配置
- [ ] 确认敏感信息处理正确
- [ ] 验证错误信息不泄露敏感数据

## 📞 安全支持

### 报告安全问题
如果发现安全漏洞，请：
1. **不要公开披露**
2. **立即停止相关操作**
3. **记录详细信息**
4. **联系开发团队**

### 安全资源
- [Solana安全最佳实践](https://docs.solana.com/developing/programming-model/security)
- [Web3安全指南](https://consensys.github.io/smart-contract-best-practices/)
- [OWASP安全指南](https://owasp.org/www-project-top-ten/)

## 🔄 定期安全任务

### 每周
- [ ] 检查依赖库安全更新
- [ ] 审查访问日志
- [ ] 验证备份完整性

### 每月
- [ ] 轮换API密钥
- [ ] 更新依赖库
- [ ] 安全配置审查

### 每季度
- [ ] 轮换钱包密钥
- [ ] 完整安全审计
- [ ] 渗透测试（如适用）

---

**⚠️ 记住：安全是一个持续的过程，不是一次性的设置！**