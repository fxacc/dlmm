/**
 * Basic test to verify Meteora SDK functionality
 * Testing import and basic API calls
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { connection, TOKEN_ADDRESSES } from './config/solana.js';

async function testMeteoraImport() {
  console.log('🔍 Testing Meteora SDK import...');
  
  try {
    // Dynamic import to handle ES modules properly
    const meteora = await import('@meteora-ag/dlmm');
    console.log('✅ Meteora SDK imported successfully');
    console.log('📦 Available exports:', Object.keys(meteora).slice(0, 10));
    console.log('🔧 Default export type:', typeof meteora.default);
    console.log('🔧 DLMM.create method:', typeof meteora.default?.create);
    
    // Test creating a DLMM instance
    const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7'; // Valid Mainnet SOL/USDC pool
    const poolPubkey = new PublicKey(SOL_USDC_POOL);
    
    console.log('\n🏊 Testing pool connection...');
    console.log('Pool address:', SOL_USDC_POOL);
    console.log('Network:', process.env.SOLANA_NETWORK || 'devnet');
    
    const DLMM = meteora.default;
    console.log('Creating DLMM instance...');
    
    const lbPair = await DLMM.create(connection, poolPubkey);
    console.log('✅ DLMM instance created successfully');
    
    // Get pool info
    console.log('\n📊 Getting pool information...');
    const lbPairAccount = await lbPair.getLbPair();
    console.log('Pool token X:', lbPairAccount.tokenXMint.toString());
    console.log('Pool token Y:', lbPairAccount.tokenYMint.toString());
    console.log('Bin step:', lbPairAccount.binStep);
    
    // Get active bin
    const activeBin = await lbPair.getActiveBin();
    console.log('Active bin ID:', activeBin.binId);
    console.log('Active bin price:', activeBin.price);
    
    console.log('\n✅ All basic tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    return false;
  }
}

async function testQuote() {
  console.log('\n💱 Testing swap quote...');
  
  try {
    const meteora = await import('@meteora-ag/dlmm');
    const DLMM = meteora.default;
    const BN = (await import('bn.js')).default;
    
    const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7'; // Valid Mainnet SOL/USDC pool
    const poolPubkey = new PublicKey(SOL_USDC_POOL);
    
    const lbPair = await DLMM.create(connection, poolPubkey);
    
    // Test quote for small amount
    const inputAmount = new BN(0.01 * 1e9); // 0.01 SOL
    const quote = await lbPair.swapQuote(
      new PublicKey(TOKEN_ADDRESSES.SOL),
      inputAmount,
      1, // 1% slippage
      true
    );
    
    console.log('Quote results:');
    console.log('Input amount:', inputAmount.toString(), 'lamports (0.01 SOL)');
    console.log('Output amount:', quote.outAmount.toString(), 'micro-USDC');
    console.log('Output amount (USDC):', parseFloat(quote.outAmount.toString()) / 1e6, 'USDC');
    console.log('Minimum output:', quote.outAmountMin.toString(), 'micro-USDC');
    console.log('Price impact:', quote.priceImpact.toString());
    console.log('Fee:', quote.fee.toString(), 'micro-USDC');
    
    console.log('✅ Quote test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Quote test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Meteora SDK Basic Test Suite');
  console.log('================================\n');
  
  let passed = 0;
  let total = 2;
  
  // Test 1: Basic import and pool connection
  if (await testMeteoraImport()) {
    passed++;
  }
  
  // Test 2: Quote functionality
  if (await testQuote()) {
    passed++;
  }
  
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Success rate: ${(passed/total*100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Meteora SDK is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the error messages above.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}