import type { Paper } from '../../shared/types/models';
import type {
  CategoryCounts,
  PaperCategory,
} from '../db/repositories/papers';

/**
 * 每日推荐选文策略接口。候选池管理不依赖具体排序/抽样算法。
 */
export interface PaperSelectionStrategy {
  select(candidates: Paper[], required: CategoryCounts): Paper[];
}

/**
 * 默认策略：各分类内无放回随机抽样。
 */
export class RandomPaperSelectionStrategy implements PaperSelectionStrategy {
  select(candidates: Paper[], required: CategoryCounts): Paper[] {
    const categories: PaperCategory[] = ['new', 'old', 'intensive'];
    return categories.flatMap((category) => {
      const pool = this.shuffle(
        candidates.filter((paper) => paper.category === category)
      );
      return pool.slice(0, required[category]);
    });
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [
        shuffled[target],
        shuffled[index],
      ];
    }
    return shuffled;
  }
}

export const paperSelectionStrategy = new RandomPaperSelectionStrategy();
