/**
 * Test Meteora SDK methods to understand the API
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { connection, TOKEN_ADDRESSES } from './config/solana.js';

async function testMethods() {
  console.log('🔍 Testing Meteora SDK methods...');
  
  try {
    const meteora = await import('@meteora-ag/dlmm');
    const DLMM = meteora.default;
    const BN = (await import('bn.js')).default;
    
    const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7';
    const poolPubkey = new PublicKey(SOL_USDC_POOL);
    
    console.log('Creating DLMM instance...');
    const lbPair = await DLMM.create(connection, poolPubkey);
    console.log('✅ DLMM instance created');
    
    console.log('\n📋 Available methods on lbPair instance:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(lbPair));
    methods.forEach(method => {
      if (typeof lbPair[method] === 'function') {
        console.log(`  - ${method}()`);
      }
    });
    
    console.log('\n📋 Available properties on lbPair instance:');
    Object.keys(lbPair).forEach(prop => {
      console.log(`  - ${prop}: ${typeof lbPair[prop]} = ${lbPair[prop]}`);
    });
    
    // Test some basic methods
    console.log('\n🧪 Testing methods:');
    
    try {
      const activeBin = await lbPair.getActiveBin();
      console.log('✅ getActiveBin() works:', {
        binId: activeBin.binId,
        price: activeBin.price
      });
    } catch (e) {
      console.log('❌ getActiveBin() failed:', e.message);
    }
    
    try {
      if (lbPair.pubkey) {
        console.log('✅ Pool pubkey:', lbPair.pubkey.toString());
      }
    } catch (e) {
      console.log('❌ pubkey access failed:', e.message);
    }
    
    try {
      if (lbPair.lbPair) {
        console.log('✅ lbPair data available');
        console.log('   tokenXMint:', lbPair.lbPair.tokenXMint?.toString());
        console.log('   tokenYMint:', lbPair.lbPair.tokenYMint?.toString());
      }
    } catch (e) {
      console.log('❌ lbPair data access failed:', e.message);
    }
    
    // Test quote with proper BN
    console.log('\n💱 Testing quote...');
    try {
      const inputAmount = new BN(0.01 * 1e9); // 0.01 SOL
      console.log('Input amount BN:', inputAmount.toString());
      console.log('Input amount type:', typeof inputAmount);
      console.log('Input amount has isZero:', typeof inputAmount.isZero);
      
      const quote = await lbPair.swapQuote(
        new PublicKey(TOKEN_ADDRESSES.SOL),
        inputAmount,
        1,
        true
      );
      
      console.log('✅ Quote successful:', {
        inAmount: quote.inAmount.toString(),
        outAmount: quote.outAmount.toString(),
        priceImpact: quote.priceImpact.toString()
      });
    } catch (e) {
      console.log('❌ Quote failed:', e.message);
      console.log('Error stack:', e.stack);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testMethods().catch(console.error);
}