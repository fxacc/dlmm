import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import DLMM, { 
  BinLiquidity,
  StrategyType
} from '@meteora-ag/dlmm';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  NATIVE_MINT
} from '@solana/spl-token';
import BN from 'bn.js';
import { connection, TOKEN_ADDRESSES, NETWORK } from '../config/solana.js';
import { walletService } from '../config/wallet.js';

export interface SwapParams {
  walletId: string;
  poolAddress: string;
  inputTokenMint: string;
  outputTokenMint: string;
  inputAmount: number;
  slippagePercent: number;
}

export interface AddLiquidityParams {
  walletId: string;
  poolAddress: string;
  tokenAAmount: number;
  tokenBAmount: number;
  minTokenAAmount?: number;
  minTokenBAmount?: number;
  activeBin?: number;
  maxBinId?: number;
  minBinId?: number;
}

export interface RemoveLiquidityParams {
  walletId: string;
  positionAddress: string;
  binIds: number[];
  liquidityShares: string[];
}

export interface SwapResult {
  txHash: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  fee: string;
}

export interface LiquidityResult {
  txHash: string;
  positionAddress?: string;
  tokenAAmount: string;
  tokenBAmount: string;
  binIds: number[];
}

export interface SwapQuoteResponse {
  inAmount: BN;
  outAmount: BN;
  outAmountMin: BN;
  priceImpact: BN;
  fee: BN;
  binArraysPubkey: PublicKey[];
}

export interface LiquidityParameterByAmounts {
  amountX: BN;
  amountY: BN;
  activeId: number;
  maxActiveBinSlippage: number;
  strategyType: StrategyType;
  maxBinId: number;
  minBinId: number;
}

export class MeteoraTradingService {
  private static instance: MeteoraTradingService;
  private connection: Connection;

  private constructor() {
    this.connection = connection;
  }

  public static getInstance(): MeteoraTradingService {
    if (!MeteoraTradingService.instance) {
      MeteoraTradingService.instance = new MeteoraTradingService();
    }
    return MeteoraTradingService.instance;
  }

  /**
   * 执行代币交换
   */
  async executeSwap(params: SwapParams): Promise<SwapResult> {
    try {
      console.log('🔄 Starting swap operation...');
      
      // 验证钱包
      const keypair = walletService.getWalletKeypair(params.walletId);
      if (!keypair) {
        throw new Error(`Wallet ${params.walletId} not found or invalid`);
      }

      // 获取池信息
      const poolPubkey = new PublicKey(params.poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      // 获取交换报价
      const inputAmountBN = new BN(params.inputAmount);
      const quote = await lbPair.swapQuote(
        new PublicKey(params.inputTokenMint),
        inputAmountBN,
        params.slippagePercent,
        true
      );

      console.log('💰 Swap quote:', {
        inputAmount: quote.inAmount.toString(),
        outputAmount: quote.outAmount.toString(),
        priceImpact: quote.priceImpact.toString(),
        fee: quote.fee.toString()
      });

      // 构建交换交易
      const swapTx = await lbPair.swap({
        user: keypair.publicKey,
        inToken: new PublicKey(params.inputTokenMint),
        binArraysPubkey: quote.binArraysPubkey,
        inAmount: quote.inAmount,
        lbPair: lbPair.pubkey,
        outToken: new PublicKey(params.outputTokenMint),
        outAmount: quote.outAmount,
        outAmountMin: quote.outAmountMin
      });

      // 处理原生SOL包装
      const preInstructions: TransactionInstruction[] = [];
      const postInstructions: TransactionInstruction[] = [];

      if (params.inputTokenMint === TOKEN_ADDRESSES.SOL) {
        const userTokenAccount = getAssociatedTokenAddressSync(
          NATIVE_MINT, 
          keypair.publicKey
        );

        // 创建包装SOL账户
        try {
          await getAccount(this.connection, userTokenAccount);
        } catch {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              userTokenAccount,
              keypair.publicKey,
              NATIVE_MINT
            )
          );
        }

        // 转移SOL到包装账户
        preInstructions.push(
          createSyncNativeInstruction(userTokenAccount)
        );

        // 交换后关闭包装账户
        postInstructions.push(
          createCloseAccountInstruction(
            userTokenAccount,
            keypair.publicKey,
            keypair.publicKey
          )
        );
      }

      // 构建完整交易
      const transaction = new Transaction();
      transaction.add(...preInstructions);
      transaction.add(swapTx);
      transaction.add(...postInstructions);

      // 发送交易
      const txHash = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Swap completed successfully:', txHash);

      return {
        txHash,
        inputAmount: quote.inAmount.toString(),
        outputAmount: quote.outAmount.toString(),
        priceImpact: quote.priceImpact.toString(),
        fee: quote.fee.toString()
      };

    } catch (error) {
      console.error('❌ Swap failed:', error);
      throw error;
    }
  }

  /**
   * 添加流动性
   */
  async addLiquidity(params: AddLiquidityParams): Promise<LiquidityResult> {
    try {
      console.log('💧 Starting add liquidity operation...');
      
      // 验证钱包
      const keypair = walletService.getWalletKeypair(params.walletId);
      if (!keypair) {
        throw new Error(`Wallet ${params.walletId} not found or invalid`);
      }

      // 获取池信息
      const poolPubkey = new PublicKey(params.poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      // 获取活跃价格区间
      const activeBin = await lbPair.getActiveBin();
      const activeBinId = params.activeBin || activeBin.binId;

      console.log('📊 Active bin ID:', activeBinId);

      // 计算流动性参数
      const tokenAAmount = new BN(params.tokenAAmount);
      const tokenBAmount = new BN(params.tokenBAmount);

      // 使用平衡策略添加流动性
      const liquidityParams: LiquidityParameterByAmounts = {
        amountX: tokenAAmount,
        amountY: tokenBAmount,
        activeId: activeBinId,
        maxActiveBinSlippage: 5, // 5% slippage
        strategyType: StrategyType.SpotBalanced,
        maxBinId: params.maxBinId || activeBinId + 10,
        minBinId: params.minBinId || activeBinId - 10
      };

      // 计算流动性分布
      const liquidityDistribution = await lbPair.initializeLiquidityByAmount(liquidityParams);

      // 创建Position（如果不存在）
      const positionV2 = new PositionV2();
      const createPositionTx = await positionV2.createPosition(
        this.connection,
        lbPair.pubkey,
        keypair.publicKey,
        keypair.publicKey,
        liquidityDistribution.binLiquidityDist
      );

      // 添加流动性交易
      const addLiquidityTx = await lbPair.addLiquidityByAmount({
        positionPubKey: createPositionTx.positionPubKey,
        user: keypair.publicKey,
        totalXAmount: tokenAAmount,
        totalYAmount: tokenBAmount,
        liquidityDistribution: liquidityDistribution.binLiquidityDist
      });

      // 组合交易
      const transaction = new Transaction();
      transaction.add(...createPositionTx.instructions);
      transaction.add(addLiquidityTx);

      // 发送交易
      const txHash = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Liquidity added successfully:', txHash);

      return {
        txHash,
        positionAddress: createPositionTx.positionPubKey.toString(),
        tokenAAmount: tokenAAmount.toString(),
        tokenBAmount: tokenBAmount.toString(),
        binIds: liquidityDistribution.binLiquidityDist.map(bin => bin.binId)
      };

    } catch (error) {
      console.error('❌ Add liquidity failed:', error);
      throw error;
    }
  }

  /**
   * 移除流动性
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<LiquidityResult> {
    try {
      console.log('🔄 Starting remove liquidity operation...');
      
      // 验证钱包
      const keypair = walletService.getWalletKeypair(params.walletId);
      if (!keypair) {
        throw new Error(`Wallet ${params.walletId} not found or invalid`);
      }

      // 获取位置信息
      const positionPubkey = new PublicKey(params.positionAddress);
      const positionV2 = new PositionV2();
      const positionData = await positionV2.getPosition(this.connection, positionPubkey);

      if (!positionData) {
        throw new Error('Position not found');
      }

      // 获取池信息
      const lbPair = await DLMM.create(this.connection, positionData.lbPair);

      // 构建移除流动性的bin数据
      const binLiquidityToRemove: BinLiquidity[] = params.binIds.map((binId, index) => ({
        binId,
        xAmount: new BN(0), // 将由协议计算
        yAmount: new BN(0), // 将由协议计算
        liquidityShare: new BN(params.liquidityShares[index] || '100') // 默认移除100%
      }));

      // 创建移除流动性交易
      const removeLiquidityTx = await lbPair.removeLiquidity({
        position: positionPubkey,
        user: keypair.publicKey,
        binLiquidityReduction: binLiquidityToRemove
      });

      // 发送交易
      const txHash = await sendAndConfirmTransaction(
        this.connection,
        removeLiquidityTx,
        [keypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Liquidity removed successfully:', txHash);

      return {
        txHash,
        positionAddress: params.positionAddress,
        tokenAAmount: '0', // 实际金额需要从交易日志中解析
        tokenBAmount: '0', // 实际金额需要从交易日志中解析
        binIds: params.binIds
      };

    } catch (error) {
      console.error('❌ Remove liquidity failed:', error);
      throw error;
    }
  }

  /**
   * 获取交换报价
   */
  async getSwapQuote(
    poolAddress: string,
    inputTokenMint: string,
    inputAmount: number,
    slippagePercent: number = 1
  ): Promise<SwapQuoteResponse> {
    try {
      const poolPubkey = new PublicKey(poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      const inputAmountBN = new BN(inputAmount);
      const quote = await lbPair.swapQuote(
        new PublicKey(inputTokenMint),
        inputAmountBN,
        slippagePercent,
        true
      );

      return quote;
    } catch (error) {
      console.error('❌ Get swap quote failed:', error);
      throw error;
    }
  }

  /**
   * 获取用户位置信息
   */
  async getUserPositions(walletId: string): Promise<PositionV2[]> {
    try {
      const keypair = walletService.getWalletKeypair(walletId);
      if (!keypair) {
        throw new Error(`Wallet ${walletId} not found or invalid`);
      }

      const positionV2 = new PositionV2();
      const positions = await positionV2.getPositionsByUser(this.connection, keypair.publicKey);

      return positions;
    } catch (error) {
      console.error('❌ Get user positions failed:', error);
      throw error;
    }
  }

  /**
   * 获取池信息
   */
  async getPoolInfo(poolAddress: string) {
    try {
      const poolPubkey = new PublicKey(poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      const lbPairAccount = await lbPair.getLbPair();
      const activeBin = await lbPair.getActiveBin();
      
      return {
        poolAddress: poolAddress,
        tokenX: lbPairAccount.tokenXMint.toString(),
        tokenY: lbPairAccount.tokenYMint.toString(),
        activeId: activeBin.binId,
        currentPrice: activeBin.price,
        totalLiquidity: {
          tokenX: lbPairAccount.reserveX.toString(),
          tokenY: lbPairAccount.reserveY.toString()
        }
      };
    } catch (error) {
      console.error('❌ Get pool info failed:', error);
      throw error;
    }
  }
}

export const meteoraTradingService = MeteoraTradingService.getInstance();