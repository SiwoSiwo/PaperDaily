import { app } from 'electron';
import { join } from 'path';
import { readFileSync, existsSync, mkdirSync } from 'fs';

// Use require to prevent bundling of better-sqlite3
const Database = require('better-sqlite3') as typeof import('better-sqlite3');

let db: InstanceType<typeof Database> | null = null;

/**
 * 获取数据库实例（单例）
 */
export function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = join(userDataPath, 'paper-daily.db');

    // 确保目录存在
    const dbDir = join(userDataPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('foreign_keys = ON'); // 启用外键约束

    // 运行迁移
    runMigrations(db);
  }

  return db;
}

/**
 * 运行数据库迁移
 */
function runMigrations(database: InstanceType<typeof Database>): void {
  // 创建迁移记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const migrations = [
    { id: 1, name: '001_init.sql' },
    { id: 2, name: '002_extend_agent_timeout.sql' },
    { id: 3, name: '003_add_agent_model.sql' },
    { id: 4, name: '004_add_recommendation_pool.sql' },
    { id: 5, name: '005_add_research_profiles.sql' },
  ];

  for (const migration of migrations) {
    const applied = database
      .prepare('SELECT * FROM migrations WHERE name = ?')
      .get(migration.name);

    if (!applied) {
      console.log(`[DB] Applying migration: ${migration.name}`);
      const candidatePaths = [
        join(__dirname, 'migrations', migration.name),
        join(process.resourcesPath, 'migrations', migration.name),
        join(app.getAppPath(), 'src', 'main', 'db', 'migrations', migration.name),
      ];
      const migrationPath = candidatePaths.find((path) => existsSync(path));
      if (!migrationPath) {
        throw new Error(`Migration file not found: ${migration.name}`);
      }
      
      const sql = readFileSync(migrationPath, 'utf-8');
      const applyMigration = database.transaction(() => {
        database.exec(sql);
        database
          .prepare('INSERT INTO migrations (id, name) VALUES (?, ?)')
          .run(migration.id, migration.name);
      });
      applyMigration();
      console.log(`[DB] Migration ${migration.name} applied successfully`);
    }
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
