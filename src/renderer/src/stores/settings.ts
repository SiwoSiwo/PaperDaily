import { create } from 'zustand';
import type { UserSettings } from '../../../shared/types/models';
import { defaultSettings } from '../../../shared/types/models';

interface SettingsState {
  settings: UserSettings;
  loading: boolean;
  error: string | null;

  // 操作
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.settingsGetAll();
      if (result.success) {
        set({ settings: result.data, loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.settingsUpdate(newSettings);
      if (result.success) {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          loading: false,
        }));
      } else {
        set({ error: result.error, loading: false });
        throw new Error(result.error);
      }
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },
}));
