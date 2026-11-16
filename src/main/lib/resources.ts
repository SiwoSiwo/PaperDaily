import { app } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';

export const APP_USER_MODEL_ID = 'com.paperdaily.app';

export function getAppIconPath(): string {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(app.getAppPath(), 'icon.ico');

  if (!existsSync(iconPath)) {
    throw new Error(`应用图标不存在：${iconPath}`);
  }

  return iconPath;
}
