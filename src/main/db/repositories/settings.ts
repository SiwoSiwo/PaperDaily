import { getDatabase } from '../index';
import type { UserSettings } from '../../../shared/types/models';
import { defaultSettings } from '../../../shared/types/models';

/**
 * Settings Repository - 用户设置数据访问层
 */
export class SettingsRepository {
  private db = getDatabase();

  /**
   * 获取所有设置
   */
  getAll(): UserSettings {
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as Array<{ key: string; value: string }>;

    const settings: Record<string, any> = { ...defaultSettings };

    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    return settings as UserSettings;
  }

  /**
   * 获取单个设置
   */
  get(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  /**
   * 设置单个配置项
   */
  set(key: string, value: unknown): void {
    const jsonValue = JSON.stringify(value);
    this.db
      .prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `)
      .run(key, jsonValue);
  }

  /**
   * 批量更新设置
   */
  update(settings: Partial<UserSettings>): void {
    const updateMany = this.db.transaction((entries: Array<[string, unknown]>) => {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    });

    updateMany(Object.entries(settings));
  }
}

export const settingsRepository = new SettingsRepository();
