import { validateSolanaConnection } from './config/solana.js';
import { MeteoraDLMMDiscoveryService } from './services/MeteoraDLMMDiscoveryService.js';

async function testDevnetPools() {
  console.log('🚀 Finding Working DLMM Pools on Devnet');
  console.log('=' .repeat(50));

  // 1. 验证连接
  const connectionValid = await validateSolanaConnection();
  if (!connectionValid) {
    console.error('❌ Failed to connect to Solana devnet');
    process.exit(1);
  }

  // 2. 获取池并验证前10个
  try {
    const discoveryService = MeteoraDLMMDiscoveryService.getInstance();
    const dlmmPools = await discoveryService.discoverDLMMPools();
    
    console.log(`\n📊 Found ${dlmmPools.length} total pools from API`);
    console.log('🔍 Validating first 10 pools for devnet availability...\n');
    
    const testPools = dlmmPools.slice(0, 10);
    const validPools = [];
    
    for (let i = 0; i < testPools.length; i++) {
      const pool = testPools[i];
      console.log(`${i + 1}. Testing ${pool.poolAddress}...`);
      
      try {
        const details = await discoveryService.getPoolDetails(pool.poolAddress);
        if (details) {
          validPools.push(details);
          console.log(`   ✅ VALID - ${details.tokenXSymbol}/${details.tokenYSymbol} (Bin Step: ${details.binStep})`);
        } else {
          console.log(`   ⚠️ Not available on devnet`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error?.message || 'Unknown error'}`);
      }
    }
    
    if (validPools.length > 0) {
      console.log(`\n🎉 Found ${validPools.length} working devnet pools:`);
      validPools.forEach((pool, index) => {
        console.log(`\n${index + 1}. Pool Address: ${pool.poolAddress}`);
        console.log(`   Trading Pair: ${pool.tokenXSymbol}/${pool.tokenYSymbol}`);
        console.log(`   Token X: ${pool.tokenX}`);
        console.log(`   Token Y: ${pool.tokenY}`);
        console.log(`   Bin Step: ${pool.binStep}`);
        console.log(`   Active: ${pool.isActive}`);
        console.log(`   Network: ${pool.network}`);
      });
      
      console.log('\n📋 Ready-to-use pool addresses for devnet:');
      validPools.forEach(pool => {
        console.log(`   '${pool.poolAddress}', // ${pool.tokenXSymbol}/${pool.tokenYSymbol}`);
      });
    } else {
      console.log('\n⚠️ No working devnet pools found in the first 10 tested.');
      console.log('   Using fallback known devnet pools...');
      
      // 显示已知的 devnet 池地址
      const knownPools = [
        '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6', // SOL/USDC
        '9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2'  // SOL/USDC (different bin step)
      ];
      
      console.log('\n📋 Known devnet pool addresses to try:');
      knownPools.forEach(address => {
        console.log(`   '${address}'`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error discovering pools:', error?.message || 'Unknown error');
  }

  console.log('\n✅ Devnet pool discovery completed!');
}

// 运行测试
testDevnetPools().catch(console.error);