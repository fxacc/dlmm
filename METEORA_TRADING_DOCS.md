# Meteora Trading Service Documentation

## Overview

The Meteora Trading Service provides comprehensive functionality for interacting with Meteora's Dynamic Liquidity Market Maker (DLMM) v2 protocol on Solana. This service enables automated trading operations including token swaps, liquidity provision, and liquidity removal.

## Features

- **Token Swapping**: Execute swaps between any tokens supported by Meteora DLMM pools
- **Liquidity Management**: Add and remove liquidity from concentrated liquidity pools
- **Quote Generation**: Get accurate price quotes before executing trades
- **Position Management**: Track and manage user liquidity positions
- **Multi-Wallet Support**: Support for multiple wallet configurations

## Architecture

### Core Components

1. **MeteoraTradingService** (`src/services/MeteoraTradingService.ts`)
   - Main service class implementing all trading operations
   - Singleton pattern for efficient resource management
   - Direct integration with Meteora DLMM SDK

2. **Trading Routes** (`src/routes/tradingRoutes.ts`)
   - RESTful API endpoints for all trading operations
   - Input validation and error handling
   - Proper response formatting

3. **Wallet Service** (`src/config/wallet.ts`)
   - Secure wallet management and keypair handling
   - Support for multiple wallet configurations
   - Base58 private key encoding/decoding

## API Endpoints

### 1. Token Swap

**Endpoint**: `POST /api/trading/swap`

Execute a token swap through Meteora DLMM.

**Request Body**:
```json
{
  "walletId": "string",
  "poolAddress": "string",
  "inputTokenMint": "string",
  "outputTokenMint": "string", 
  "inputAmount": number,
  "slippagePercent": number (optional, default: 1)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "string",
    "inputAmount": "string",
    "outputAmount": "string",
    "priceImpact": "string",
    "fee": "string"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/trading/swap \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "testnet_wallet",
    "poolAddress": "AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA",
    "inputTokenMint": "So11111111111111111111111111111111111111112",
    "outputTokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "inputAmount": 1,
    "slippagePercent": 1
  }'
```

### 2. Add Liquidity

**Endpoint**: `POST /api/trading/add-liquidity`

Add liquidity to a Meteora DLMM pool.

**Request Body**:
```json
{
  "walletId": "string",
  "poolAddress": "string",
  "tokenAAmount": number,
  "tokenBAmount": number,
  "minTokenAAmount": number (optional),
  "minTokenBAmount": number (optional),
  "activeBin": number (optional),
  "maxBinId": number (optional),
  "minBinId": number (optional)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "string",
    "positionAddress": "string",
    "tokenAAmount": "string",
    "tokenBAmount": "string",
    "binIds": [number]
  }
}
```

### 3. Remove Liquidity

**Endpoint**: `POST /api/trading/remove-liquidity`

Remove liquidity from a position.

**Request Body**:
```json
{
  "walletId": "string",
  "positionAddress": "string",
  "binIds": [number],
  "liquidityShares": ["string"] (optional, defaults to 100%)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "string",
    "positionAddress": "string",
    "tokenAAmount": "string",
    "tokenBAmount": "string",
    "binIds": [number]
  }
}
```

### 4. Get Swap Quote

**Endpoint**: `POST /api/trading/quote`

Get a price quote for a potential swap.

**Request Body**:
```json
{
  "poolAddress": "string",
  "inputTokenMint": "string",
  "inputAmount": number,
  "slippagePercent": number (optional, default: 1)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "inputAmount": "string",
    "outputAmount": "string",
    "minimumOutputAmount": "string",
    "priceImpact": "string",
    "fee": "string",
    "slippagePercent": number
  }
}
```

### 5. Get User Positions

**Endpoint**: `GET /api/trading/positions/:walletId`

Retrieve all liquidity positions for a user.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "positionAddress": "string",
      "lbPair": "string",
      "binIds": [number],
      "liquidityShares": ["string"]
    }
  ]
}
```

### 6. Get Pool Information

**Endpoint**: `GET /api/trading/pool/:poolAddress`

Get detailed information about a specific pool.

**Response**:
```json
{
  "success": true,
  "data": {
    "poolAddress": "string",
    "tokenX": "string",
    "tokenY": "string",
    "activeId": number,
    "currentPrice": number,
    "totalLiquidity": {
      "tokenX": "string",
      "tokenY": "string"
    }
  }
}
```

### 7. Get Supported Tokens

**Endpoint**: `GET /api/trading/tokens`

Get list of supported tokens and common trading pairs.

**Response**:
```json
{
  "success": true,
  "data": {
    "supportedTokens": {
      "SOL": "So11111111111111111111111111111111111111112",
      "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    },
    "network": "devnet",
    "commonPairs": [
      {
        "name": "SOL/USDC",
        "poolAddress": "...",
        "tokenA": "...",
        "tokenB": "...",
        "tokenASymbol": "SOL",
        "tokenBSymbol": "USDC"
      }
    ]
  }
}
```

## Configuration

### Environment Variables

```bash
# Solana Network Configuration
SOLANA_NETWORK=devnet  # mainnet-beta | devnet | testnet
SOLANA_RPC_URL=https://api.devnet.solana.com  # Optional custom RPC
SOLANA_COMMITMENT=confirmed  # Optional commitment level

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Wallet Configuration

Create a `wallet.json` file in the backend directory:

```json
{
  "wallets": {
    "testnet_wallet": {
      "name": "Test Wallet",
      "publicKey": "YourPublicKeyHere",
      "privateKey": "YourBase58PrivateKeyHere",
      "description": "Wallet for testnet trading"
    }
  }
}
```

**Security Note**: Never commit wallet.json to version control. Add it to .gitignore.

## Testing

### Test Scripts

1. **Individual Operations Test** (Safe - No Transactions):
```bash
npm run test:trading
# or
tsx src/test-trading.ts
```

2. **Full Flow Test** (Uses Real Transactions):
```bash
tsx src/test-trading.ts full
```

### Test Scenarios

The test suite covers:

1. **Swap Operation**: 0.1 SOL → USDC
2. **Add Liquidity**: 0.05 SOL + 5 USDC to SOL/USDC pool
3. **Remove Liquidity**: Remove 50% of added liquidity
4. **Quote Generation**: Get price quotes without executing trades
5. **Position Management**: List and manage user positions

## Usage Examples

### Complete Trading Flow Example

```typescript
import { meteoraTradingService } from './services/MeteoraTradingService.js';
import { TOKEN_ADDRESSES } from './config/solana.js';

async function completeExample() {
  const walletId = 'testnet_wallet';
  const poolAddress = 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA';
  
  // 1. Get swap quote
  const quote = await meteoraTradingService.getSwapQuote(
    poolAddress,
    TOKEN_ADDRESSES.SOL,
    1 * 1e9, // 1 SOL in lamports
    1 // 1% slippage
  );
  
  // 2. Execute swap
  const swapResult = await meteoraTradingService.executeSwap({
    walletId,
    poolAddress,
    inputTokenMint: TOKEN_ADDRESSES.SOL,
    outputTokenMint: TOKEN_ADDRESSES.USDC,
    inputAmount: 1 * 1e9,
    slippagePercent: 1
  });
  
  // 3. Add liquidity
  const addLPResult = await meteoraTradingService.addLiquidity({
    walletId,
    poolAddress,
    tokenAAmount: 0.5 * 1e9, // 0.5 SOL
    tokenBAmount: 50 * 1e6,  // 50 USDC
  });
  
  // 4. Remove liquidity
  const removeLPResult = await meteoraTradingService.removeLiquidity({
    walletId,
    positionAddress: addLPResult.positionAddress,
    binIds: addLPResult.binIds,
    liquidityShares: addLPResult.binIds.map(() => '100') // Remove 100%
  });
}
```

## Error Handling

All operations include comprehensive error handling:

- **Wallet Validation**: Ensures wallet exists and is properly configured
- **Balance Checks**: Validates sufficient funds before transactions
- **Slippage Protection**: Prevents trades with excessive price impact
- **Network Errors**: Handles RPC and network connectivity issues
- **Transaction Failures**: Provides detailed error messages for failed transactions

## Security Considerations

1. **Private Key Management**: Private keys are encrypted and never logged
2. **Input Validation**: All user inputs are validated and sanitized
3. **Slippage Protection**: Default slippage limits protect against MEV attacks
4. **Network Isolation**: Separate configurations for different networks
5. **Rate Limiting**: Consider implementing rate limiting for production use

## Performance Optimization

1. **Connection Pooling**: Reuses Solana connection instances
2. **Batch Operations**: Groups multiple operations when possible
3. **Caching**: Caches pool information to reduce RPC calls
4. **Async Processing**: All operations are asynchronous and non-blocking

## Monitoring and Debugging

### Logging

The service provides detailed logging:
- Transaction hashes for all operations
- Detailed error messages with stack traces
- Performance metrics for operations
- Network and wallet status information

### Health Checks

Monitor service health via:
```bash
curl http://localhost:3000/health
```

### Transaction Monitoring

All transactions can be monitored on Solana Explorer:
- Mainnet: https://explorer.solana.com/
- Devnet: https://explorer.solana.com/?cluster=devnet

## Troubleshooting

### Common Issues

1. **"Wallet not found"**: Check wallet.json configuration
2. **"Insufficient balance"**: Ensure wallet has enough SOL/tokens
3. **"Pool not found"**: Verify pool address for current network
4. **"Slippage exceeded"**: Increase slippage tolerance or reduce trade size
5. **"RPC error"**: Check network connection and RPC endpoint

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm start
```

## Roadmap

### Planned Features

1. **Advanced Strategies**: Implement DCA, grid trading, and rebalancing
2. **Portfolio Management**: Track PnL and performance metrics
3. **Risk Management**: Automatic stop-loss and take-profit orders
4. **Multi-DEX Support**: Expand beyond Meteora to other DEXs
5. **Analytics**: Advanced reporting and analytics dashboard

## Support

For issues and feature requests:
1. Check the troubleshooting section
2. Review the test scripts for examples
3. Examine transaction logs for detailed error information
4. Ensure all dependencies are properly installed