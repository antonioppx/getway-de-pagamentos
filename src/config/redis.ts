import { createClient, RedisClientType } from 'redis';
import logger from './logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
};

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Conectado ao Redis');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis pronto para uso');
    });

    this.client.on('error', (err) => {
      logger.error('Erro no Redis', err);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('Conexão com Redis encerrada');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Reconectando ao Redis...');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Erro ao definir chave no Redis', { key, error });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Erro ao obter chave do Redis', { key, error });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Erro ao deletar chave do Redis', { key, error });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Erro ao verificar existência da chave no Redis', { key, error });
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      logger.error('Erro ao definir TTL no Redis', { key, ttl, error });
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Erro ao obter TTL do Redis', { key, error });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Erro ao incrementar chave no Redis', { key, error });
      throw error;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Erro ao decrementar chave no Redis', { key, error });
      throw error;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Erro ao definir campo hash no Redis', { key, field, error });
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Erro ao obter campo hash do Redis', { key, field, error });
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Erro ao obter todos os campos hash do Redis', { key, error });
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      return await this.client.hDel(key, field);
    } catch (error) {
      logger.error('Erro ao deletar campo hash do Redis', { key, field, error });
      throw error;
    }
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  getClient(): RedisClientType {
    return this.client;
  }
}

const redisService = new RedisService();

export default redisService;
