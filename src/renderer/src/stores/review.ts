import { create } from 'zustand';
import type { ReviewItem } from '../../../shared/types/models';

interface ReviewState {
  reviewItems: ReviewItem[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchTodayReviews: () => Promise<void>;
  markDone: (scheduleId: number) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviewItems: [],
  loading: false,
  error: null,

  fetchTodayReviews: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.reviewToday();
      if (result.success) {
        set({ reviewItems: result.data, loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  markDone: async (scheduleId: number) => {
    const result = await window.electronAPI.reviewMarkDone(scheduleId);
    if (result.success) {
      // 从本地状态移除已完成的复习项
      set((state) => ({
        reviewItems: state.reviewItems.filter((item) => item.scheduleId !== scheduleId),
      }));
    } else {
      throw new Error(result.error);
    }
  },
}));
