import { BrowserWindow, ipcMain, shell } from 'electron';
import { showMainWindow } from './main-window';
import { hideWidgetWindow } from './widget-window';
import { logger } from '../lib/logger';
import { typedHandle } from '../lib/typed-ipc';
import { err, ok } from '../../shared/types/result';

function isWidgetSender(url: string): boolean {
  try {
    return new URL(url).hash === '#/widget';
  } catch {
    return false;
  }
}

function validateExternalUrl(value: string): string {
  if (value.length > 4096) throw new Error('论文链接过长，已拒绝打开');
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅允许打开 HTTP 或 HTTPS 论文链接');
  }
  return url.toString();
}

/**
 * 注册窗口相关的 IPC Handler
 */
export function registerWindowHandlers(): void {
  // 打开主窗口（从 Widget 点击时）
  ipcMain.handle('window:openMain', (event) => {
    if (!isWidgetSender(event.sender.getURL())) {
      logger.warn('[Window] Ignored open-main request outside Widget');
      return;
    }
    logger.info('[Window] Opening main window');
    showMainWindow();
  });

  // 最小化窗口
  ipcMain.handle('window:minimize', (_event) => {
    logger.info('[Window] Minimize window');
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      win.minimize();
    }
  });

  ipcMain.handle('window:hideWidget', (event) => {
    if (!isWidgetSender(event.sender.getURL())) {
      logger.warn('[Window] Ignored hide-widget request outside Widget');
      return;
    }
    logger.info('[Window] Hiding Widget to system tray');
    hideWidgetWindow();
  });

  typedHandle(ipcMain, 'shell:openExternal', async (event, value) => {
    try {
      if (!isWidgetSender(event.sender.getURL())) {
        throw new Error('仅允许从 Widget 打开论文链接');
      }
      const url = validateExternalUrl(value);

      if (process.platform === 'win32') {
        try {
          await shell.openExternal(`microsoft-edge:${url}`);
          return ok(undefined);
        } catch (edgeError) {
          logger.warn(
            '[Window] Microsoft Edge launch failed; using default browser:',
            edgeError
          );
        }
      }

      await shell.openExternal(url);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Window] Failed to open external URL:', message);
      return err(message);
    }
  });

  logger.info('[Window] Window handlers registered');
}
