/**
 * Working demo of Meteora DLMM functionality
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { connection, TOKEN_ADDRESSES } from './config/solana.js';
import { walletService } from './config/wallet.js';

const WALLET_ID = 'wallet1';
const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7';

async function testWorkingDemo() {
  console.log('🎯 Meteora Trading Demo - Working Version');
  console.log('=========================================');
  console.log(`Network: ${process.env.SOLANA_NETWORK}`);
  console.log(`Pool: ${SOL_USDC_POOL}`);
  console.log(`Wallet: ${WALLET_ID}\n`);
  
  try {
    // 1. Test wallet validation
    console.log('1️⃣ Testing wallet validation...');
    const keypair = walletService.getWalletKeypair(WALLET_ID);
    if (!keypair) {
      throw new Error(`Wallet ${WALLET_ID} not found`);
    }
    
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`✅ Wallet validated`);
    console.log(`   Public key: ${keypair.publicKey.toString()}`);
    console.log(`   SOL balance: ${balance / 1e9} SOL`);
    
    // 2. Test DLMM pool connection
    console.log('\n2️⃣ Testing pool connection...');
    const meteora = await import('@meteora-ag/dlmm');
    const DLMM = meteora.default;
    
    const poolPubkey = new PublicKey(SOL_USDC_POOL);
    const lbPair = await DLMM.create(connection, poolPubkey);
    console.log(`✅ Pool connected successfully`);
    
    // 3. Get pool information
    console.log('\n3️⃣ Getting pool information...');
    const activeBin = await lbPair.getActiveBin();
    console.log(`✅ Pool info retrieved:`);
    console.log(`   Active bin ID: ${activeBin.binId}`);
    console.log(`   Current price: ${activeBin.price} USDC per SOL`);
    console.log(`   Token X: ${lbPair.lbPair.tokenXMint.toString()}`);
    console.log(`   Token Y: ${lbPair.lbPair.tokenYMint.toString()}`);
    console.log(`   Bin step: ${lbPair.lbPair.binStep}`);
    
    // 4. Test fee info
    console.log('\n4️⃣ Getting fee information...');
    try {
      const feeInfo = await lbPair.getFeeInfo();
      console.log(`✅ Fee info:`);
      console.log(`   Base fee: ${feeInfo.baseFeeRatePercentage}%`);
      console.log(`   Max fee: ${feeInfo.maxFeeRatePercentage}%`);
      console.log(`   Protocol fee: ${feeInfo.protocolFeeRatePercentage}%`);
    } catch (e) {
      console.log(`⚠️ Fee info not available: ${e.message}`);
    }
    
    // 5. Test bin information around active bin
    console.log('\n5️⃣ Getting bins around active bin...');
    try {
      const binsAround = await lbPair.getBinsAroundActiveBin(5); // 5 bins each side
      console.log(`✅ Found ${binsAround.length} bins around active bin`);
      
      // Show some bin data
      binsAround.slice(0, 3).forEach((bin, i) => {
        console.log(`   Bin ${i}: ID=${bin.binId}, price=${bin.price}, liquidityX=${bin.liquidityX}, liquidityY=${bin.liquidityY}`);
      });
    } catch (e) {
      console.log(`⚠️ Bins info not available: ${e.message}`);
    }
    
    // 6. Test static methods
    console.log('\n6️⃣ Testing static methods...');
    try {
      const allPairs = await DLMM.getLbPairs(connection);
      console.log(`✅ Found ${allPairs.length} total LB pairs on network`);
    } catch (e) {
      console.log(`⚠️ Get all pairs failed: ${e.message}`);
    }
    
    // 7. Test position queries (read-only)
    console.log('\n7️⃣ Testing position queries...');
    try {
      const positions = await lbPair.getPositionsByUserAndLbPair(keypair.publicKey);
      console.log(`✅ User has ${positions.length} positions in this pool`);
      if (positions.length > 0) {
        positions.forEach((pos, i) => {
          console.log(`   Position ${i}: ${pos.toString()}`);
        });
      }
    } catch (e) {
      console.log(`⚠️ Position query failed: ${e.message}`);
    }
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Wallet validation works');
    console.log('✅ Pool connection works');
    console.log('✅ Pool data retrieval works');
    console.log('✅ SDK integration is functional');
    console.log('\n🚀 Ready for trading operations!');
    console.log('Note: Actual trading requires proper quote handling and transaction signing.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API endpoints...');
  
  // Test if server is running by checking health endpoint
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data.message);
      return true;
    } else {
      console.log('❌ Server is not responding properly');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running. Start it with: npm start');
    console.log('   Then you can test API endpoints with: npm run test:api');
    return false;
  }
}

async function main() {
  const demoSuccess = await testWorkingDemo();
  const serverRunning = await testAPIEndpoints();
  
  console.log('\n📊 Final Status:');
  console.log(`Meteora SDK Integration: ${demoSuccess ? '✅ Working' : '❌ Failed'}`);
  console.log(`API Server: ${serverRunning ? '✅ Running' : '❌ Not Running'}`);
  
  if (demoSuccess && !serverRunning) {
    console.log('\n🚀 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test API endpoints: npm run test:api');
    console.log('3. Test trading operations with small amounts');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}