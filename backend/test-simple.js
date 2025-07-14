/**
 * Simple test script for testing Meteora Trading API endpoints
 * This script uses basic HTTP requests to test the API without executing transactions
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TEST_WALLET_ID = 'wallet1';
const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7';

// Token addresses for testing
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testGetSupportedTokens() {
  console.log('🪙 Testing get supported tokens...');
  try {
    const response = await axios.get(`${BASE_URL}/api/trading/tokens`);
    console.log('✅ Supported tokens:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Get tokens failed:', error.message);
    return false;
  }
}

async function testGetPoolInfo() {
  console.log('🏊 Testing get pool info...');
  try {
    const response = await axios.get(`${BASE_URL}/api/trading/pool/${SOL_USDC_POOL}`);
    console.log('✅ Pool info:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Get pool info failed:', error.message);
    return false;
  }
}

async function testGetSwapQuote() {
  console.log('💱 Testing get swap quote...');
  try {
    const response = await axios.post(`${BASE_URL}/api/trading/quote`, {
      poolAddress: SOL_USDC_POOL,
      inputTokenMint: TOKENS.SOL,
      inputAmount: 0.1, // 0.1 SOL
      slippagePercent: 1
    });
    console.log('✅ Swap quote:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Get swap quote failed:', error.message);
    return false;
  }
}

async function testGetUserPositions() {
  console.log('📊 Testing get user positions...');
  try {
    const response = await axios.get(`${BASE_URL}/api/trading/positions/${TEST_WALLET_ID}`);
    console.log('✅ User positions:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Get user positions failed:', error.message);
    return false;
  }
}

// Test swap API (but with invalid wallet to avoid actual transaction)
async function testSwapAPI() {
  console.log('🔄 Testing swap API (should fail with invalid wallet)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/trading/swap`, {
      walletId: 'invalid_wallet', // Use invalid wallet to test validation
      poolAddress: SOL_USDC_POOL,
      inputTokenMint: TOKENS.SOL,
      outputTokenMint: TOKENS.USDC,
      inputAmount: 0.01,
      slippagePercent: 1
    });
    console.log('⚠️ Swap API test unexpected success:', response.data);
    return false;
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('✅ Swap API validation working (expected error for invalid wallet)');
      return true;
    }
    console.error('❌ Swap API test failed unexpectedly:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Meteora Trading API Tests');
  console.log('=====================================\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Get Supported Tokens', fn: testGetSupportedTokens },
    { name: 'Get Pool Info', fn: testGetPoolInfo },
    { name: 'Get Swap Quote', fn: testGetSwapQuote },
    { name: 'Get User Positions', fn: testGetUserPositions },
    { name: 'Swap API Validation', fn: testSwapAPI }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} passed`);
      } else {
        failed++;
        console.log(`❌ ${test.name} failed`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} failed with error:`, error.message);
    }
  }

  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the error messages above.');
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  testHealthCheck,
  testGetSupportedTokens,
  testGetPoolInfo,
  testGetSwapQuote,
  testGetUserPositions,
  testSwapAPI,
  runAllTests
};