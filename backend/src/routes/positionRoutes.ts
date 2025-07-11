import { Router } from 'express';
import { positionController } from '../controllers/PositionController.js';

const router = Router();

// 钱包相关路由
router.get('/wallets', positionController.getWalletList.bind(positionController));

// LP持仓路由
router.get('/:walletId', positionController.getWalletPortfolio.bind(positionController));
router.get('/:walletId/summary', positionController.getWalletSummary.bind(positionController));
router.get('/:walletId/pool/:poolAddress', positionController.getPositionDetails.bind(positionController));
router.get('/:walletId/unclaimed-fees', positionController.getUnclaimedFees.bind(positionController));
router.get('/:walletId/earnings', positionController.getEarningsStats.bind(positionController));

// 数据操作路由
router.post('/:walletId/refresh', positionController.refreshPositions.bind(positionController));

export { router as positionRoutes };