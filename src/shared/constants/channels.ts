// ========== IPC 通道名常量 ==========
// 避免字符串硬编码，统一管理

export const IPC_CHANNELS = {
  // Papers
  PAPERS_TODAY: 'papers:today',
  PAPERS_HISTORY: 'papers:history',
  PAPERS_DELETE: 'papers:delete',
  PAPERS_SET_INTENSIVE: 'papers:setIntensive',
  PAPERS_SET_FINISHED: 'papers:setFinished',
  PAPERS_SEARCH: 'papers:search',

  // Research
  RESEARCH_LIST: 'research:list',
  RESEARCH_CREATE_DIRECTION: 'research:createDirection',
  RESEARCH_UPDATE_DIRECTION: 'research:updateDirection',
  RESEARCH_DELETE_DIRECTION: 'research:deleteDirection',
  RESEARCH_REORDER_DIRECTIONS: 'research:reorderDirections',
  RESEARCH_CREATE_QUESTION: 'research:createQuestion',
  RESEARCH_UPDATE_QUESTION: 'research:updateQuestion',
  RESEARCH_DELETE_QUESTION: 'research:deleteQuestion',
  RESEARCH_REORDER_QUESTIONS: 'research:reorderQuestions',

  // Intensive
  INTENSIVE_LIST: 'intensive:list',
  INTENSIVE_RECOMMEND: 'intensive:recommend',

  // Review
  REVIEW_TODAY: 'review:today',
  REVIEW_MARK_DONE: 'review:markDone',

  // Agent
  AGENT_FETCH: 'agent:fetch',
  AGENT_TEST: 'agent:test',
  AGENT_MODELS: 'agent:models',

  // Prompt
  PROMPT_PREVIEW: 'prompt:preview',
  PROMPT_FETCH_WITH_EDIT: 'prompt:fetchWithEdit',

  // Settings
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_UPDATE: 'settings:update',

  // Window
  WINDOW_OPEN_MAIN: 'window:openMain',
  WINDOW_HIDE_WIDGET: 'window:hideWidget',
  WINDOW_MINIMIZE: 'window:minimize',
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
} as const;

export const IPC_EVENTS = {
  PAPERS_PUSH_ARRIVED: 'papers:pushArrived',
  AGENT_PROGRESS: 'agent:progress',
  AGENT_ERROR: 'agent:error',
  SETTINGS_CHANGED: 'settings:changed',
  RESEARCH_CHANGED: 'research:changed',
} as const;
