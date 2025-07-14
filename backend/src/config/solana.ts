import { Connection, clusterApiUrl } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

// 网络环境配置
export const NETWORK = process.env.SOLANA_NETWORK || 'devnet'; // 'mainnet-beta' | 'devnet' | 'testnet'

// Solana 连接配置
const getRpcUrl = () => {
  if (process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }
  
  switch (NETWORK) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'devnet':
      return clusterApiUrl('devnet');
    case 'testnet':
      return clusterApiUrl('testnet');
    default:
      return clusterApiUrl('devnet');
  }
};

export const connection = new Connection(
  getRpcUrl(),
  process.env.SOLANA_COMMITMENT as any || 'confirmed'
);

// Meteora DLMM 程序 ID - 根据网络环境选择
const getMeteoraProgramId = () => {
  if (NETWORK === 'mainnet-beta') {
    return 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'; // 主网程序ID
  } else {
    // Devnet/Testnet 程序ID (如果Meteora没有部署到测试网，则使用主网ID)
    return 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'; // 暂时使用主网ID
  }
};

export const METEORA_DLMM_PROGRAM_ID = getMeteoraProgramId();

// 常用代币地址 - 根据网络环境自动选择
const getTokenAddresses = () => {
  if (NETWORK === 'mainnet-beta') {
    return {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
      stSOL: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
      BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
    };
  } else {
    // Devnet/Testnet 代币地址
    return {
      SOL: 'So11111111111111111111111111111111111111112', // SOL在所有网络都一样
      USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
      USDT: 'EgQ3yNtVhJzt9VBoPKvPwdYuaq7fFWKUwB8Rbpg2dEJV', // Devnet USDT (模拟)
      // 测试网上可能没有这些代币，使用模拟地址
      mSOL: 'So11111111111111111111111111111111111111112', // 暂用SOL地址
      stSOL: 'So11111111111111111111111111111111111111112', // 暂用SOL地址
      BONK: 'So11111111111111111111111111111111111111112', // 暂用SOL地址
      WIF: 'So11111111111111111111111111111111111111112', // 暂用SOL地址
      JUP: 'So11111111111111111111111111111111111111112'  // 暂用SOL地址
    };
  }
};

export const TOKEN_ADDRESSES = getTokenAddresses();

// 验证 Solana 连接
export async function validateSolanaConnection() {
  try {
    const version = await connection.getVersion();
    console.log(`✅ Solana connection established (${NETWORK}), version:`, version);
    console.log(`🌐 RPC URL: ${getRpcUrl()}`);
    console.log(`🔗 Meteora Program ID: ${METEORA_DLMM_PROGRAM_ID}`);
    return true;
  } catch (error) {
    console.error('❌ Solana connection failed:', error);
    return false;
  }
}