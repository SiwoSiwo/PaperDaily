import { ipcMain } from 'electron';
import { typedHandle } from '../lib/typed-ipc';
import { papersRepository } from '../db/repositories/papers';
import { intensiveRecommender } from '../services/intensive-recommender';
import { wrapAsync } from '../../shared/types/result';
import { logger } from '../lib/logger';

/**
 * 注册精读库相关的 IPC Handler
 */
export function registerIntensiveHandlers(): void {
  // 查询精读库
  typedHandle(ipcMain, 'intensive:list', async () => {
    return wrapAsync(async () => {
      logger.info('[IPC] intensive:list');
      return papersRepository.findIntensive();
    });
  });

  // 精读推荐
  typedHandle(ipcMain, 'intensive:recommend', async () => {
    return wrapAsync(async () => {
      logger.info('[IPC] intensive:recommend');
      return intensiveRecommender.recommend();
    });
  });

  logger.info('[IPC] Intensive handlers registered');
}
