import { query } from '@/config/database';
import logger from '@/config/logger';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  sql: string;
}

class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async createMigrationsTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('Tabela de migrações criada/verificada');
    } catch (error) {
      logger.error('Erro ao criar tabela de migrações', error);
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await query('SELECT name FROM migrations ORDER BY id');
      return result.rows.map(row => row.name);
    } catch (error) {
      logger.error('Erro ao obter migrações executadas', error);
      return [];
    }
  }

  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];

      for (const file of files) {
        const filePath = path.join(this.migrationsPath, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        const name = file.replace('.sql', '');

        migrations.push({
          id: name,
          name: file,
          sql
        });
      }

      return migrations;
    } catch (error) {
      logger.error('Erro ao carregar migrações', error);
      throw error;
    }
  }

  async executeMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Executando migração: ${migration.name}`);
      
      // Executar a migração
      await query(migration.sql);
      
      // Registrar a migração como executada
      await query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      
      logger.info(`Migração ${migration.name} executada com sucesso`);
    } catch (error) {
      logger.error(`Erro ao executar migração ${migration.name}`, error);
      throw error;
    }
  }

  async migrate(): Promise<void> {
    try {
      logger.info('Iniciando processo de migração...');

      // Criar tabela de migrações se não existir
      await this.createMigrationsTable();

      // Obter migrações já executadas
      const executedMigrations = await this.getExecutedMigrations();

      // Carregar todas as migrações
      const allMigrations = await this.loadMigrations();

      // Filtrar migrações não executadas
      const pendingMigrations = allMigrations.filter(
        migration => !executedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('Nenhuma migração pendente');
        return;
      }

      logger.info(`${pendingMigrations.length} migração(ões) pendente(s)`);

      // Executar migrações pendentes
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info('Processo de migração concluído com sucesso');
    } catch (error) {
      logger.error('Erro durante o processo de migração', error);
      throw error;
    }
  }

  async rollback(steps: number = 1): Promise<void> {
    try {
      logger.info(`Iniciando rollback de ${steps} migração(ões)...`);

      // Obter últimas migrações executadas
      const result = await query(
        'SELECT name FROM migrations ORDER BY id DESC LIMIT $1',
        [steps]
      );

      if (result.rows.length === 0) {
        logger.info('Nenhuma migração para fazer rollback');
        return;
      }

      for (const row of result.rows) {
        logger.info(`Fazendo rollback da migração: ${row.name}`);
        
        // Aqui você implementaria a lógica de rollback específica
        // Por simplicidade, apenas removemos o registro da migração
        await query(
          'DELETE FROM migrations WHERE name = $1',
          [row.name]
        );
        
        logger.info(`Rollback da migração ${row.name} concluído`);
      }

      logger.info('Processo de rollback concluído');
    } catch (error) {
      logger.error('Erro durante o processo de rollback', error);
      throw error;
    }
  }

  async status(): Promise<void> {
    try {
      logger.info('Verificando status das migrações...');

      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = await this.loadMigrations();

      logger.info(`Total de migrações: ${allMigrations.length}`);
      logger.info(`Migrações executadas: ${executedMigrations.length}`);
      logger.info(`Migrações pendentes: ${allMigrations.length - executedMigrations.length}`);

      if (executedMigrations.length > 0) {
        logger.info('Migrações executadas:');
        executedMigrations.forEach(name => {
          logger.info(`  ✓ ${name}`);
        });
      }

      const pendingMigrations = allMigrations.filter(
        migration => !executedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length > 0) {
        logger.info('Migrações pendentes:');
        pendingMigrations.forEach(migration => {
          logger.info(`  ⏳ ${migration.name}`);
        });
      }
    } catch (error) {
      logger.error('Erro ao verificar status das migrações', error);
      throw error;
    }
  }
}

// Função principal
async function main(): Promise<void> {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2] || 'migrate';
  const steps = parseInt(process.argv[3]) || 1;

  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
      case 'rollback':
        await migrator.rollback(steps);
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        logger.error(`Comando desconhecido: ${command}`);
        logger.info('Comandos disponíveis: migrate, rollback, status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Erro na execução do migrador', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export default DatabaseMigrator;
