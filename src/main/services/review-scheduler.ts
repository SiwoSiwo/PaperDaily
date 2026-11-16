import { reviewScheduleRepository } from '../db/repositories/review-schedule';
import { settingsRepository } from '../db/repositories/settings';
import { logger } from '../lib/logger';

/**
 * 复习调度器
 * 根据艾宾浩斯记忆曲线为论文生成复习计划
 */
export class ReviewScheduler {
  /**
   * 为一篇论文创建复习计划
   */
  createScheduleForPaper(paperId: string, pushDate: string): void {
    const settings = settingsRepository.getAll();
    const intervals = settings.reviewIntervals || [1, 2, 4, 7, 15, 30];

    const schedules = intervals.map((intervalDay) => {
      const reviewDate = this.addDays(pushDate, intervalDay);
      return {
        paperId,
        reviewDate,
        intervalDay,
      };
    });

    reviewScheduleRepository.batchCreate(schedules);
    logger.info(`[ReviewScheduler] Created ${schedules.length} review schedules for paper ${paperId}`);
  }

  /**
   * 批量创建复习计划
   */
  batchCreateSchedules(papers: Array<{ id: string; pushDate: string }>): void {
    for (const paper of papers) {
      this.createScheduleForPaper(paper.id, paper.pushDate);
    }
  }

  /**
   * 日期加天数
   */
  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

export const reviewScheduler = new ReviewScheduler();
