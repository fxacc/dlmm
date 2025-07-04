import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL 连接池
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'meteora_lp',
  user: process.env.DB_USER || 'meteora_user',
  password: process.env.DB_PASSWORD || 'meteora_password123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis 客户端
export const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// 初始化数据库连接
export async function initDatabase() {
  try {
    // 测试 PostgreSQL 连接
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();

    // 连接 Redis
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// 关闭数据库连接
export async function closeDatabase() {
  try {
    await pool.end();
    await redisClient.disconnect();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}