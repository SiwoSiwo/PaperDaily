import { ipcMain } from 'electron';
import { typedHandle } from '../lib/typed-ipc';
import { reviewScheduleRepository } from '../db/repositories/review-schedule';
import { wrapAsync } from '../../shared/types/result';
import { logger } from '../lib/logger';

/**
 * 注册复习相关的 IPC Handler
 */
export function registerReviewHandlers(): void {
  // 查询今日待复习
  typedHandle(ipcMain, 'review:today', async () => {
    return wrapAsync(async () => {
      logger.info('[IPC] review:today');
      return reviewScheduleRepository.findTodayReviews();
    });
  });

  // 标记复习完成
  typedHandle(ipcMain, 'review:markDone', async (_event, scheduleId) => {
    return wrapAsync(async () => {
      logger.info('[IPC] review:markDone', scheduleId);
      reviewScheduleRepository.markDone(scheduleId);
    });
  });

  logger.info('[IPC] Review handlers registered');
}
