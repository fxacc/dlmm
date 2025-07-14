import { Router, Request, Response } from 'express';
import { meteoraTradingServiceWorking } from '../services/MeteoraTradingServiceWorking.js';
import { TOKEN_ADDRESSES } from '../config/solana.js';

const router = Router();

/**
 * POST /api/trading/swap
 * 执行代币交换
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const {
      walletId,
      poolAddress,
      inputTokenMint,
      outputTokenMint,
      inputAmount,
      slippagePercent = 1
    } = req.body;

    // 验证必需参数
    if (!walletId || !poolAddress || !inputTokenMint || !outputTokenMint || !inputAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: walletId, poolAddress, inputTokenMint, outputTokenMint, inputAmount'
      });
    }

    // 验证数量
    if (inputAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Input amount must be greater than 0'
      });
    }

    // 执行交换
    const result = await meteoraTradingServiceWorking.executeSwap({
      walletId,
      poolAddress,
      inputTokenMint,
      outputTokenMint,
      inputAmount: Math.floor(inputAmount * (inputTokenMint === TOKEN_ADDRESSES.SOL ? 1e9 : 1e6)), // 转换为最小单位
      slippagePercent
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Swap API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/trading/add-liquidity
 * 添加流动性
 */
router.post('/add-liquidity', async (req: Request, res: Response) => {
  try {
    const {
      walletId,
      poolAddress,
      tokenAAmount,
      tokenBAmount,
      minTokenAAmount,
      minTokenBAmount,
      activeBin,
      maxBinId,
      minBinId
    } = req.body;

    // 验证必需参数
    if (!walletId || !poolAddress || !tokenAAmount || !tokenBAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: walletId, poolAddress, tokenAAmount, tokenBAmount'
      });
    }

    // 验证数量
    if (tokenAAmount <= 0 || tokenBAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Token amounts must be greater than 0'
      });
    }

    // 执行添加流动性
    const result = await meteoraTradingServiceWorking.addLiquidity({
      walletId,
      poolAddress,
      tokenAAmount: Math.floor(tokenAAmount * 1e9), // SOL decimals
      tokenBAmount: Math.floor(tokenBAmount * 1e6), // USDC decimals
      minTokenAAmount: minTokenAAmount ? Math.floor(minTokenAAmount * 1e9) : undefined,
      minTokenBAmount: minTokenBAmount ? Math.floor(minTokenBAmount * 1e6) : undefined,
      activeBin,
      maxBinId,
      minBinId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Add liquidity API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/trading/remove-liquidity
 * 移除流动性
 */
router.post('/remove-liquidity', async (req: Request, res: Response) => {
  try {
    const {
      walletId,
      positionAddress,
      binIds,
      liquidityShares
    } = req.body;

    // 验证必需参数
    if (!walletId || !positionAddress || !binIds || !Array.isArray(binIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: walletId, positionAddress, binIds (array)'
      });
    }

    // 默认liquidityShares（如果未提供）
    const shares = liquidityShares || binIds.map(() => '100'); // 默认移除100%

    if (shares.length !== binIds.length) {
      return res.status(400).json({
        success: false,
        error: 'liquidityShares array length must match binIds array length'
      });
    }

    // 执行移除流动性
    const result = await meteoraTradingServiceWorking.removeLiquidity({
      walletId,
      positionAddress,
      binIds,
      liquidityShares: shares
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Remove liquidity API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/trading/quote
 * 获取交换报价
 */
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const {
      poolAddress,
      inputTokenMint,
      inputAmount,
      slippagePercent = 1
    } = req.body;

    // 验证必需参数
    if (!poolAddress || !inputTokenMint || !inputAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: poolAddress, inputTokenMint, inputAmount'
      });
    }

    // 验证数量
    if (inputAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Input amount must be greater than 0'
      });
    }

    // 获取报价
    const quote = await meteoraTradingServiceWorking.getSwapQuote(
      poolAddress,
      inputTokenMint,
      Math.floor(inputAmount * (inputTokenMint === TOKEN_ADDRESSES.SOL ? 1e9 : 1e6)),
      slippagePercent
    );

    res.json({
      success: true,
      data: {
        inputAmount: quote.inAmount.toString(),
        outputAmount: quote.outAmount.toString(),
        minimumOutputAmount: quote.outAmountMin.toString(),
        priceImpact: quote.priceImpact.toString(),
        fee: quote.fee.toString(),
        slippagePercent
      }
    });

  } catch (error) {
    console.error('Quote API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/trading/positions/:walletId
 * 获取用户位置信息
 */
router.get('/positions/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Missing walletId parameter'
      });
    }

    // 获取用户位置
    const positions = await meteoraTradingServiceWorking.getUserPositions(walletId);

    res.json({
      success: true,
      data: positions
    });

  } catch (error) {
    console.error('Get positions API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/trading/pool/:poolAddress
 * 获取池信息
 */
router.get('/pool/:poolAddress', async (req: Request, res: Response) => {
  try {
    const { poolAddress } = req.params;

    if (!poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing poolAddress parameter'
      });
    }

    // 获取池信息
    const poolInfo = await meteoraTradingServiceWorking.getPoolInfo(poolAddress);

    res.json({
      success: true,
      data: poolInfo
    });

  } catch (error) {
    console.error('Get pool info API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/trading/tokens
 * 获取支持的代币列表
 */
router.get('/tokens', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        supportedTokens: TOKEN_ADDRESSES,
        network: process.env.SOLANA_NETWORK || 'devnet',
        commonPairs: [
          {
            name: 'SOL/USDC',
            poolAddress: 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
            tokenA: TOKEN_ADDRESSES.SOL,
            tokenB: TOKEN_ADDRESSES.USDC,
            tokenASymbol: 'SOL',
            tokenBSymbol: 'USDC'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get tokens API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;