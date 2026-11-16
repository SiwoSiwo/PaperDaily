import { settingsRepository } from '../db/repositories/settings';
import { papersRepository } from '../db/repositories/papers';
import { logger } from '../lib/logger';
import type { Paper } from '../../shared/types/models';

/**
 * 精读推荐器
 * 从精读库中筛选并推荐文章
 */
export class IntensiveRecommender {
  /**
   * 获取精读推荐
   * 算法：从精读库中筛选出「未读完」的文章，按匹配度降序排列，取 Top-K
   */
  recommend(): Paper[] {
    const settings = settingsRepository.getAll();
    const count = settings.intensiveCount || 2;

    const recommendations = papersRepository.findIntensiveRecommend(count);
    
    logger.info(`[IntensiveRecommender] Recommended ${recommendations.length} papers`);
    return recommendations;
  }
}

export const intensiveRecommender = new IntensiveRecommender();
