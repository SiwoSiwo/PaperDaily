import { create } from 'zustand';
import type {
  AgentPaperResult,
  AgentStage,
  RecommendationPoolStatus,
} from '../../../shared/types/models';

interface AgentState {
  // 抓取状态
  isFetching: boolean;
  currentStage: AgentStage | null;
  fetchError: string | null;
  poolStatus: RecommendationPoolStatus | null;
  loadingPoolStatus: boolean;

  // Prompt 预览
  promptPreview: string | null;
  loadingPrompt: boolean;

  // 操作
  fetchPapers: () => Promise<AgentPaperResult[]>;
  testAgent: () => Promise<string>;
  loadPoolStatus: () => Promise<void>;
  loadPromptPreview: () => Promise<void>;
  fetchWithEditedPrompt: (prompt: string) => Promise<AgentPaperResult[]>;
}

export const useAgentStore = create<AgentState>((set) => ({
  isFetching: false,
  currentStage: null,
  fetchError: null,
  poolStatus: null,
  loadingPoolStatus: false,
  promptPreview: null,
  loadingPrompt: false,

  fetchPapers: async () => {
    set({ isFetching: true, fetchError: null, currentStage: 'building-prompt' });
    try {
      const result = await window.electronAPI.agentFetch();
      if (result.success) {
        set({ isFetching: false, currentStage: 'done' });
        void useAgentStore.getState().loadPoolStatus();
        return result.data;
      } else {
        set({ isFetching: false, fetchError: result.error, currentStage: null });
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isFetching: false, fetchError: message, currentStage: null });
      throw error;
    }
  },

  testAgent: async () => {
    const result = await window.electronAPI.agentTest();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },

  loadPoolStatus: async () => {
    set({ loadingPoolStatus: true });
    try {
      const result = await window.electronAPI.agentPoolStatus();
      if (result.success) {
        set({ poolStatus: result.data, loadingPoolStatus: false });
      } else {
        set({ loadingPoolStatus: false });
        throw new Error(result.error);
      }
    } catch (error) {
      set({ loadingPoolStatus: false });
      throw error;
    }
  },

  loadPromptPreview: async () => {
    set({ loadingPrompt: true });
    try {
      const result = await window.electronAPI.promptPreview();
      if (result.success) {
        set({ promptPreview: result.data, loadingPrompt: false });
      } else {
        set({ loadingPrompt: false });
        throw new Error(result.error);
      }
    } catch (error) {
      set({ loadingPrompt: false });
      throw error;
    }
  },

  fetchWithEditedPrompt: async (prompt: string) => {
    set({ isFetching: true, fetchError: null, currentStage: 'calling-agent' });
    try {
      const result = await window.electronAPI.promptFetchWithEdit(prompt);
      if (result.success) {
        set({ isFetching: false, currentStage: 'done' });
        void useAgentStore.getState().loadPoolStatus();
        return result.data;
      } else {
        set({ isFetching: false, fetchError: result.error, currentStage: null });
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isFetching: false, fetchError: message, currentStage: null });
      throw error;
    }
  },
}));
