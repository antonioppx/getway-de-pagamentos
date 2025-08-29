import { query } from '@/config/database';
import logger from '@/config/logger';
import fs from 'fs';
import path from 'path';

interface SeedFile {
  name: string;
  sql: string;
}

class DatabaseSeeder {
  private seedsPath: string;

  constructor() {
    this.seedsPath = path.join(__dirname, 'seeds');
  }

  async createSeedsTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS seeds (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('Tabela de seeds criada/verificada');
    } catch (error) {
      logger.error('Erro ao criar tabela de seeds', error);
      throw error;
    }
  }

  async getExecutedSeeds(): Promise<string[]> {
    try {
      const result = await query('SELECT name FROM seeds ORDER BY id');
      return result.rows.map(row => row.name);
    } catch (error) {
      logger.error('Erro ao obter seeds executados', error);
      return [];
    }
  }

  async loadSeedFiles(): Promise<SeedFile[]> {
    try {
      const files = fs.readdirSync(this.seedsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const seeds: SeedFile[] = [];

      for (const file of files) {
        const filePath = path.join(this.seedsPath, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        seeds.push({
          name: file,
          sql
        });
      }

      return seeds;
    } catch (error) {
      logger.error('Erro ao carregar arquivos de seed', error);
      throw error;
    }
  }

  async executeSeed(seed: SeedFile): Promise<void> {
    try {
      logger.info(`Executando seed: ${seed.name}`);
      
      // Executar o seed
      await query(seed.sql);
      
      // Registrar o seed como executado
      await query(
        'INSERT INTO seeds (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [seed.name]
      );
      
      logger.info(`Seed ${seed.name} executado com sucesso`);
    } catch (error) {
      logger.error(`Erro ao executar seed ${seed.name}`, error);
      throw error;
    }
  }

  async seed(): Promise<void> {
    try {
      logger.info('Iniciando processo de seed...');

      // Criar tabela de seeds se não existir
      await this.createSeedsTable();

      // Obter seeds já executados
      const executedSeeds = await this.getExecutedSeeds();

      // Carregar todos os seeds
      const allSeeds = await this.loadSeedFiles();

      if (allSeeds.length === 0) {
        logger.info('Nenhum arquivo de seed encontrado');
        return;
      }

      logger.info(`${allSeeds.length} arquivo(s) de seed encontrado(s)`);

      // Executar todos os seeds (podem ser executados múltiplas vezes)
      for (const seed of allSeeds) {
        await this.executeSeed(seed);
      }

      logger.info('Processo de seed concluído com sucesso');
    } catch (error) {
      logger.error('Erro durante o processo de seed', error);
      throw error;
    }
  }

  async seedFresh(): Promise<void> {
    try {
      logger.info('Iniciando processo de seed fresh...');

      // Limpar tabela de seeds
      await query('DELETE FROM seeds');
      logger.info('Tabela de seeds limpa');

      // Executar seeds
      await this.seed();
    } catch (error) {
      logger.error('Erro durante o processo de seed fresh', error);
      throw error;
    }
  }

  async status(): Promise<void> {
    try {
      logger.info('Verificando status dos seeds...');

      const executedSeeds = await this.getExecutedSeeds();
      const allSeeds = await this.loadSeedFiles();

      logger.info(`Total de seeds: ${allSeeds.length}`);
      logger.info(`Seeds executados: ${executedSeeds.length}`);

      if (executedSeeds.length > 0) {
        logger.info('Seeds executados:');
        executedSeeds.forEach(name => {
          logger.info(`  ✓ ${name}`);
        });
      }

      const pendingSeeds = allSeeds.filter(
        seed => !executedSeeds.includes(seed.name)
      );

      if (pendingSeeds.length > 0) {
        logger.info('Seeds pendentes:');
        pendingSeeds.forEach(seed => {
          logger.info(`  ⏳ ${seed.name}`);
        });
      }
    } catch (error) {
      logger.error('Erro ao verificar status dos seeds', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      logger.info('Iniciando limpeza dos dados...');

      // Lista de tabelas para limpar (em ordem de dependência)
      const tables = [
        'webhook_events',
        'webhooks',
        'notifications',
        'audit_logs',
        'refresh_tokens',
        'reports',
        'payouts',
        'charges',
        'transactions',
        'kyc_documents',
        'fee_settings',
        'system_settings',
        'users'
      ];

      for (const table of tables) {
        try {
          await query(`DELETE FROM ${table}`);
          logger.info(`Tabela ${table} limpa`);
        } catch (error) {
          logger.warn(`Erro ao limpar tabela ${table}:`, error);
        }
      }

      // Limpar tabela de seeds
      await query('DELETE FROM seeds');
      logger.info('Tabela de seeds limpa');

      logger.info('Limpeza dos dados concluída');
    } catch (error) {
      logger.error('Erro durante a limpeza dos dados', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      logger.info('Iniciando reset completo do banco...');

      // Limpar dados
      await this.clear();

      // Executar seeds
      await this.seed();

      logger.info('Reset completo concluído');
    } catch (error) {
      logger.error('Erro durante o reset completo', error);
      throw error;
    }
  }
}

// Função principal
async function main(): Promise<void> {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2] || 'seed';

  try {
    switch (command) {
      case 'seed':
        await seeder.seed();
        break;
      case 'seed:fresh':
        await seeder.seedFresh();
        break;
      case 'seed:reset':
        await seeder.reset();
        break;
      case 'seed:clear':
        await seeder.clear();
        break;
      case 'seed:status':
        await seeder.status();
        break;
      default:
        logger.error(`Comando desconhecido: ${command}`);
        logger.info('Comandos disponíveis: seed, seed:fresh, seed:reset, seed:clear, seed:status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Erro na execução do seeder', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export default DatabaseSeeder;
