import { readFileSync } from 'fs';
import { join } from 'path';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface WalletConfig {
  name: string;
  publicKey: string;
  privateKey: string;
  description?: string;
}

export interface WalletConfigFile {
  wallets: {
    [walletId: string]: WalletConfig;
  };
}

class WalletService {
  private walletConfig: WalletConfigFile;

  constructor() {
    this.loadWalletConfig();
  }

  private loadWalletConfig(): void {
    try {
      const configPath = join(process.cwd(), 'wallet.json');
      const configData = readFileSync(configPath, 'utf8');
      this.walletConfig = JSON.parse(configData);
      
      console.log('✅ Wallet config loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load wallet config:', error);
      throw new Error('Wallet configuration not found or invalid');
    }
  }

  public getWallet(walletId: string): WalletConfig | null {
    return this.walletConfig.wallets[walletId] || null;
  }

  public getWalletKeypair(walletId: string): Keypair | null {
    const wallet = this.getWallet(walletId);
    if (!wallet) return null;

    try {
      const privateKeyBytes = bs58.decode(wallet.privateKey);
      return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      console.error(`❌ Failed to create keypair for wallet ${walletId}:`, error);
      return null;
    }
  }

  public getAllWallets(): { [walletId: string]: WalletConfig } {
    return this.walletConfig.wallets;
  }

  public getWalletPublicKey(walletId: string): string | null {
    const wallet = this.getWallet(walletId);
    return wallet?.publicKey || null;
  }

  public isWalletConfigured(walletId: string): boolean {
    const wallet = this.getWallet(walletId);
    return wallet !== null && 
           wallet.publicKey !== "请替换为实际的公钥地址" &&
           wallet.privateKey !== "请替换为实际的私钥（base58格式）";
  }
}

export const walletService = new WalletService();