/**
 * Find valid Meteora DLMM pools
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { connection } from './config/solana.js';

async function findValidPools() {
  console.log('🔍 Searching for valid Meteora DLMM pools...');
  
  // Known pool addresses from various sources
  const potentialPools = [
    'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA', // Original SOL/USDC
    'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE', // mSOL/SOL
    'DdpuaJgjB2RptGMnfnCZVmC4vkKsMV6SvRDYgxwTZh5A', // BONK/SOL
    'FQhNLi5xY9YPNwJf8dE8L5HTYKLkJ9ZXQe5JHJ7BWVk', // USDT/USDC
    'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // JUP/SOL
    '284iwGtA9X9aLy3KsyV6uhyshAKNiq1vLb74Qhgzr5cB', // SOL/USDC alternative
    '5BUwFW4nRbftYTDMbgxykoFWqWHPzahFSNAaaaJtVKsq', // SOL/USDC another
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'  // This might be the program ID
  ];

  for (const poolAddress of potentialPools) {
    try {
      console.log(`\n🔍 Testing pool: ${poolAddress}`);
      
      const pubkey = new PublicKey(poolAddress);
      const accountInfo = await connection.getAccountInfo(pubkey);
      
      if (accountInfo) {
        console.log(`✅ Account exists`);
        console.log(`   Owner: ${accountInfo.owner.toString()}`);
        console.log(`   Data length: ${accountInfo.data.length}`);
        console.log(`   Lamports: ${accountInfo.lamports}`);
        
        // Try to create DLMM instance
        try {
          const meteora = await import('@meteora-ag/dlmm');
          const DLMM = meteora.default;
          const lbPair = await DLMM.create(connection, pubkey);
          console.log(`✅ DLMM instance created successfully!`);
          
          // Try to get pool info
          const lbPairAccount = await lbPair.getLbPair();
          console.log(`✅ Pool info retrieved:`);
          console.log(`   Token X: ${lbPairAccount.tokenXMint.toString()}`);
          console.log(`   Token Y: ${lbPairAccount.tokenYMint.toString()}`);
          console.log(`   Bin step: ${lbPairAccount.binStep}`);
          
          // This is a valid pool!
          console.log(`\n🎉 FOUND VALID POOL: ${poolAddress}`);
          return poolAddress;
          
        } catch (dlmmError) {
          console.log(`❌ DLMM creation failed: ${dlmmError.message}`);
        }
      } else {
        console.log(`❌ Account does not exist`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${poolAddress}: ${error.message}`);
    }
  }
  
  console.log('\n❌ No valid pools found in the test list');
  return null;
}

async function testMeteoraAPI() {
  console.log('\n🌐 Testing Meteora API...');
  
  try {
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    const data = await response.json();
    
    console.log(`✅ API responded with ${data.length} pools`);
    
    // Find SOL/USDC pools
    const solUsdcPools = data.filter((pool: any) => 
      (pool.mint_x === 'So11111111111111111111111111111111111111112' && 
       pool.mint_y === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') ||
      (pool.mint_y === 'So11111111111111111111111111111111111111112' && 
       pool.mint_x === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );
    
    console.log(`\n📊 Found ${solUsdcPools.length} SOL/USDC pools:`);
    
    for (const pool of solUsdcPools.slice(0, 5)) {
      console.log(`\n🏊 Pool: ${pool.address}`);
      console.log(`   Name: ${pool.name}`);
      console.log(`   Liquidity: ${pool.liquidity}`);
      console.log(`   Current Price: ${pool.current_price}`);
      console.log(`   24h Volume: ${pool.trade_volume_24h}`);
      
      // Test if this pool works
      try {
        const meteora = await import('@meteora-ag/dlmm');
        const DLMM = meteora.default;
        const pubkey = new PublicKey(pool.address);
        const lbPair = await DLMM.create(connection, pubkey);
        console.log(`   ✅ Pool is accessible via SDK`);
        return pool.address;
      } catch (error) {
        console.log(`   ❌ Pool SDK test failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
  
  return null;
}

async function main() {
  console.log('🎯 Pool Discovery Test');
  console.log('=====================\n');
  console.log(`Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  console.log(`RPC: ${process.env.SOLANA_RPC_URL || 'default'}`);
  
  // Method 1: Test known pools
  let validPool = await findValidPools();
  
  // Method 2: Test pools from API
  if (!validPool) {
    validPool = await testMeteoraAPI();
  }
  
  if (validPool) {
    console.log(`\n🎉 SUCCESS! Valid pool found: ${validPool}`);
    console.log(`\nYou can use this pool address in your tests.`);
  } else {
    console.log(`\n❌ No valid pools found. This could mean:`);
    console.log(`   - Wrong network configuration`);
    console.log(`   - RPC issues`);
    console.log(`   - SDK version mismatch`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}