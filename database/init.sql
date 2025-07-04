-- 交易对基础信息表
CREATE TABLE IF NOT EXISTS trading_pairs (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(44) NOT NULL UNIQUE,
    token_a_address VARCHAR(44) NOT NULL,
    token_b_address VARCHAR(44) NOT NULL,
    token_a_symbol VARCHAR(20) NOT NULL,
    token_b_symbol VARCHAR(20) NOT NULL,
    token_a_decimals INTEGER NOT NULL,
    token_b_decimals INTEGER NOT NULL,
    fee_rate DECIMAL(6,4) DEFAULT 0.0025,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交易对实时数据表
CREATE TABLE IF NOT EXISTS pair_realtime_data (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(44) NOT NULL,
    current_price DECIMAL(20,8),
    tvl_usd DECIMAL(20,2),
    volume_24h_usd DECIMAL(20,2),
    fees_24h_usd DECIMAL(20,2),
    apr DECIMAL(8,4),
    daily_yield DECIMAL(8,4),
    price_change_24h DECIMAL(8,4),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pool_address)
);

-- 交易对历史数据表
CREATE TABLE IF NOT EXISTS pair_historical_data (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(44) NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(20,8),
    high_price DECIMAL(20,8),
    low_price DECIMAL(20,8),
    close_price DECIMAL(20,8),
    volume_usd DECIMAL(20,2),
    fees_usd DECIMAL(20,2),
    tvl_usd DECIMAL(20,2),
    apr DECIMAL(8,4),
    transactions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pool_address, date)
);

-- 钱包表
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(44) NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LP持仓表
CREATE TABLE IF NOT EXISTS lp_positions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id),
    pool_address VARCHAR(44) NOT NULL,
    token_a VARCHAR(44) NOT NULL,
    token_b VARCHAR(44) NOT NULL,
    position_id VARCHAR(100),
    min_price DECIMAL(20,8),
    max_price DECIMAL(20,8),
    liquidity_amount DECIMAL(20,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户关注的交易对表
CREATE TABLE IF NOT EXISTS user_watchlist (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id),
    pool_address VARCHAR(44) NOT NULL,
    price_alert_min DECIMAL(20,8),
    price_alert_max DECIMAL(20,8),
    apr_alert_min DECIMAL(8,4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_id, pool_address)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_trading_pairs_pool_address ON trading_pairs(pool_address);
CREATE INDEX IF NOT EXISTS idx_pair_realtime_data_pool_address ON pair_realtime_data(pool_address);
CREATE INDEX IF NOT EXISTS idx_pair_historical_data_pool_address_date ON pair_historical_data(pool_address, date);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_lp_positions_wallet_id ON lp_positions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_wallet_id ON user_watchlist(wallet_id);