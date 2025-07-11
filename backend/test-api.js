// 快速API测试脚本
const baseUrl = 'http://localhost:3000';

const testApis = [
  { name: '健康检查', url: '/health' },
  { name: '钱包列表', url: '/api/positions/wallets' },
  { name: 'Wallet1持仓', url: '/api/positions/wallet1' },
  { name: 'Wallet1摘要', url: '/api/positions/wallet1/summary' },
  { name: '未领取手续费', url: '/api/positions/wallet1/unclaimed-fees' },
  { name: '收益统计', url: '/api/positions/wallet1/earnings' },
  { name: '价格缓存', url: '/api/prices/cache' }
];

async function testAPI() {
  console.log('🧪 测试LP持仓监控API\n');
  
  for (const api of testApis) {
    try {
      const response = await fetch(`${baseUrl}${api.url}`);
      const data = await response.json();
      
      console.log(`✅ ${api.name}: ${response.status}`);
      if (data.success) {
        if (api.url === '/api/positions/wallet1') {
          console.log(`   - 总价值: $${data.data.totalValue?.toFixed(2) || 'N/A'}`);
          console.log(`   - 持仓数量: ${data.data.totalPositions || 0}`);
          console.log(`   - 未领取手续费: $${data.data.totalUnclaimedFees?.toFixed(2) || 'N/A'}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${api.name}: 连接失败`);
    }
  }
  
  console.log('\n🎉 API测试完成！');
}

// 等待服务器启动
setTimeout(testAPI, 2000);