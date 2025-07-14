import { meteoraTradingService } from './services/MeteoraTradingService.js';
import { TOKEN_ADDRESSES, NETWORK } from './config/solana.js';
import { walletService } from './config/wallet.js';

/**
 * 测试脚本：验证完整的交易流程
 * 1. SOL swap to USDC
 * 2. Add LP (SOL + USDC)
 * 3. Remove LP
 */

const WALLET_ID = 'testnet_wallet'; // 请确保这个钱包在wallet.json中配置
const SOL_USDC_POOL = 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA'; // 主网池地址，测试网可能需要调整

// 测试金额（较小金额用于测试）
const SWAP_AMOUNT = 0.1; // 0.1 SOL
const LP_SOL_AMOUNT = 0.05; // 0.05 SOL
const LP_USDC_AMOUNT = 5; // 5 USDC (approximate)

async function testCompleteFlow() {
  console.log('🚀 Starting complete trading flow test...');
  console.log(`📊 Network: ${NETWORK}`);
  console.log(`💰 Wallet ID: ${WALLET_ID}`);
  
  try {
    // 验证钱包配置
    console.log('\n1️⃣ Verifying wallet configuration...');
    if (!walletService.isWalletConfigured(WALLET_ID)) {
      throw new Error(`Wallet ${WALLET_ID} is not properly configured. Please check wallet.json`);
    }
    
    const walletPublicKey = walletService.getWalletPublicKey(WALLET_ID);
    console.log(`✅ Wallet verified: ${walletPublicKey}`);

    // 获取池信息
    console.log('\n2️⃣ Getting pool information...');
    const poolInfo = await meteoraTradingService.getPoolInfo(SOL_USDC_POOL);
    console.log('📊 Pool info:', poolInfo);

    // 测试1: 获取交换报价
    console.log('\n3️⃣ Getting swap quote...');
    const quote = await meteoraTradingService.getSwapQuote(
      SOL_USDC_POOL,
      TOKEN_ADDRESSES.SOL,
      SWAP_AMOUNT * 1e9, // Convert to lamports
      1 // 1% slippage
    );
    
    console.log('💱 Swap quote:', {
      inputAmount: `${SWAP_AMOUNT} SOL`,
      outputAmount: `${parseFloat(quote.outAmount.toString()) / 1e6} USDC`,
      minimumOutput: `${parseFloat(quote.outAmountMin.toString()) / 1e6} USDC`,
      priceImpact: `${quote.priceImpact.toString()}%`,
      fee: `${parseFloat(quote.fee.toString()) / 1e6} USDC`
    });

    // 测试2: 执行SOL到USDC的交换
    console.log('\n4️⃣ Executing SOL to USDC swap...');
    const swapResult = await meteoraTradingService.executeSwap({
      walletId: WALLET_ID,
      poolAddress: SOL_USDC_POOL,
      inputTokenMint: TOKEN_ADDRESSES.SOL,
      outputTokenMint: TOKEN_ADDRESSES.USDC,
      inputAmount: SWAP_AMOUNT * 1e9, // Convert to lamports
      slippagePercent: 1
    });
    
    console.log('✅ Swap completed:', {
      txHash: swapResult.txHash,
      inputAmount: `${parseFloat(swapResult.inputAmount) / 1e9} SOL`,
      outputAmount: `${parseFloat(swapResult.outputAmount) / 1e6} USDC`,
      priceImpact: `${swapResult.priceImpact}%`,
      fee: `${parseFloat(swapResult.fee) / 1e6} USDC`
    });

    // 等待交易确认
    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 测试3: 添加流动性
    console.log('\n5️⃣ Adding liquidity...');
    const addLiquidityResult = await meteoraTradingService.addLiquidity({
      walletId: WALLET_ID,
      poolAddress: SOL_USDC_POOL,
      tokenAAmount: LP_SOL_AMOUNT * 1e9, // SOL amount in lamports
      tokenBAmount: LP_USDC_AMOUNT * 1e6, // USDC amount in micro-USDC
      minTokenAAmount: (LP_SOL_AMOUNT * 0.95) * 1e9, // 5% slippage
      minTokenBAmount: (LP_USDC_AMOUNT * 0.95) * 1e6 // 5% slippage
    });

    console.log('✅ Liquidity added:', {
      txHash: addLiquidityResult.txHash,
      positionAddress: addLiquidityResult.positionAddress,
      tokenAAmount: `${parseFloat(addLiquidityResult.tokenAAmount) / 1e9} SOL`,
      tokenBAmount: `${parseFloat(addLiquidityResult.tokenBAmount) / 1e6} USDC`,
      binIds: addLiquidityResult.binIds
    });

    // 等待交易确认
    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 测试4: 获取用户位置
    console.log('\n6️⃣ Getting user positions...');
    const positions = await meteoraTradingService.getUserPositions(WALLET_ID);
    console.log(`📊 Found ${positions.length} positions:`);
    positions.forEach((position, index) => {
      console.log(`Position ${index + 1}:`, position);
    });

    // 测试5: 移除流动性（如果有位置的话）
    if (addLiquidityResult.positionAddress && addLiquidityResult.binIds.length > 0) {
      console.log('\n7️⃣ Removing liquidity...');
      const removeLiquidityResult = await meteoraTradingService.removeLiquidity({
        walletId: WALLET_ID,
        positionAddress: addLiquidityResult.positionAddress,
        binIds: addLiquidityResult.binIds,
        liquidityShares: addLiquidityResult.binIds.map(() => '50') // Remove 50% of liquidity
      });

      console.log('✅ Liquidity removed:', {
        txHash: removeLiquidityResult.txHash,
        positionAddress: removeLiquidityResult.positionAddress,
        binIds: removeLiquidityResult.binIds
      });
    }

    console.log('\n🎉 Complete trading flow test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    
    // 提供调试信息
    console.log('\n🔍 Debug information:');
    console.log('- Make sure your wallet.json is properly configured');
    console.log('- Ensure you have sufficient SOL balance for testing');
    console.log('- Check if you are connected to the correct network');
    console.log('- Verify the pool address is correct for your network');
    
    process.exit(1);
  }
}

async function testIndividualOperations() {
  console.log('\n🧪 Testing individual operations...');

  try {
    // Test quote only
    console.log('\n🔍 Testing quote functionality...');
    const quote = await meteoraTradingService.getSwapQuote(
      SOL_USDC_POOL,
      TOKEN_ADDRESSES.SOL,
      0.01 * 1e9, // 0.01 SOL
      1
    );
    
    console.log('✅ Quote test passed:', {
      inputAmount: '0.01 SOL',
      outputAmount: `${parseFloat(quote.outAmount.toString()) / 1e6} USDC`,
      priceImpact: `${quote.priceImpact.toString()}%`
    });

    // Test pool info
    console.log('\n🔍 Testing pool info functionality...');
    const poolInfo = await meteoraTradingService.getPoolInfo(SOL_USDC_POOL);
    console.log('✅ Pool info test passed:', poolInfo);

    console.log('\n✅ Individual operations test completed successfully!');

  } catch (error) {
    console.error('\n❌ Individual operations test failed:', error);
  }
}

// 主函数
async function main() {
  console.log('🏁 Meteora Trading Service Test Suite');
  console.log('=====================================');

  // 检查命令行参数
  const args = process.argv.slice(2);
  const testType = args[0] || 'individual';

  if (testType === 'full') {
    console.log('Running full trading flow test (includes actual transactions)...');
    await testCompleteFlow();
  } else {
    console.log('Running individual operations test (no transactions)...');
    await testIndividualOperations();
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testCompleteFlow, testIndividualOperations };