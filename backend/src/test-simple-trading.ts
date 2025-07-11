import { meteoraTradingServiceSimple } from './services/MeteoraTradingServiceSimple.js';
import { TOKEN_ADDRESSES, NETWORK } from './config/solana.js';
import { walletService } from './config/wallet.js';

/**
 * 简化测试脚本：验证基本功能
 * 1. 验证钱包配置
 * 2. 获取池信息
 * 3. 获取交换报价
 * 4. 检查余额
 */

const WALLET_ID = 'wallet1';
const SOL_USDC_POOL = '8gJ7UWboMeQ6z6AQwFP3cAZwSYG8udVS2UesyCbH79r7'; // Valid Mainnet SOL/USDC pool

async function testBasicFunctionality() {
  console.log('🚀 Starting basic functionality test...');
  console.log(`📊 Network: ${NETWORK}`);
  console.log(`💰 Wallet ID: ${WALLET_ID}`);
  
  try {
    // 测试1: 验证钱包配置
    console.log('\n1️⃣ Testing wallet validation...');
    const isValidWallet = await meteoraTradingServiceSimple.validateWallet(WALLET_ID);
    
    if (!isValidWallet) {
      console.log('❌ Wallet validation failed. Please check wallet.json configuration.');
      return;
    }
    console.log('✅ Wallet validation passed');

    // 测试2: 获取池信息
    console.log('\n2️⃣ Testing pool info...');
    const poolInfo = await meteoraTradingServiceSimple.getPoolInfo(SOL_USDC_POOL);
    console.log('✅ Pool info test passed:', poolInfo);

    // 测试3: 获取交换报价
    console.log('\n3️⃣ Testing swap quote...');
    const quote = await meteoraTradingServiceSimple.getSwapQuote(
      SOL_USDC_POOL,
      TOKEN_ADDRESSES.SOL,
      0.01 * 1e9, // 0.01 SOL in lamports
      1 // 1% slippage
    );
    
    console.log('✅ Swap quote test passed:', {
      inputAmount: `0.01 SOL`,
      outputAmount: `${parseFloat(quote.outAmount.toString()) / 1e6} USDC`,
      minimumOutput: `${parseFloat(quote.outAmountMin.toString()) / 1e6} USDC`,
      priceImpact: `${quote.priceImpact.toString()}%`,
      fee: `${parseFloat(quote.fee.toString()) / 1e6} USDC`
    });

    // 测试4: 检查代币余额
    console.log('\n4️⃣ Testing token balances...');
    const solBalance = await meteoraTradingServiceSimple.getTokenBalance(WALLET_ID, TOKEN_ADDRESSES.SOL);
    const usdcBalance = await meteoraTradingServiceSimple.getTokenBalance(WALLET_ID, TOKEN_ADDRESSES.USDC);
    
    console.log('✅ Balance check passed:', {
      SOL: `${solBalance / 1e9} SOL`,
      USDC: `${usdcBalance / 1e6} USDC`
    });

    console.log('\n🎉 All basic functionality tests passed!');
    console.log('\n📋 Next steps:');
    console.log('- To test actual swap, ensure you have sufficient SOL balance');
    console.log('- Run full test with: npm run test:trading:full');
    console.log('- Check API endpoints with: npm run test:api');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔍 Troubleshooting:');
    console.log('- Make sure your wallet.json is properly configured');
    console.log('- Check if you are connected to the correct network');
    console.log('- Verify the pool address is correct for your network');
    console.log('- Ensure you have internet connectivity');
    
    process.exit(1);
  }
}

async function testActualSwap() {
  console.log('\n💸 Testing actual swap operation...');
  console.log('⚠️ This will execute a real transaction!');
  
  try {
    // Check balance first
    const solBalance = await meteoraTradingServiceSimple.getTokenBalance(WALLET_ID, TOKEN_ADDRESSES.SOL);
    const swapAmount = 0.01 * 1e9; // 0.01 SOL
    
    if (solBalance < swapAmount + 0.005 * 1e9) { // Need extra for fees
      console.log('❌ Insufficient SOL balance for swap test');
      console.log(`Current balance: ${solBalance / 1e9} SOL`);
      console.log(`Required: ${(swapAmount + 0.005 * 1e9) / 1e9} SOL (including fees)`);
      return;
    }

    console.log(`💰 Current SOL balance: ${solBalance / 1e9} SOL`);
    console.log(`💱 Swapping: 0.01 SOL to USDC`);
    
    const swapResult = await meteoraTradingServiceSimple.executeSwap({
      walletId: WALLET_ID,
      poolAddress: SOL_USDC_POOL,
      inputTokenMint: TOKEN_ADDRESSES.SOL,
      outputTokenMint: TOKEN_ADDRESSES.USDC,
      inputAmount: swapAmount,
      slippagePercent: 1
    });

    console.log('✅ Swap test completed:', swapResult);
    
  } catch (error) {
    console.error('❌ Swap test failed:', error);
  }
}

// 主函数
async function main() {
  console.log('🧪 Meteora Trading Service - Simple Test Suite');
  console.log('==============================================');

  const args = process.argv.slice(2);
  const testType = args[0] || 'basic';

  if (testType === 'swap') {
    console.log('Running actual swap test (WILL EXECUTE TRANSACTION)...');
    await testBasicFunctionality(); // First run basic tests
    await testActualSwap();
  } else {
    console.log('Running basic functionality test (NO TRANSACTIONS)...');
    await testBasicFunctionality();
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testBasicFunctionality, testActualSwap };