import { randomUUID } from 'crypto';
import type {
  ResearchDirection,
  ResearchQuestion,
  ResearchQuestionUpdate,
} from '../../../shared/types/models';
import { getDatabase } from '../index';

type DirectionRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  direction_id: string;
  name: string;
  domains_json: string;
  extra_requirements: string;
  prompt_override: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export interface ActiveResearchContext {
  direction: ResearchDirection;
  question: ResearchQuestion;
}

export class ResearchRepository {
  private db = getDatabase();

  list(): ResearchDirection[] {
    const directions = this.db.prepare(`
      SELECT * FROM research_directions
      ORDER BY sort_order ASC, created_at ASC
    `).all() as DirectionRow[];
    const questions = this.db.prepare(`
      SELECT * FROM research_questions
      ORDER BY direction_id ASC, sort_order ASC, created_at ASC
    `).all() as QuestionRow[];
    const questionsByDirection = new Map<string, ResearchQuestion[]>();

    for (const row of questions) {
      const items = questionsByDirection.get(row.direction_id) || [];
      items.push(this.mapQuestion(row));
      questionsByDirection.set(row.direction_id, items);
    }

    return directions.map((row) => this.mapDirection(
      row,
      questionsByDirection.get(row.id) || []
    ));
  }

  getActive(): ActiveResearchContext {
    const direction = this.list().find((item) => item.questions.length > 0);
    if (!direction) {
      throw new Error('请先在“研究方向”页面创建至少一个研究问题');
    }
    return { direction, question: direction.questions[0] };
  }

  getQuestion(id: string): ActiveResearchContext | undefined {
    for (const direction of this.list()) {
      const question = direction.questions.find((item) => item.id === id);
      if (question) return { direction, question };
    }
    return undefined;
  }

  createDirection(): ResearchDirection {
    const create = this.db.transaction(() => {
      const id = randomUUID();
      const questionId = randomUUID();
      this.db.prepare(`
        UPDATE research_directions SET sort_order = sort_order + 1
      `).run();
      this.db.prepare(`
        INSERT INTO research_directions (id, name, sort_order)
        VALUES (?, '新建研究方向', ?)
      `).run(id, 0);
      this.db.prepare(`
        INSERT INTO research_questions (
          id, direction_id, name, domains_json, extra_requirements, sort_order
        ) VALUES (?, ?, '新建研究问题', '[]', '', 0)
      `).run(questionId, id);
      return id;
    });
    const id = create();
    return this.list().find((item) => item.id === id)!;
  }

  updateDirection(id: string, name: string): void {
    const result = this.db.prepare(`
      UPDATE research_directions
      SET name = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name.trim(), id);
    if (result.changes === 0) throw new Error('研究方向不存在');
  }

  deleteDirection(id: string): void {
    const result = this.db.prepare(
      'DELETE FROM research_directions WHERE id = ?'
    ).run(id);
    if (result.changes === 0) throw new Error('研究方向不存在');
  }

  reorderDirections(ids: string[]): void {
    this.reorder('research_directions', undefined, ids);
  }

  createQuestion(directionId: string): ResearchQuestion {
    const directionExists = this.db.prepare(
      'SELECT 1 FROM research_directions WHERE id = ?'
    ).get(directionId);
    if (!directionExists) throw new Error('研究方向不存在');

    const id = randomUUID();
    const sortOrder = this.nextSortOrder('research_questions', directionId);
    this.db.prepare(`
      INSERT INTO research_questions (
        id, direction_id, name, domains_json, extra_requirements, sort_order
      ) VALUES (?, ?, '新建研究问题', '[]', '', ?)
    `).run(id, directionId, sortOrder);
    return this.getQuestion(id)!.question;
  }

  updateQuestion(id: string, update: ResearchQuestionUpdate): void {
    const result = this.db.prepare(`
      UPDATE research_questions
      SET name = ?, domains_json = ?, extra_requirements = ?,
          prompt_override = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      update.name.trim(),
      JSON.stringify(update.domains),
      update.extraRequirements.trim(),
      update.promptOverride?.trim() || null,
      id
    );
    if (result.changes === 0) throw new Error('研究问题不存在');
  }

  deleteQuestion(id: string): void {
    const result = this.db.prepare(
      'DELETE FROM research_questions WHERE id = ?'
    ).run(id);
    if (result.changes === 0) throw new Error('研究问题不存在');
  }

  reorderQuestions(directionId: string, ids: string[]): void {
    this.reorder('research_questions', directionId, ids);
  }

  private reorder(
    table: 'research_directions' | 'research_questions',
    directionId: string | undefined,
    ids: string[]
  ): void {
    const rows = directionId
      ? this.db.prepare(
        'SELECT id FROM research_questions WHERE direction_id = ?'
      ).all(directionId) as Array<{ id: string }>
      : this.db.prepare('SELECT id FROM research_directions').all() as Array<{ id: string }>;
    const existing = new Set(rows.map((row) => row.id));
    if (
      ids.length !== existing.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !existing.has(id))
    ) {
      throw new Error('排序数据与当前列表不一致，请刷新后重试');
    }

    const update = this.db.transaction((orderedIds: string[]) => {
      const stmt = this.db.prepare(
        `UPDATE ${table} SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`
      );
      orderedIds.forEach((id, index) => stmt.run(index, id));
    });
    update(ids);
  }

  private nextSortOrder(
    table: 'research_directions' | 'research_questions',
    directionId?: string
  ): number {
    const row = directionId
      ? this.db.prepare(`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
        FROM research_questions WHERE direction_id = ?
      `).get(directionId) as { next_order: number }
      : this.db.prepare(`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
        FROM ${table}
      `).get() as { next_order: number };
    return row.next_order;
  }

  private mapDirection(
    row: DirectionRow,
    questions: ResearchQuestion[]
  ): ResearchDirection {
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      questions,
    };
  }

  private mapQuestion(row: QuestionRow): ResearchQuestion {
    let domains: string[] = [];
    try {
      const parsed = JSON.parse(row.domains_json);
      if (Array.isArray(parsed)) domains = parsed.map(String);
    } catch {
      domains = [];
    }
    return {
      id: row.id,
      directionId: row.direction_id,
      name: row.name,
      domains,
      extraRequirements: row.extra_requirements,
      promptOverride: row.prompt_override,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const researchRepository = new ResearchRepository();
