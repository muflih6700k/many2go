import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  CORS_ORIGIN: process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:19006']
    : process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:19006'],
};

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (env.NODE_ENV === 'production' && 
    (env.JWT_ACCESS_SECRET === 'default-access-secret' || 
     env.JWT_REFRESH_SECRET === 'default-refresh-secret')) {
  throw new Error('Production requires custom JWT secrets');
}
