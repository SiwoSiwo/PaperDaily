import { BrowserWindow, ipcMain } from 'electron';
import { researchRepository } from '../db/repositories/research';
import { typedHandle } from '../lib/typed-ipc';
import { wrapAsync } from '../../shared/types/result';
import type { ResearchQuestionUpdate } from '../../shared/types/models';
import { logger } from '../lib/logger';

function requireId(value: string, label: string): void {
  if (typeof value !== 'string' || value.length < 1 || value.length > 100) {
    throw new Error(`${label}无效`);
  }
}

function requireName(value: string, label: string): void {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new Error(`${label}不能为空且不能超过 200 个字符`);
  }
}

function validateQuestionUpdate(update: ResearchQuestionUpdate): void {
  if (!update || typeof update !== 'object') throw new Error('研究问题配置无效');
  requireName(update.name, '研究问题');
  if (!Array.isArray(update.domains) || update.domains.length === 0) {
    throw new Error('请至少填写一个领域关键词');
  }
  if (update.domains.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error('领域关键词格式无效');
  }
  if (typeof update.extraRequirements !== 'string') {
    throw new Error('额外需求格式无效');
  }
  if (update.promptOverride !== null && typeof update.promptOverride !== 'string') {
    throw new Error('Prompt 格式无效');
  }
}

function broadcastResearchChange(
  reason: 'created' | 'updated' | 'deleted' | 'reordered'
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('research:changed', { reason });
    win.webContents.send('papers:changed', { id: '', change: 'scope' });
  }
}

export function registerResearchHandlers(): void {
  typedHandle(ipcMain, 'research:list', async () => wrapAsync(async () => {
    return researchRepository.list();
  }));

  typedHandle(ipcMain, 'research:createDirection', async () => wrapAsync(async () => {
    const direction = researchRepository.createDirection();
    broadcastResearchChange('created');
    return direction;
  }));

  typedHandle(ipcMain, 'research:updateDirection', async (_event, id, name) =>
    wrapAsync(async () => {
      requireId(id, '研究方向 ID');
      requireName(name, '研究方向');
      researchRepository.updateDirection(id, name);
      broadcastResearchChange('updated');
    })
  );

  typedHandle(ipcMain, 'research:deleteDirection', async (_event, id) =>
    wrapAsync(async () => {
      requireId(id, '研究方向 ID');
      researchRepository.deleteDirection(id);
      broadcastResearchChange('deleted');
    })
  );

  typedHandle(ipcMain, 'research:reorderDirections', async (_event, ids) =>
    wrapAsync(async () => {
      if (!Array.isArray(ids)) throw new Error('排序参数无效');
      ids.forEach((id) => requireId(id, '研究方向 ID'));
      researchRepository.reorderDirections(ids);
      broadcastResearchChange('reordered');
    })
  );

  typedHandle(ipcMain, 'research:createQuestion', async (_event, directionId) =>
    wrapAsync(async () => {
      requireId(directionId, '研究方向 ID');
      const question = researchRepository.createQuestion(directionId);
      broadcastResearchChange('created');
      return question;
    })
  );

  typedHandle(ipcMain, 'research:updateQuestion', async (_event, id, update) =>
    wrapAsync(async () => {
      requireId(id, '研究问题 ID');
      validateQuestionUpdate(update);
      researchRepository.updateQuestion(id, update);
      broadcastResearchChange('updated');
    })
  );

  typedHandle(ipcMain, 'research:deleteQuestion', async (_event, id) =>
    wrapAsync(async () => {
      requireId(id, '研究问题 ID');
      researchRepository.deleteQuestion(id);
      broadcastResearchChange('deleted');
    })
  );

  typedHandle(
    ipcMain,
    'research:reorderQuestions',
    async (_event, directionId, ids) => wrapAsync(async () => {
      requireId(directionId, '研究方向 ID');
      if (!Array.isArray(ids)) throw new Error('排序参数无效');
      ids.forEach((id) => requireId(id, '研究问题 ID'));
      researchRepository.reorderQuestions(directionId, ids);
      broadcastResearchChange('reordered');
    })
  );

  logger.info('[IPC] Research handlers registered');
}
