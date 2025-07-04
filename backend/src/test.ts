import { MeteoraService } from './services/MeteoraService.js';
import { validateSolanaConnection } from './config/solana.js';

async function testAPI() {
  console.log('🚀 Testing Meteora LP Monitor API...\n');

  try {
    // 1. 测试 Solana 连接
    console.log('1. Testing Solana connection...');
    const solanaConnected = await validateSolanaConnection();
    
    if (!solanaConnected) {
      console.log('⚠️  Solana connection failed, continuing with mock data...\n');
    }

    // 2. 测试 Meteora 服务
    console.log('2. Testing Meteora service...');
    const meteoraService = MeteoraService.getInstance();
    
    // 获取交易对
    const pairs = await meteoraService.getAllPairs();
    console.log(`✅ Retrieved ${pairs.length} trading pairs`);
    
    // 显示前3个交易对
    console.log('\n📊 Top 3 Trading Pairs:');
    pairs.slice(0, 3).forEach((pair, index) => {
      console.log(`${index + 1}. ${pair.tokenASymbol}/${pair.tokenBSymbol}`);
      console.log(`   Pool: ${pair.poolAddress}`);
      console.log(`   Fee Rate: ${(pair.feeRate * 100).toFixed(2)}%\n`);
    });

    // 3. 测试实时数据获取
    console.log('3. Testing realtime data...');
    const poolAddress = pairs[0].poolAddress;
    const realtimeData = await meteoraService.getPairRealtimeData(poolAddress);
    
    if (realtimeData) {
      console.log(`✅ Realtime data for ${pairs[0].tokenASymbol}/${pairs[0].tokenBSymbol}:`);
      console.log(`   Current Price: $${realtimeData.currentPrice.toFixed(6)}`);
      console.log(`   TVL: $${realtimeData.tvlUsd.toLocaleString()}`);
      console.log(`   24h Volume: $${realtimeData.volume24hUsd.toLocaleString()}`);
      console.log(`   24h Fees: $${realtimeData.fees24hUsd.toLocaleString()}`);
      console.log(`   APR: ${realtimeData.apr.toFixed(2)}%`);
      console.log(`   Daily Yield: ${realtimeData.dailyYield.toFixed(4)}%`);
    } else {
      console.log('⚠️  No realtime data available (using mock data)');
    }

    // 4. 测试批量数据获取
    console.log('\n4. Testing batch data fetching...');
    const poolAddresses = pairs.slice(0, 3).map(p => p.poolAddress);
    const batchData = await meteoraService.getBatchRealtimeData(poolAddresses);
    
    console.log(`✅ Retrieved batch data for ${batchData.length} pools`);
    
    // 显示统计信息
    if (batchData.length > 0) {
      const totalTvl = batchData.reduce((sum, data) => sum + data.tvlUsd, 0);
      const totalVolume = batchData.reduce((sum, data) => sum + data.volume24hUsd, 0);
      const totalFees = batchData.reduce((sum, data) => sum + data.fees24hUsd, 0);
      const avgApr = batchData.reduce((sum, data) => sum + data.apr, 0) / batchData.length;
      
      console.log('\n📈 Statistics:');
      console.log(`   Total TVL: $${totalTvl.toLocaleString()}`);
      console.log(`   Total 24h Volume: $${totalVolume.toLocaleString()}`);
      console.log(`   Total 24h Fees: $${totalFees.toLocaleString()}`);
      console.log(`   Average APR: ${avgApr.toFixed(2)}%`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the database: docker-compose up -d');
    console.log('   2. Run the full server: npm run dev');
    console.log('   3. Test the API endpoints');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPI();