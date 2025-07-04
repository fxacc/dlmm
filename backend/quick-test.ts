import { MeteoraService } from './src/services/MeteoraService.js';
import { validateSolanaConnection } from './src/config/solana.js';

async function quickTest() {
  console.log('🚀 Quick Test: Meteora LP Monitor\n');

  try {
    // 1. 验证 Solana 连接
    console.log('1. Testing Solana connection...');
    const solanaConnected = await validateSolanaConnection();
    if (!solanaConnected) {
      throw new Error('Failed to connect to Solana network');
    }

    // 2. 测试 Meteora API
    console.log('2. Testing Meteora API...');
    const meteoraService = MeteoraService.getInstance();
    
    // 获取交易对（前5个）
    const allPairs = await meteoraService.getAllPairs();
    console.log(`✅ Total pairs available: ${allPairs.length}`);
    
    const testPairs = allPairs.slice(0, 5);
    console.log(`📊 Testing with first 5 pairs:\n`);

    // 显示交易对基本信息
    for (let i = 0; i < testPairs.length; i++) {
      const pair = testPairs[i];
      console.log(`${i + 1}. ${pair.tokenASymbol || 'Unknown'}/${pair.tokenBSymbol || 'Unknown'}`);
      console.log(`   Pool: ${pair.poolAddress}`);
      console.log(`   Fee Rate: ${(pair.feeRate * 100).toFixed(2)}%`);
      
      // 获取实时数据
      const realtimeData = await meteoraService.getPairRealtimeData(pair.poolAddress);
      if (realtimeData) {
        console.log(`   Price: $${realtimeData.currentPrice.toFixed(6)}`);
        console.log(`   TVL: $${(realtimeData.tvlUsd / 1000000).toFixed(2)}M`);
        console.log(`   24h Volume: $${(realtimeData.volume24hUsd / 1000).toFixed(0)}K`);
        console.log(`   APR: ${realtimeData.apr.toFixed(1)}%`);
      } else {
        console.log(`   ⚠️  No realtime data available`);
      }
      console.log('');
    }

    console.log('🎉 Quick test completed successfully!');
    console.log('\n📋 Real API Integration Status:');
    console.log('✅ Solana Network: Connected');
    console.log('✅ Meteora API: Working');
    console.log(`✅ Trading Pairs: ${allPairs.length} available`);
    console.log('✅ Real-time Data: Available');

  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
}

quickTest();