import { BrowserWindow } from 'electron';
import { join } from 'path';
import { logger } from '../lib/logger';
import { isAppQuitting } from '../app-lifecycle';
import { getAppIconPath } from '../lib/resources';

let widgetWindow: BrowserWindow | null = null;

/**
 * 创建 Widget 窗口（小组件）
 */
export function createWidgetWindow(): BrowserWindow {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show();
    widgetWindow.focus();
    widgetWindow.moveTop();
    return widgetWindow;
  }

  widgetWindow = new BrowserWindow({
    width: 360,
    height: 520,
    minWidth: 300,
    minHeight: 360,
    icon: getAppIconPath(),
    frame: false, // 无边框
    transparent: true, // 透明背景
    backgroundColor: '#00000000', // Windows 透明窗口必须显式使用全透明底色
    backgroundMaterial: 'none',
    hasShadow: false, // 避免 DWM 在圆角内容下绘制矩形窗口阴影
    show: false, // 等透明页面完成首帧绘制后再显示，避免白色矩形闪烁
    alwaysOnTop: false,
    movable: true,
    resizable: true,
    skipTaskbar: true, // 不在任务栏显示
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // 开发环境加载 URL，生产环境加载文件
  if (process.env.ELECTRON_RENDERER_URL) {
    widgetWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/widget`);
  } else {
    widgetWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/widget',
    });
  }

  widgetWindow.once('ready-to-show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  widgetWindow.on('close', (event) => {
    if (!isAppQuitting()) {
      event.preventDefault();
      widgetWindow?.hide();
      logger.info('[Window] Widget hidden to system tray');
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  widgetWindow.on('focus', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.moveTop();
    }
  });

  logger.info('[Window] Widget window created');
  return widgetWindow;
}

/**
 * 获取 Widget 窗口实例
 */
export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindow && !widgetWindow.isDestroyed() ? widgetWindow : null;
}

/**
 * 显示 Widget 窗口
 */
export function showWidgetWindow(): void {
  const win = getWidgetWindow();
  if (win) {
    win.show();
    win.focus();
  } else {
    createWidgetWindow();
  }
}

/**
 * 隐藏 Widget 窗口
 */
export function hideWidgetWindow(): void {
  const win = getWidgetWindow();
  if (win) {
    win.hide();
  }
}

export function destroyWidgetWindow(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.destroy();
  }
  widgetWindow = null;
}
