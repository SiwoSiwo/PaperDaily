import type { AgentStage } from './models';

// ========== 主进程 → 渲染进程 的事件类型 ==========
export type IpcEventMap = {
  'papers:pushArrived': { count: number; date: string };
  'papers:changed': {
    id: string;
    change: 'deleted' | 'intensive' | 'finished' | 'scope';
  };
  'agent:progress': { stage: AgentStage };
  'agent:error': { message: string };
  'settings:changed': { key: string; value: unknown };
  'research:changed': { reason: 'created' | 'updated' | 'deleted' | 'reordered' };
};

// 事件类型提取
export type EventData<T extends keyof IpcEventMap> = IpcEventMap[T];
