import { getDatabase } from '../index';
import type { ReviewSchedule, ReviewItem, Paper } from '../../../shared/types/models';

/**
 * Review Schedule Repository - 复习计划数据访问层
 */
export class ReviewScheduleRepository {
  private db = getDatabase();

  /**
   * 创建复习计划
   */
  create(paperId: string, reviewDate: string, intervalDay: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO review_schedule (paper_id, review_date, interval_day)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(paperId, reviewDate, intervalDay);
    return result.lastInsertRowid as number;
  }

  /**
   * 批量创建复习计划
   */
  batchCreate(schedules: Array<{ paperId: string; reviewDate: string; intervalDay: number }>): void {
    const insert = this.db.transaction((items: Array<{
      paperId: string;
      reviewDate: string;
      intervalDay: number;
    }>) => {
      for (const schedule of items) {
        this.create(schedule.paperId, schedule.reviewDate, schedule.intervalDay);
      }
    });

    insert(schedules);
  }

  /**
   * 查询今日待复习的论文
   */
  findTodayReviews(): ReviewItem[] {
    const today = new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare(`
      SELECT
        rs.id as schedule_id,
        rs.paper_id,
        rs.review_date,
        rs.interval_day,
        rs.is_done,
        p.id as paper_id_alt,
        p.research_direction_id,
        p.research_question_id,
        rd.name as research_direction_name,
        rq.name as research_question_name,
        p.title,
        p.url,
        p.date,
        p.summary,
        p.category,
        p.match_score,
        p.match_reason,
        p.is_intensive,
        p.is_finished,
        p.push_date,
        p.created_at,
        p.updated_at
      FROM review_schedule rs
      INNER JOIN papers p ON rs.paper_id = p.id
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE rs.review_date = ? AND rs.is_done = 0
      ORDER BY rs.interval_day ASC
    `);

    const rows = stmt.all(today) as any[];
    return rows.map((row) => ({
      scheduleId: row.schedule_id,
      paperId: row.paper_id,
      reviewDate: row.review_date,
      intervalDay: row.interval_day,
      isDone: row.is_done === 1,
      paper: {
        id: row.paper_id_alt,
        researchDirectionId: row.research_direction_id,
        researchQuestionId: row.research_question_id,
        researchDirection: row.research_direction_name,
        researchQuestion: row.research_question_name,
        title: row.title,
        url: row.url,
        date: row.date,
        summary: row.summary,
        category: row.category,
        matchScore: row.match_score,
        matchReason: row.match_reason,
        isIntensive: row.is_intensive === 1,
        isFinished: row.is_finished === 1,
        pushDate: row.push_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }));
  }

  /**
   * 标记复习完成
   */
  markDone(scheduleId: number): void {
    this.db
      .prepare('UPDATE review_schedule SET is_done = 1 WHERE id = ?')
      .run(scheduleId);
  }

  /**
   * 查询某篇论文的复习计划
   */
  findByPaperId(paperId: string): ReviewSchedule[] {
    const stmt = this.db.prepare(`
      SELECT * FROM review_schedule WHERE paper_id = ? ORDER BY review_date ASC
    `);
    return stmt.all(paperId).map(this.mapRow);
  }

  /**
   * 删除某篇论文的所有复习计划
   */
  deleteByPaperId(paperId: string): void {
    this.db.prepare('DELETE FROM review_schedule WHERE paper_id = ?').run(paperId);
  }

  /**
   * 数据库行映射为 ReviewSchedule 对象
   */
  private mapRow(row: any): ReviewSchedule {
    return {
      id: row.id,
      paperId: row.paper_id,
      reviewDate: row.review_date,
      isDone: row.is_done === 1,
      intervalDay: row.interval_day,
      createdAt: row.created_at,
    };
  }

  /**
   * 数据库行映射为 Paper 对象
   */
  private mapPaperRow(row: any): Paper {
    return {
      id: row.id,
      researchDirectionId: row.research_direction_id,
      researchQuestionId: row.research_question_id,
      researchDirection: row.research_direction_name || '',
      researchQuestion: row.research_question_name || '',
      title: row.title,
      url: row.url,
      date: row.date,
      summary: row.summary,
      category: row.category,
      matchScore: row.match_score,
      matchReason: row.match_reason,
      isIntensive: row.is_intensive === 1,
      isFinished: row.is_finished === 1,
      pushDate: row.push_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const reviewScheduleRepository = new ReviewScheduleRepository();
