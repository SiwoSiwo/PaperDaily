import { BrowserWindow } from 'electron';
import { join } from 'path';
import { logger } from '../lib/logger';
import { isAppQuitting } from '../app-lifecycle';
import { APP_USER_MODEL_ID, getAppIconPath } from '../lib/resources';

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
export function createMainWindow(activate = true): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (activate) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
    } else {
      mainWindow.showInactive();
    }
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    icon: getAppIconPath(),
    show: false, // 初始隐藏，点击 Widget 时显示
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (process.platform === 'win32') {
    mainWindow.setAppDetails({
      appId: APP_USER_MODEL_ID,
      appIconPath: getAppIconPath(),
      appIconIndex: 0,
      relaunchCommand: process.execPath,
      relaunchDisplayName: 'PaperDaily',
    });
  }

  // 开发环境加载 URL，生产环境加载文件
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (activate) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        mainWindow.showInactive();
      }
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.moveTop();
    }
  });

  // 关闭时隐藏而不销毁
  mainWindow.on('close', (event) => {
    if (!isAppQuitting() && mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  logger.info('[Window] Main window created');
  return mainWindow;
}

/**
 * 获取主窗口实例
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

/**
 * 显示主窗口
 */
export function showMainWindow(activate = true): BrowserWindow {
  const win = getMainWindow();
  if (win) {
    if (activate) {
      win.show();
      win.focus();
      win.moveTop();
    } else {
      win.showInactive();
    }
    return win;
  } else {
    return createMainWindow(activate);
  }
}

/**
 * 隐藏主窗口
 */
export function hideMainWindow(): void {
  const win = getMainWindow();
  if (win) {
    win.hide();
  }
}

/**
 * 销毁主窗口
 */
export function destroyMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
}
