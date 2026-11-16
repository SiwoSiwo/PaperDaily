import { ipcMain } from 'electron';
import { typedHandle } from '../lib/typed-ipc';
import { settingsRepository } from '../db/repositories/settings';
import { wrapAsync } from '../../shared/types/result';
import { logger } from '../lib/logger';

/**
 * 注册设置相关的 IPC Handler
 */
export function registerSettingsHandlers(): void {
  // 获取所有设置
  typedHandle(ipcMain, 'settings:getAll', async () => {
    return wrapAsync(async () => {
      logger.info('[IPC] settings:getAll');
      return settingsRepository.getAll();
    });
  });

  // 获取单个设置
  typedHandle(ipcMain, 'settings:get', async (_event, key) => {
    return wrapAsync(async () => {
      logger.info('[IPC] settings:get', key);
      return settingsRepository.get(key);
    });
  });

  // 设置单个配置
  typedHandle(ipcMain, 'settings:set', async (_event, key, value) => {
    return wrapAsync(async () => {
      logger.info('[IPC] settings:set', key, value);
      settingsRepository.set(key, value);
    });
  });

  // 批量更新设置
  typedHandle(ipcMain, 'settings:update', async (_event, settings) => {
    return wrapAsync(async () => {
      logger.info('[IPC] settings:update', Object.keys(settings));
      settingsRepository.update(settings);
    });
  });

  logger.info('[IPC] Settings handlers registered');
}
