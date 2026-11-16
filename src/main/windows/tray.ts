import { app, Menu, Tray } from 'electron';
import { markAppQuitting } from '../app-lifecycle';
import { getAppIconPath } from '../lib/resources';
import { logger } from '../lib/logger';
import { showMainWindow } from './main-window';
import { showWidgetWindow } from './widget-window';

let appTray: Tray | null = null;

export function createAppTray(): Tray {
  if (appTray && !appTray.isDestroyed()) return appTray;

  appTray = new Tray(getAppIconPath());
  appTray.setToolTip('PaperDaily');
  appTray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示 Widget',
        click: () => showWidgetWindow(),
      },
      {
        label: '打开主窗口',
        click: () => showMainWindow(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          logger.info('[Tray] Quit requested');
          markAppQuitting();
          app.quit();
        },
      },
    ])
  );

  // 单击托盘图标只负责恢复并聚焦 Widget，不做隐式退出。
  appTray.on('click', () => showWidgetWindow());
  logger.info('[Tray] System tray created');
  return appTray;
}

export function hasAppTray(): boolean {
  return Boolean(appTray && !appTray.isDestroyed());
}

export function destroyAppTray(): void {
  if (appTray && !appTray.isDestroyed()) appTray.destroy();
  appTray = null;
}
