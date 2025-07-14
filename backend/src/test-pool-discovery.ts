import { validateSolanaConnection } from './config/solana.js';
import { MeteoraService } from './services/MeteoraService.js';
import { MeteoraDLMMDiscoveryService } from './services/MeteoraDLMMDiscoveryService.js';

async function testPoolDiscovery() {
  console.log('🚀 Testing Meteora DLMM Pool Discovery on Devnet');
  console.log('=' .repeat(60));

  // 1. 验证 Solana 连接
  console.log('\n1. Validating Solana connection...');
  const connectionValid = await validateSolanaConnection();
  if (!connectionValid) {
    console.error('❌ Failed to connect to Solana');
    process.exit(1);
  }

  // 2. 测试直接的 DLMM 发现服务
  console.log('\n2. Testing DLMM Discovery Service...');
  try {
    const discoveryService = MeteoraDLMMDiscoveryService.getInstance();
    const dlmmPools = await discoveryService.discoverDLMMPools();
    
    console.log(`✅ Found ${dlmmPools.length} DLMM pools via discovery service`);
    
    if (dlmmPools.length > 0) {
      console.log('\n📊 Sample pools:');
      dlmmPools.slice(0, 3).forEach((pool, index) => {
        console.log(`  ${index + 1}. ${pool.poolAddress}`);
        console.log(`     ${pool.tokenXSymbol || 'UNKNOWN'}/${pool.tokenYSymbol || 'UNKNOWN'}`);
        console.log(`     Bin Step: ${pool.binStep}, Active: ${pool.isActive}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.error('❌ DLMM Discovery Service failed:', error?.message || 'Unknown error');
  }

  // 3. 测试 MeteoraService 集成
  console.log('\n3. Testing MeteoraService integration...');
  try {
    const meteoraService = MeteoraService.getInstance();
    const tradingPairs = await meteoraService.discoverDLMMPools();
    
    console.log(`✅ Found ${tradingPairs.length} trading pairs via MeteoraService`);
    
    if (tradingPairs.length > 0) {
      console.log('\n📊 Sample trading pairs:');
      tradingPairs.slice(0, 3).forEach((pair, index) => {
        console.log(`  ${index + 1}. ${pair.poolAddress}`);
        console.log(`     ${pair.tokenASymbol}/${pair.tokenBSymbol}`);
        console.log(`     Fee Rate: ${(pair.feeRate * 100).toFixed(3)}%, Active: ${pair.isActive}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.error('❌ MeteoraService integration failed:', error?.message || 'Unknown error');
  }

  // 4. 测试获取池详细信息
  console.log('\n4. Testing pool details retrieval...');
  try {
    const discoveryService = MeteoraDLMMDiscoveryService.getInstance();
    
    // 测试已知的池地址
    const testPools = [
      '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
      '9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2'
    ];
    
    for (const poolAddress of testPools) {
      console.log(`\n  Testing pool: ${poolAddress}`);
      const details = await discoveryService.getPoolDetails(poolAddress);
      
      if (details) {
        console.log(`  ✅ Pool details retrieved:`);
        console.log(`     ${details.tokenXSymbol || 'UNKNOWN'}/${details.tokenYSymbol || 'UNKNOWN'}`);
        console.log(`     Bin Step: ${details.binStep}, Active: ${details.isActive}`);
      } else {
        console.log(`  ⚠️ Could not retrieve details for pool ${poolAddress}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Pool details retrieval failed:', error?.message || 'Unknown error');
  }

  // 5. 测试传统的 getAllPairs 方法
  console.log('\n5. Testing traditional getAllPairs method...');
  try {
    const meteoraService = MeteoraService.getInstance();
    const allPairs = await meteoraService.getAllPairs();
    
    console.log(`✅ Found ${allPairs.length} pairs via getAllPairs`);
    
    if (allPairs.length > 0) {
      console.log('\n📊 Sample pairs from getAllPairs:');
      allPairs.slice(0, 3).forEach((pair, index) => {
        console.log(`  ${index + 1}. ${pair.poolAddress}`);
        console.log(`     ${pair.tokenASymbol}/${pair.tokenBSymbol}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.error('❌ getAllPairs method failed:', error?.message || 'Unknown error');
  }

  console.log('\n🎉 Pool discovery testing completed!');
  console.log('=' .repeat(60));
}

// 运行测试
testPoolDiscovery().catch(console.error);