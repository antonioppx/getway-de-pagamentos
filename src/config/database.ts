import { Pool, PoolConfig } from 'pg';
import logger from './logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pagamentos',
  user: process.env.DB_USER || 'pagamentos_user',
  password: process.env.DB_PASSWORD || 'sua_senha_segura',
  ssl: process.env.NODE_ENV === 'production',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(databaseConfig);

// Teste de conexão
pool.on('connect', () => {
  logger.info('Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool de conexões do PostgreSQL', err);
  process.exit(-1);
});

// Função para executar queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Erro ao executar query', { text, error });
    throw error;
  }
};

// Função para obter um cliente do pool
export const getClient = () => {
  return pool.connect();
};

// Função para fechar o pool
export const closePool = async () => {
  await pool.end();
  logger.info('Pool de conexões do PostgreSQL fechado');
};

export default pool;
