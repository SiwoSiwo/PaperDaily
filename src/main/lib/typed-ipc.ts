import type { IpcMainInvokeEvent, IpcMain } from 'electron';
import type { IpcChannelMap, ChannelArgs, ChannelReturn } from '../../shared/types/ipc';

/**
 * 类型安全的 IPC Handler 注册函数
 */
export function typedHandle<T extends keyof IpcChannelMap>(
  ipcMain: IpcMain,
  channel: T,
  handler: (event: IpcMainInvokeEvent, ...args: ChannelArgs<T>) => Promise<ChannelReturn<T>> | ChannelReturn<T>
): void {
  ipcMain.handle(channel, handler as any);
}

/**
 * 移除 IPC Handler
 */
export function removeHandler(ipcMain: IpcMain, channel: string): void {
  ipcMain.removeHandler(channel);
}
