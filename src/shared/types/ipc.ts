import type {
  Paper,
  ArticleLibraryItem,
  ArticleLibraryQuery,
  AgentModelOption,
  AgentPaperResult,
  RecommendationPoolStatus,
  PromptPreviewInput,
  ResearchDirection,
  ResearchQuestion,
  ResearchQuestionUpdate,
  ReviewItem,
  UserSettings,
} from './models';
import type { IpcResult } from './result';

// ========== IPC 通道类型映射 ==========
export type IpcChannelMap = {
  // ── 论文 ──
  'papers:today': { args: []; return: IpcResult<Paper[]> };
  'papers:history': { args: [date: string]; return: IpcResult<Paper[]> };
  'papers:delete': { args: [id: string]; return: IpcResult<void> };
  'papers:setIntensive': {
    args: [id: string, value: boolean];
    return: IpcResult<void>;
  };
  'papers:setFinished': {
    args: [id: string, value: boolean];
    return: IpcResult<void>;
  };
  'papers:search': { args: [query: string]; return: IpcResult<Paper[]> };
  'papers:library': {
    args: [query: ArticleLibraryQuery];
    return: IpcResult<ArticleLibraryItem[]>;
  };

  // ── 研究方向 ──
  'research:list': { args: []; return: IpcResult<ResearchDirection[]> };
  'research:createDirection': {
    args: [];
    return: IpcResult<ResearchDirection>;
  };
  'research:updateDirection': {
    args: [id: string, name: string];
    return: IpcResult<void>;
  };
  'research:deleteDirection': {
    args: [id: string];
    return: IpcResult<void>;
  };
  'research:reorderDirections': {
    args: [ids: string[]];
    return: IpcResult<void>;
  };
  'research:createQuestion': {
    args: [directionId: string];
    return: IpcResult<ResearchQuestion>;
  };
  'research:updateQuestion': {
    args: [id: string, update: ResearchQuestionUpdate];
    return: IpcResult<void>;
  };
  'research:deleteQuestion': {
    args: [id: string];
    return: IpcResult<void>;
  };
  'research:reorderQuestions': {
    args: [directionId: string, ids: string[]];
    return: IpcResult<void>;
  };

  // ── 精读库 ──
  'intensive:list': { args: []; return: IpcResult<Paper[]> };
  'intensive:recommend': { args: []; return: IpcResult<Paper[]> };

  // ── 复习 ──
  'review:today': { args: []; return: IpcResult<ReviewItem[]> };
  'review:markDone': { args: [scheduleId: number]; return: IpcResult<void> };

  // ── Agent ──
  'agent:fetch': { args: []; return: IpcResult<AgentPaperResult[]> };
  'agent:test': { args: []; return: IpcResult<string> };
  'agent:models': { args: []; return: IpcResult<AgentModelOption[]> };
  'agent:poolStatus': { args: []; return: IpcResult<RecommendationPoolStatus> };

  // ── Prompt ──
  'prompt:preview': {
    args: [input?: PromptPreviewInput];
    return: IpcResult<string>;
  };
  'prompt:fetchWithEdit': {
    args: [editedPrompt: string];
    return: IpcResult<AgentPaperResult[]>;
  };

  // ── 设置 ──
  'settings:getAll': { args: []; return: IpcResult<UserSettings> };
  'settings:get': { args: [key: string]; return: IpcResult<string | null> };
  'settings:set': {
    args: [key: keyof UserSettings, value: unknown];
    return: IpcResult<void>;
  };
  'settings:update': {
    args: [settings: Partial<UserSettings>];
    return: IpcResult<void>;
  };

  // ── 窗口 ──
  'window:openMain': { args: []; return: void };
  'window:hideWidget': { args: []; return: void };
  'window:minimize': { args: []; return: void };
  'shell:openExternal': {
    args: [url: string];
    return: IpcResult<void>;
  };
};

// ========== 类型提取辅助 ==========
export type ChannelArgs<T extends keyof IpcChannelMap> =
  IpcChannelMap[T]['args'];

export type ChannelReturn<T extends keyof IpcChannelMap> =
  IpcChannelMap[T]['return'];
