import { BrowserWindow, ipcMain } from 'electron';
import { typedHandle } from '../lib/typed-ipc';
import { papersRepository } from '../db/repositories/papers';
import { ok, err, wrapAsync } from '../../shared/types/result';
import { logger } from '../lib/logger';
import type { ArticleLibraryQuery } from '../../shared/types/models';
import { researchRepository } from '../db/repositories/research';

const booleanFilters = new Set(['all', 'yes', 'no']);

function isArticleLibraryQuery(value: ArticleLibraryQuery): boolean {
  return typeof value === 'object'
    && value !== null
    && typeof value.title === 'string'
    && typeof value.researchDirectionId === 'string'
    && typeof value.researchQuestionId === 'string'
    && booleanFilters.has(value.intensive)
    && booleanFilters.has(value.read)
    && booleanFilters.has(value.review)
    && (value.sortBy === 'date' || value.sortBy === 'matchScore')
    && (value.sortOrder === 'asc' || value.sortOrder === 'desc');
}

function broadcastPaperChange(
  id: string,
  change: 'deleted' | 'intensive' | 'finished'
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('papers:changed', { id, change });
  }
}

/**
 * 注册论文相关的 IPC Handler
 */
export function registerPapersHandlers(): void {
  // 查询今日推送
  typedHandle(ipcMain, 'papers:today', async () => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:today');
      return papersRepository.findToday(researchRepository.getActive().question.id);
    });
  });

  // 查询历史记录
  typedHandle(ipcMain, 'papers:history', async (_event, date) => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:history', date);
      return papersRepository.findByPushDate(
        date,
        researchRepository.getActive().question.id
      );
    });
  });

  // 删除论文
  typedHandle(ipcMain, 'papers:delete', async (_event, id) => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:delete', id);
      papersRepository.delete(id);
      broadcastPaperChange(id, 'deleted');
    });
  });

  // 标记精读
  typedHandle(ipcMain, 'papers:setIntensive', async (_event, id, value) => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:setIntensive', id, value);
      papersRepository.setIntensive(id, value);
      broadcastPaperChange(id, 'intensive');
    });
  });

  // 标记已读完
  typedHandle(ipcMain, 'papers:setFinished', async (_event, id, value) => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:setFinished', id, value);
      papersRepository.setFinished(id, value);
      broadcastPaperChange(id, 'finished');
    });
  });

  // 搜索论文
  typedHandle(ipcMain, 'papers:search', async (_event, query) => {
    return wrapAsync(async () => {
      logger.info('[IPC] papers:search', query);
      return papersRepository.search(query);
    });
  });

  typedHandle(ipcMain, 'papers:library', async (_event, query) => {
    return wrapAsync(async () => {
      if (!isArticleLibraryQuery(query)) {
        throw new Error('文章库查询参数无效');
      }
      logger.info('[IPC] papers:library');
      return papersRepository.findLibrary(query);
    });
  });

  logger.info('[IPC] Papers handlers registered');
}
