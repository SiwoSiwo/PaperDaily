import { getDatabase } from '../index';
import type {
  ArticleLibraryItem,
  ArticleLibraryQuery,
  Paper,
  PaperCategoryCounts,
} from '../../../shared/types/models';

export type PaperCategory = Paper['category'];
export type CategoryCounts = PaperCategoryCounts;
export type PaperInput = Omit<
  Paper,
  'createdAt' | 'updatedAt' | 'researchDirection' | 'researchQuestion'
>;

const emptyCategoryCounts = (): CategoryCounts => ({
  new: 0,
  old: 0,
  intensive: 0,
});

/**
 * Papers Repository - 论文数据访问层
 */
export class PapersRepository {
  private db = getDatabase();

  /**
   * 创建或更新论文
   */
  upsert(paper: PaperInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO papers (
        id, research_direction_id, research_question_id,
        title, url, date, summary, category,
        match_score, match_reason, is_intensive, is_finished, push_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        research_direction_id = excluded.research_direction_id,
        research_question_id = excluded.research_question_id,
        title = excluded.title,
        url = excluded.url,
        date = excluded.date,
        summary = excluded.summary,
        category = excluded.category,
        match_score = excluded.match_score,
        match_reason = excluded.match_reason,
        is_intensive = MAX(papers.is_intensive, excluded.is_intensive),
        updated_at = datetime('now')
    `);

    stmt.run(
      paper.id,
      paper.researchDirectionId,
      paper.researchQuestionId,
      paper.title,
      paper.url,
      paper.date,
      paper.summary,
      paper.category,
      paper.matchScore,
      paper.matchReason,
      paper.isIntensive ? 1 : 0,
      paper.isFinished ? 1 : 0,
      paper.pushDate
    );
  }

  /**
   * 批量插入论文
   */
  batchUpsert(papers: PaperInput[]): void {
    const insert = this.db.transaction((items: PaperInput[]) => {
      for (const paper of items) {
        this.upsert(paper);
      }
    });

    insert(papers);
  }

  /**
   * 根据推送日期查询论文
   */
  findByPushDate(date: string, researchQuestionId: string): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.*, pr.recommendation_date AS effective_push_date,
             rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM paper_recommendations pr
      INNER JOIN papers p ON p.id = pr.paper_id
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE pr.recommendation_date = ? AND p.research_question_id = ?
      ORDER BY p.match_score DESC
    `);
    return stmt.all(date, researchQuestionId).map(this.mapRow);
  }

  /**
   * 查询今日推送（四分类）
   */
  findToday(researchQuestionId: string): Paper[] {
    const today = new Date().toISOString().split('T')[0];
    return this.findByPushDate(today, researchQuestionId);
  }

  /**
   * 查询尚未出现在任何每日推送中的候选文章。
   */
  findAvailable(researchQuestionId: string): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.*, rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM papers p
      LEFT JOIN paper_recommendations pr ON pr.paper_id = p.id
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE pr.paper_id IS NULL AND p.is_finished = 0
        AND p.research_question_id = ?
      ORDER BY p.created_at ASC
    `);
    return stmt.all(researchQuestionId).map(this.mapRow);
  }

  countAvailableByCategory(researchQuestionId: string): CategoryCounts {
    const counts = emptyCategoryCounts();
    const rows = this.db.prepare(`
      SELECT p.category, COUNT(*) AS count
      FROM papers p
      LEFT JOIN paper_recommendations pr ON pr.paper_id = p.id
      WHERE pr.paper_id IS NULL AND p.is_finished = 0
        AND p.research_question_id = ?
      GROUP BY p.category
    `).all(researchQuestionId) as Array<{ category: PaperCategory; count: number }>;

    for (const row of rows) {
      counts[row.category] = row.count;
    }
    return counts;
  }

  countRecommendedByDate(date: string, researchQuestionId: string): CategoryCounts {
    const counts = emptyCategoryCounts();
    const rows = this.db.prepare(`
      SELECT p.category, COUNT(*) AS count
      FROM paper_recommendations pr
      INNER JOIN papers p ON p.id = pr.paper_id
      WHERE pr.recommendation_date = ? AND p.research_question_id = ?
      GROUP BY p.category
    `).all(date, researchQuestionId) as Array<{ category: PaperCategory; count: number }>;

    for (const row of rows) {
      counts[row.category] = row.count;
    }
    return counts;
  }

  /**
   * 原子记录一次每日推荐。UNIQUE(paper_id) 保证同一文章不会重复推送。
   */
  recordRecommendations(paperIds: string[], date: string): void {
    const insert = this.db.transaction((ids: string[]) => {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO paper_recommendations (
          paper_id, recommendation_date
        ) VALUES (?, ?)
      `);
      for (const paperId of ids) {
        stmt.run(paperId, date);
      }
    });

    insert(paperIds);
  }

  /**
   * 查询精读库
   */
  findIntensive(): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.*, rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM papers p
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE p.is_intensive = 1
      ORDER BY p.is_finished ASC, p.match_score DESC
    `);
    return stmt.all().map(this.mapRow);
  }

  /**
   * 精读推荐：未读完的精读文章，按匹配度排序
   */
  findIntensiveRecommend(limit: number): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.*, rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM papers p
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE p.is_intensive = 1 AND p.is_finished = 0
      ORDER BY p.match_score DESC
      LIMIT ?
    `);
    return stmt.all(limit).map(this.mapRow);
  }

  /**
   * 根据 ID 查找论文
   */
  findById(id: string): Paper | undefined {
    const stmt = this.db.prepare(`
      SELECT p.*, rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM papers p
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE p.id = ?
    `);
    const row = stmt.get(id);
    return row ? this.mapRow(row) : undefined;
  }

  /**
   * 搜索论文（标题/摘要）
   */
  search(query: string): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.*, MIN(pr.recommendation_date) AS effective_push_date,
             rd.name AS research_direction_name,
             rq.name AS research_question_name
      FROM papers p
      LEFT JOIN paper_recommendations pr ON pr.paper_id = p.id
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      WHERE p.title LIKE ? OR p.summary LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);
    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern).map(this.mapRow);
  }

  /**
   * 查询文章库。文章库包含 papers 表中的全部 Agent 结果，包括尚未推送的候选文章。
   */
  findLibrary(query: ArticleLibraryQuery): ArticleLibraryItem[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    const today = new Date().toISOString().split('T')[0];
    const dueReviewSql = `EXISTS (
      SELECT 1
      FROM review_schedule rs
      WHERE rs.paper_id = p.id
        AND rs.is_done = 0
        AND rs.review_date <= ?
    )`;

    if (query.title.trim()) {
      conditions.push('p.title LIKE ?');
      params.push(`%${query.title.trim()}%`);
    }

    if (query.researchDirectionId !== 'all') {
      conditions.push('p.research_direction_id = ?');
      params.push(query.researchDirectionId);
    }
    if (query.researchQuestionId !== 'all') {
      conditions.push('p.research_question_id = ?');
      params.push(query.researchQuestionId);
    }

    const addBooleanFilter = (column: string, value: ArticleLibraryQuery['read']): void => {
      if (value !== 'all') {
        conditions.push(`${column} = ?`);
        params.push(value === 'yes' ? 1 : 0);
      }
    };

    addBooleanFilter('p.is_intensive', query.intensive);
    addBooleanFilter('p.is_finished', query.read);

    if (query.review !== 'all') {
      conditions.push(`${query.review === 'no' ? 'NOT ' : ''}${dueReviewSql}`);
      params.push(today);
    }

    const sortColumn = query.sortBy === 'matchScore'
      ? 'COALESCE(p.match_score, -1)'
      : 'p.date';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const rows = this.db.prepare(`
      SELECT
        p.*,
        MIN(pr.recommendation_date) AS effective_push_date,
        rd.name AS research_direction_name,
        rq.name AS research_question_name,
        ${dueReviewSql} AS needs_review
      FROM papers p
      LEFT JOIN paper_recommendations pr ON pr.paper_id = p.id
      INNER JOIN research_directions rd ON rd.id = p.research_direction_id
      INNER JOIN research_questions rq ON rq.id = p.research_question_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${sortColumn} ${sortOrder}, p.created_at DESC
    `).all(today, ...params);

    return rows.map((row: any) => ({
      ...this.mapRow(row),
      needsReview: row.needs_review === 1,
    }));
  }

  /**
   * 删除论文
   */
  delete(id: string): void {
    this.db.prepare('DELETE FROM papers WHERE id = ?').run(id);
  }

  /**
   * 标记为精读/取消精读
   */
  setIntensive(id: string, value: boolean): void {
    this.db
      .prepare("UPDATE papers SET is_intensive = ?, updated_at = datetime('now') WHERE id = ?")
      .run(value ? 1 : 0, id);
  }

  /**
   * 标记为已读完/取消已读完
   */
  setFinished(id: string, value: boolean): void {
    this.db
      .prepare("UPDATE papers SET is_finished = ?, updated_at = datetime('now') WHERE id = ?")
      .run(value ? 1 : 0, id);
  }

  /**
   * 检查论文是否已存在
   */
  exists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM papers WHERE id = ? LIMIT 1');
    return !!stmt.get(id);
  }

  /**
   * 获取所有论文 ID（用于去重）
   */
  getAllIds(researchQuestionId: string): string[] {
    const stmt = this.db.prepare(
      'SELECT id FROM papers WHERE research_question_id = ?'
    );
    return stmt.all(researchQuestionId).map((row: any) => row.id);
  }

  /**
   * 数据库行映射为 Paper 对象
   */
  private mapRow(row: any): Paper {
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
      pushDate: row.effective_push_date || row.push_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const papersRepository = new PapersRepository();
