import { app, BrowserWindow } from 'electron';
import {
  createWidgetWindow,
  destroyWidgetWindow,
  showWidgetWindow,
} from './windows/widget-window';
import { destroyMainWindow } from './windows/main-window';
import { registerAllHandlers } from './ipc';
import { registerWindowHandlers } from './windows/ipc-handlers';
import { disposeAgent, ensureDailyPush } from './ipc/agent';
import { getDatabase, closeDatabase } from './db';
import { logger } from './lib/logger';
import { isAppQuitting, markAppQuitting } from './app-lifecycle';
import { APP_USER_MODEL_ID } from './lib/resources';
import { createAppTray, destroyAppTray, hasAppTray } from './windows/tray';

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

if (!app.requestSingleInstanceLock()) {
  logger.warn('[App] Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    // 主窗口只能由 Widget 顶部栏的双击操作打开。
    showWidgetWindow();
  });

  app.whenReady().then(() => {
    logger.info('[App] Application ready');
    app.setName('PaperDaily');

    // 初始化数据库
    getDatabase();

    // 注册 IPC Handler
    registerAllHandlers();
    registerWindowHandlers();

    // 托盘必须先创建成功，之后才能允许最后一个窗口隐藏。
    try {
      createAppTray();
    } catch (error) {
      logger.error('[Tray] Failed to create system tray:', error);
      markAppQuitting();
      app.quit();
      return;
    }

    // 创建 Widget 窗口
    const widgetWindow = createWidgetWindow();

    // Renderer 监听器就绪后执行当天首次推送，成功后会广播刷新 Widget。
    widgetWindow.webContents.once('did-finish-load', () => {
      void ensureDailyPush().then((result) => {
        if (result && !result.success) {
          logger.warn('[Agent] Automatic push failed:', result.error);
        }
      }).catch((error) => {
        logger.error('[Agent] Automatic push crashed:', error);
      });
    });

    // Windows 开机自启动（可选）
    if (process.platform === 'win32' && app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
      });
      logger.info('[App] Login item settings configured');
    }

    app.on('activate', () => {
      // macOS 特性：点击 dock 图标时重新创建窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        createWidgetWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (isAppQuitting()) return;
    if (hasAppTray()) {
      logger.info('[App] All windows hidden; keeping tray process alive');
      return;
    }
    logger.warn('[App] No windows and no tray available; quitting application');
    app.quit();
  });

  app.on('before-quit', () => {
    logger.info('[App] Application quitting');
    markAppQuitting();
    destroyAppTray();

    // 销毁主窗口（移除 close 事件拦截）
    destroyMainWindow();
    destroyWidgetWindow();

    // 清理 Agent 资源
    disposeAgent();

    // 关闭数据库连接
    closeDatabase();
  });

  app.on('will-quit', () => {
    logger.info('[App] Application will quit');
  });
}
