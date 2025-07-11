import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { default as DLMM } from '@meteora-ag/dlmm';
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

export interface SwapResult {
  txHash: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  fee: string;
}

export class MeteoraTradingServiceSimple {
  private static instance: MeteoraTradingServiceSimple;
  private connection: Connection;

  private constructor() {
    this.connection = connection;
  }

  public static getInstance(): MeteoraTradingServiceSimple {
    if (!MeteoraTradingServiceSimple.instance) {
      MeteoraTradingServiceSimple.instance = new MeteoraTradingServiceSimple();
    }
    return MeteoraTradingServiceSimple.instance;
  }

  /**
   * 获取交换报价（只读操作）
   */
  async getSwapQuote(
    poolAddress: string,
    inputTokenMint: string,
    inputAmount: number,
    slippagePercent: number = 1
  ): Promise<any> {
    try {
      console.log('💰 Getting swap quote...');
      
      // 获取池信息
      const poolPubkey = new PublicKey(poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      const inputAmountBN = new BN(inputAmount);
      const quote = await lbPair.swapQuote(
        new PublicKey(inputTokenMint),
        inputAmountBN,
        slippagePercent,
        true
      );

      console.log('✅ Quote obtained:', {
        inputAmount: quote.inAmount.toString(),
        outputAmount: quote.outAmount.toString(),
        priceImpact: quote.priceImpact.toString(),
        fee: quote.fee.toString()
      });

      return quote;
    } catch (error) {
      console.error('❌ Get swap quote failed:', error);
      throw error;
    }
  }

  /**
   * 获取池信息
   */
  async getPoolInfo(poolAddress: string) {
    try {
      console.log('📊 Getting pool info...');
      
      const poolPubkey = new PublicKey(poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      const lbPairAccount = await lbPair.getLbPair();
      const activeBin = await lbPair.getActiveBin();
      
      const poolInfo = {
        poolAddress: poolAddress,
        tokenX: lbPairAccount.tokenXMint.toString(),
        tokenY: lbPairAccount.tokenYMint.toString(),
        activeId: activeBin.binId,
        currentPrice: activeBin.price,
        binStep: lbPairAccount.binStep,
        totalLiquidity: {
          tokenX: lbPairAccount.reserveX.toString(),
          tokenY: lbPairAccount.reserveY.toString()
        }
      };

      console.log('✅ Pool info obtained:', poolInfo);
      return poolInfo;
    } catch (error) {
      console.error('❌ Get pool info failed:', error);
      throw error;
    }
  }

  /**
   * 验证钱包配置
   */
  async validateWallet(walletId: string): Promise<boolean> {
    try {
      const keypair = walletService.getWalletKeypair(walletId);
      if (!keypair) {
        console.error(`❌ Wallet ${walletId} not found or invalid`);
        return false;
      }

      // 检查余额
      const balance = await this.connection.getBalance(keypair.publicKey);
      console.log(`💰 Wallet ${walletId} balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      
      if (balance < 0.01 * LAMPORTS_PER_SOL) {
        console.warn(`⚠️ Low balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      }

      return true;
    } catch (error) {
      console.error('❌ Wallet validation failed:', error);
      return false;
    }
  }

  /**
   * 获取钱包代币余额
   */
  async getTokenBalance(walletId: string, tokenMint: string): Promise<number> {
    try {
      const keypair = walletService.getWalletKeypair(walletId);
      if (!keypair) {
        throw new Error(`Wallet ${walletId} not found or invalid`);
      }

      if (tokenMint === TOKEN_ADDRESSES.SOL || tokenMint === NATIVE_MINT.toString()) {
        // SOL余额
        const balance = await this.connection.getBalance(keypair.publicKey);
        return balance;
      } else {
        // SPL代币余额
        const tokenAccount = getAssociatedTokenAddressSync(
          new PublicKey(tokenMint),
          keypair.publicKey
        );

        try {
          const accountInfo = await getAccount(this.connection, tokenAccount);
          return Number(accountInfo.amount);
        } catch {
          return 0; // 账户不存在，余额为0
        }
      }
    } catch (error) {
      console.error('❌ Get token balance failed:', error);
      return 0;
    }
  }

  /**
   * 执行基本的交换操作（简化版）
   */
  async executeSwap(params: SwapParams): Promise<SwapResult> {
    try {
      console.log('🔄 Starting swap operation...');
      
      // 验证钱包
      const keypair = walletService.getWalletKeypair(params.walletId);
      if (!keypair) {
        throw new Error(`Wallet ${params.walletId} not found or invalid`);
      }

      // 检查余额
      const inputBalance = await this.getTokenBalance(params.walletId, params.inputTokenMint);
      if (inputBalance < params.inputAmount) {
        throw new Error(`Insufficient balance. Available: ${inputBalance}, Required: ${params.inputAmount}`);
      }

      // 获取池信息和报价
      const poolPubkey = new PublicKey(params.poolAddress);
      const lbPair = await DLMM.create(this.connection, poolPubkey);
      
      const inputAmountBN = new BN(params.inputAmount);
      const quote = await lbPair.swapQuote(
        new PublicKey(params.inputTokenMint),
        inputAmountBN,
        params.slippagePercent,
        true
      );

      console.log('💰 Swap quote obtained:', {
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

      // 发送交易
      const txHash = await sendAndConfirmTransaction(
        this.connection,
        swapTx,
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
}

export const meteoraTradingServiceSimple = MeteoraTradingServiceSimple.getInstance();