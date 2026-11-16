import { create } from 'zustand';
import type { Paper } from '../../../shared/types/models';

interface PapersState {
  // 今日推送
  todayPapers: Paper[];
  loadingToday: boolean;
  errorToday: string | null;

  // 操作
  fetchToday: () => Promise<void>;
  deletePaper: (id: string) => Promise<void>;
  setIntensive: (id: string, value: boolean) => Promise<void>;
  setFinished: (id: string, value: boolean) => Promise<void>;
  searchPapers: (query: string) => Promise<Paper[]>;
}

export const usePapersStore = create<PapersState>((set) => ({
  todayPapers: [],
  loadingToday: false,
  errorToday: null,

  fetchToday: async () => {
    set({ loadingToday: true, errorToday: null });
    try {
      const result = await window.electronAPI.papersToday();
      if (result.success) {
        set({ todayPapers: result.data, loadingToday: false });
      } else {
        set({ errorToday: result.error, loadingToday: false });
      }
    } catch (error) {
      set({ errorToday: String(error), loadingToday: false });
    }
  },

  deletePaper: async (id: string) => {
    const result = await window.electronAPI.papersDelete(id);
    if (result.success) {
      // 从本地状态移除
      set((state) => ({
        todayPapers: state.todayPapers.filter((p) => p.id !== id),
      }));
    } else {
      throw new Error(result.error);
    }
  },

  setIntensive: async (id: string, value: boolean) => {
    const result = await window.electronAPI.papersSetIntensive(id, value);
    if (result.success) {
      // 更新本地状态
      set((state) => ({
        todayPapers: state.todayPapers.map((p) =>
          p.id === id ? { ...p, isIntensive: value } : p
        ),
      }));
    } else {
      throw new Error(result.error);
    }
  },

  setFinished: async (id: string, value: boolean) => {
    const result = await window.electronAPI.papersSetFinished(id, value);
    if (result.success) {
      // 更新本地状态
      set((state) => ({
        todayPapers: state.todayPapers.map((p) =>
          p.id === id ? { ...p, isFinished: value } : p
        ),
      }));
    } else {
      throw new Error(result.error);
    }
  },

  searchPapers: async (query: string) => {
    const result = await window.electronAPI.papersSearch(query);
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },
}));
