import { Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { connection, NETWORK } from '../config/solana.js';
import axios from 'axios';

export interface DLMMPoolInfo {
  poolAddress: string;
  tokenX: string;
  tokenY: string;
  tokenXSymbol?: string;
  tokenYSymbol?: string;
  binStep: number;
  isActive: boolean;
  network: string;
}

export class MeteoraDLMMDiscoveryService {
  private static instance: MeteoraDLMMDiscoveryService;
  
  // Meteora DLMM Program IDs for different networks
  private readonly PROGRAM_IDS = {
    mainnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    devnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Same as mainnet for now
    testnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
  };

  // API endpoints for different networks
  private readonly API_ENDPOINTS = {
    mainnet: 'https://dlmm-api.meteora.ag',
    devnet: 'https://dlmm-api.meteora.ag', // Will try devnet-specific endpoints
    testnet: 'https://dlmm-api.meteora.ag'
  };

  private constructor() {}

  public static getInstance(): MeteoraDLMMDiscoveryService {
    if (!MeteoraDLMMDiscoveryService.instance) {
      MeteoraDLMMDiscoveryService.instance = new MeteoraDLMMDiscoveryService();
    }
    return MeteoraDLMMDiscoveryService.instance;
  }

  /**
   * 发现 Meteora DLMM 池
   * 使用多种方法: API 查询、程序账户扫描、已知池地址
   */
  async discoverDLMMPools(): Promise<DLMMPoolInfo[]> {
    console.log(`🔍 Discovering DLMM pools on ${NETWORK}...`);
    
    const discoveries: DLMMPoolInfo[] = [];

    // 方法 1: 尝试 API 查询
    try {
      const apiPools = await this.discoverPoolsViaAPI();
      discoveries.push(...apiPools);
      console.log(`✅ Found ${apiPools.length} pools via API`);
    } catch (error: any) {
      console.log(`⚠️ API discovery failed: ${error?.message || 'Unknown error'}`);
    }

    // 方法 2: 程序账户扫描 (如果 API 失败或返回空)
    if (discoveries.length === 0) {
      try {
        const programPools = await this.discoverPoolsViaProgramAccounts();
        discoveries.push(...programPools);
        console.log(`✅ Found ${programPools.length} pools via program account scan`);
      } catch (error: any) {
        console.log(`⚠️ Program account scan failed: ${error?.message || 'Unknown error'}`);
      }
    }

    // 方法 3: 已知的 devnet 池地址 (后备方案)
    if (discoveries.length === 0) {
      const knownPools = this.getKnownDevnetPools();
      discoveries.push(...knownPools);
      console.log(`✅ Using ${knownPools.length} known devnet pools as fallback`);
    }

    // 去重并验证
    const uniquePools = this.deduplicatePools(discoveries);
    const validatedPools = await this.validatePools(uniquePools);

    console.log(`🎉 Total discovered pools: ${validatedPools.length}`);
    return validatedPools;
  }

  /**
   * 通过 API 发现池
   */
  private async discoverPoolsViaAPI(): Promise<DLMMPoolInfo[]> {
    const baseUrl = this.API_ENDPOINTS[NETWORK as keyof typeof this.API_ENDPOINTS] || this.API_ENDPOINTS.mainnet;
    
    // 尝试多个可能的端点
    const endpoints = [
      '/pair/all',
      '/pairs',
      '/lb-pair/all',
      '/pools',
      '/pool/all',
      '/v1/pair/all',
      '/api/pair/all'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying API endpoint: ${baseUrl}${endpoint}`);
        
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 10000,
          params: NETWORK === 'devnet' ? { network: 'devnet' } : {}
        });

        if (response.data && (response.data.data || Array.isArray(response.data))) {
          const data = response.data.data || response.data;
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`✅ Found working API endpoint: ${endpoint}`);
            return this.parseAPIResponse(data);
          }
        }
      } catch (error: any) {
        console.log(`❌ API endpoint ${endpoint} failed: ${error?.message || 'Unknown error'}`);
      }
    }

    throw new Error('No working API endpoint found');
  }

  /**
   * 通过程序账户扫描发现池
   */
  private async discoverPoolsViaProgramAccounts(): Promise<DLMMPoolInfo[]> {
    const programId = new PublicKey(this.PROGRAM_IDS[NETWORK as keyof typeof this.PROGRAM_IDS] || this.PROGRAM_IDS.mainnet);
    
    console.log(`🔍 Scanning program accounts for: ${programId.toString()}`);

    try {
      // 获取所有与 DLMM 程序相关的账户
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          // 这里可以添加更多过滤器来只获取池账户
          {
            dataSize: 264 // DLMM 池账户的预期数据大小
          }
        ] as GetProgramAccountsFilter[]
      });

      console.log(`📊 Found ${accounts.length} program accounts`);

      const pools: DLMMPoolInfo[] = [];
      
      for (const account of accounts) {
        try {
          // 这里需要解析账户数据来提取池信息
          // 由于我们没有完整的账户结构，我们将创建基本的池信息
          const pool: DLMMPoolInfo = {
            poolAddress: account.pubkey.toString(),
            tokenX: 'Unknown',
            tokenY: 'Unknown',
            binStep: 25, // 默认 bin step
            isActive: true,
            network: NETWORK
          };
          
          pools.push(pool);
        } catch (error: any) {
          console.log(`⚠️ Failed to parse account ${account.pubkey.toString()}: ${error?.message || 'Unknown error'}`);
        }
      }

      return pools.slice(0, 20); // 限制返回数量以避免过多结果
    } catch (error: any) {
      console.error(`❌ Program account scan failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 解析 API 响应
   */
  private parseAPIResponse(data: any[]): DLMMPoolInfo[] {
    return data.map(item => ({
      poolAddress: item.address || item.pool_address || item.pubkey || item.pair_address,
      tokenX: item.mint_x || item.token_x || item.base_mint || item.tokenX,
      tokenY: item.mint_y || item.token_y || item.quote_mint || item.tokenY,
      tokenXSymbol: item.token_x_symbol || item.base_symbol || this.extractSymbol(item.name, 0),
      tokenYSymbol: item.token_y_symbol || item.quote_symbol || this.extractSymbol(item.name, 1),
      binStep: item.bin_step || item.fee_rate * 10000 || 25,
      isActive: item.activated !== false && item.active !== false,
      network: NETWORK
    })).filter(pool => pool.poolAddress && pool.tokenX && pool.tokenY);
  }

  /**
   * 获取已知的 devnet 池地址
   */
  private getKnownDevnetPools(): DLMMPoolInfo[] {
    // 这些是一些可能存在于 devnet 的池地址
    // 在实际使用中，你需要从 Meteora 官方获取确切的 devnet 池地址
    const knownPools = [
      {
        poolAddress: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
        tokenX: 'So11111111111111111111111111111111111111112',
        tokenY: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        tokenXSymbol: 'SOL',
        tokenYSymbol: 'USDC',
        binStep: 25,
        isActive: true,
        network: NETWORK
      },
      {
        poolAddress: '9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2',
        tokenX: 'So11111111111111111111111111111111111111112',
        tokenY: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        tokenXSymbol: 'SOL',
        tokenYSymbol: 'USDC',
        binStep: 100,
        isActive: true,
        network: NETWORK
      }
    ];

    return knownPools;
  }

  /**
   * 验证池地址是否有效
   */
  private async validatePools(pools: DLMMPoolInfo[]): Promise<DLMMPoolInfo[]> {
    console.log(`🔍 Validating ${pools.length} pools...`);
    
    const validatedPools: DLMMPoolInfo[] = [];
    
    for (const pool of pools) {
      try {
        // 验证地址格式
        new PublicKey(pool.poolAddress);
        
        // 尝试获取账户信息
        const accountInfo = await connection.getAccountInfo(new PublicKey(pool.poolAddress));
        
        if (accountInfo) {
          validatedPools.push(pool);
          console.log(`✅ Pool ${pool.poolAddress} is valid`);
        } else {
          console.log(`⚠️ Pool ${pool.poolAddress} not found on-chain`);
        }
      } catch (error: any) {
        console.log(`❌ Pool ${pool.poolAddress} validation failed: ${error?.message || 'Unknown error'}`);
      }
    }

    return validatedPools;
  }

  /**
   * 去重池地址
   */
  private deduplicatePools(pools: DLMMPoolInfo[]): DLMMPoolInfo[] {
    const seen = new Set<string>();
    return pools.filter(pool => {
      if (seen.has(pool.poolAddress)) {
        return false;
      }
      seen.add(pool.poolAddress);
      return true;
    });
  }

  /**
   * 从池名称中提取代币符号
   */
  private extractSymbol(name: string, index: number): string {
    if (!name) return 'UNKNOWN';
    
    const parts = name.split(/[\/\-_]/);
    return parts[index] || 'UNKNOWN';
  }

  /**
   * 获取特定池的详细信息
   */
  async getPoolDetails(poolAddress: string): Promise<DLMMPoolInfo | null> {
    try {
      console.log(`🔍 Getting details for pool: ${poolAddress}`);
      
      const baseUrl = this.API_ENDPOINTS[NETWORK as keyof typeof this.API_ENDPOINTS] || this.API_ENDPOINTS.mainnet;
      
      // 尝试多个可能的端点
      const endpoints = [
        `/pair/${poolAddress}`,
        `/pool/${poolAddress}`,
        `/lb-pair/${poolAddress}`,
        `/pairs/${poolAddress}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, {
            timeout: 5000,
            params: NETWORK === 'devnet' ? { network: 'devnet' } : {}
          });

          if (response.data && (response.data.data || response.data)) {
            const data = response.data.data || response.data;
            return this.parseAPIResponse([data])[0];
          }
        } catch (error: any) {
          continue;
        }
      }

      console.log(`⚠️ Could not fetch details for pool ${poolAddress}`);
      return null;
    } catch (error: any) {
      console.error(`❌ Error getting pool details: ${error?.message || 'Unknown error'}`);
      return null;
    }
  }
}