import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannelMap, ChannelArgs, ChannelReturn } from '../shared/types/ipc';
import type { IpcEventMap, EventData } from '../shared/types/ipc-events';
import type {
  ArticleLibraryQuery,
  PromptPreviewInput,
  ResearchQuestionUpdate,
  UserSettings,
} from '../shared/types/models';

/**
 * 类型安全的 IPC Invoke
 */
function typedInvoke<T extends keyof IpcChannelMap>(
  channel: T,
  ...args: ChannelArgs<T>
): Promise<ChannelReturn<T>> {
  return ipcRenderer.invoke(channel, ...args);
}

/**
 * 类型安全的 IPC 事件监听
 */
function typedOn<T extends keyof IpcEventMap>(
  channel: T,
  callback: (data: EventData<T>) => void
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, data: EventData<T>) => {
    callback(data);
  };

  ipcRenderer.on(channel, listener);

  // 返回取消订阅函数
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

/**
 * 暴露给渲染进程的 API
 */
const api = {
  // ── Papers ──
  papersToday: () => typedInvoke('papers:today'),
  papersHistory: (date: string) => typedInvoke('papers:history', date),
  papersDelete: (id: string) => typedInvoke('papers:delete', id),
  papersSetIntensive: (id: string, value: boolean) =>
    typedInvoke('papers:setIntensive', id, value),
  papersSetFinished: (id: string, value: boolean) =>
    typedInvoke('papers:setFinished', id, value),
  papersSearch: (query: string) => typedInvoke('papers:search', query),
  papersLibrary: (query: ArticleLibraryQuery) => typedInvoke('papers:library', query),

  // ── Research ──
  researchList: () => typedInvoke('research:list'),
  researchCreateDirection: () => typedInvoke('research:createDirection'),
  researchUpdateDirection: (id: string, name: string) =>
    typedInvoke('research:updateDirection', id, name),
  researchDeleteDirection: (id: string) =>
    typedInvoke('research:deleteDirection', id),
  researchReorderDirections: (ids: string[]) =>
    typedInvoke('research:reorderDirections', ids),
  researchCreateQuestion: (directionId: string) =>
    typedInvoke('research:createQuestion', directionId),
  researchUpdateQuestion: (id: string, update: ResearchQuestionUpdate) =>
    typedInvoke('research:updateQuestion', id, update),
  researchDeleteQuestion: (id: string) =>
    typedInvoke('research:deleteQuestion', id),
  researchReorderQuestions: (directionId: string, ids: string[]) =>
    typedInvoke('research:reorderQuestions', directionId, ids),

  // ── Intensive ──
  intensiveList: () => typedInvoke('intensive:list'),
  intensiveRecommend: () => typedInvoke('intensive:recommend'),

  // ── Review ──
  reviewToday: () => typedInvoke('review:today'),
  reviewMarkDone: (scheduleId: number) => typedInvoke('review:markDone', scheduleId),

  // ── Agent ──
  agentFetch: () => typedInvoke('agent:fetch'),
  agentTest: () => typedInvoke('agent:test'),
  agentModels: () => typedInvoke('agent:models'),
  agentPoolStatus: () => typedInvoke('agent:poolStatus'),

  // ── Prompt ──
  promptPreview: (input?: PromptPreviewInput) => typedInvoke('prompt:preview', input),
  promptFetchWithEdit: (editedPrompt: string) =>
    typedInvoke('prompt:fetchWithEdit', editedPrompt),

  // ── Settings ──
  settingsGetAll: () => typedInvoke('settings:getAll'),
  settingsGet: (key: string) => typedInvoke('settings:get', key),
  settingsSet: (key: keyof UserSettings, value: unknown) => typedInvoke('settings:set', key, value),
  settingsUpdate: (settings: Partial<UserSettings>) =>
    typedInvoke('settings:update', settings),

  // ── Window ──
  windowOpenMain: () => typedInvoke('window:openMain'),
  windowHideWidget: () => typedInvoke('window:hideWidget'),
  windowMinimize: () => typedInvoke('window:minimize'),
  shellOpenExternal: (url: string) => typedInvoke('shell:openExternal', url),

  // ── Events ──
  onPapersPushArrived: (callback: (data: EventData<'papers:pushArrived'>) => void) =>
    typedOn('papers:pushArrived', callback),
  onPapersChanged: (callback: (data: EventData<'papers:changed'>) => void) =>
    typedOn('papers:changed', callback),
  onAgentProgress: (callback: (data: EventData<'agent:progress'>) => void) =>
    typedOn('agent:progress', callback),
  onAgentError: (callback: (data: EventData<'agent:error'>) => void) =>
    typedOn('agent:error', callback),
  onSettingsChanged: (callback: (data: EventData<'settings:changed'>) => void) =>
    typedOn('settings:changed', callback),
  onResearchChanged: (callback: (data: EventData<'research:changed'>) => void) =>
    typedOn('research:changed', callback),
};

// 暴露到全局对象 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', api);

// 类型声明（在 renderer 中使用）
export type ElectronAPI = typeof api;
