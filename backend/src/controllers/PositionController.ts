import { Request, Response } from 'express';
import { portfolioService } from '../services/PortfolioService.js';
import { positionService } from '../services/PositionService.js';
import { walletService } from '../config/wallet.js';

export class PositionController {
  /**
   * 获取钱包完整LP组合
   * GET /api/positions/:walletId
   */
  async getWalletPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { walletId } = req.params;
      
      // 验证钱包是否存在
      if (!walletService.getWallet(walletId)) {
        res.status(404).json({
          success: false,
          error: `Wallet ${walletId} not found`
        });
        return;
      }

      // 检查钱包是否已配置
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured. Please update wallet.json with valid keys.`
        });
        return;
      }

      console.log(`📊 API: Getting portfolio for wallet ${walletId}`);
      
      const portfolio = await portfolioService.getWalletPortfolio(walletId);
      
      res.json({
        success: true,
        data: portfolio
      });
    } catch (error) {
      console.error('❌ Error in getWalletPortfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get wallet portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取钱包LP摘要
   * GET /api/positions/:walletId/summary
   */
  async getWalletSummary(req: Request, res: Response): Promise<void> {
    try {
      const { walletId } = req.params;
      
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured`
        });
        return;
      }

      console.log(`📈 API: Getting summary for wallet ${walletId}`);
      
      const summary = await portfolioService.getWalletSummary(walletId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('❌ Error in getWalletSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get wallet summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取特定LP持仓详情
   * GET /api/positions/:walletId/pool/:poolAddress
   */
  async getPositionDetails(req: Request, res: Response): Promise<void> {
    try {
      const { walletId, poolAddress } = req.params;
      
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured`
        });
        return;
      }

      console.log(`🔍 API: Getting position details for pool ${poolAddress}`);
      
      const position = await positionService.getPositionDetails(poolAddress);
      
      if (!position) {
        res.status(404).json({
          success: false,
          error: `Position not found for pool ${poolAddress}`
        });
        return;
      }
      
      res.json({
        success: true,
        data: position
      });
    } catch (error) {
      console.error('❌ Error in getPositionDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get position details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取未领取手续费
   * GET /api/positions/:walletId/unclaimed-fees
   */
  async getUnclaimedFees(req: Request, res: Response): Promise<void> {
    try {
      const { walletId } = req.params;
      
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured`
        });
        return;
      }

      console.log(`💰 API: Getting unclaimed fees for wallet ${walletId}`);
      
      const unclaimedFees = await portfolioService.getUnclaimedFeesSummary(walletId);
      
      res.json({
        success: true,
        data: unclaimedFees
      });
    } catch (error) {
      console.error('❌ Error in getUnclaimedFees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unclaimed fees',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取收益统计
   * GET /api/positions/:walletId/earnings
   */
  async getEarningsStats(req: Request, res: Response): Promise<void> {
    try {
      const { walletId } = req.params;
      
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured`
        });
        return;
      }

      console.log(`📊 API: Getting earnings stats for wallet ${walletId}`);
      
      const earnings = await portfolioService.getEarningsStats(walletId);
      
      res.json({
        success: true,
        data: earnings
      });
    } catch (error) {
      console.error('❌ Error in getEarningsStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get earnings stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 刷新持仓数据
   * POST /api/positions/:walletId/refresh
   */
  async refreshPositions(req: Request, res: Response): Promise<void> {
    try {
      const { walletId } = req.params;
      
      if (!walletService.isWalletConfigured(walletId)) {
        res.status(400).json({
          success: false,
          error: `Wallet ${walletId} is not properly configured`
        });
        return;
      }

      console.log(`🔄 API: Refreshing positions for wallet ${walletId}`);
      
      const positions = await positionService.refreshPositions(walletId);
      
      res.json({
        success: true,
        message: `Refreshed ${positions.length} positions`,
        data: {
          positionCount: positions.length,
          refreshedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error in refreshPositions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh positions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取所有配置的钱包列表
   * GET /api/positions/wallets
   */
  async getWalletList(req: Request, res: Response): Promise<void> {
    try {
      const wallets = walletService.getAllWallets();
      
      const walletList = Object.entries(wallets).map(([walletId, wallet]) => ({
        walletId,
        name: wallet.name,
        publicKey: wallet.publicKey,
        description: wallet.description,
        isConfigured: walletService.isWalletConfigured(walletId)
      }));
      
      res.json({
        success: true,
        data: {
          wallets: walletList,
          total: walletList.length
        }
      });
    } catch (error) {
      console.error('❌ Error in getWalletList:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get wallet list',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const positionController = new PositionController();