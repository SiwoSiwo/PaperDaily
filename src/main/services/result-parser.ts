import type { AgentPaperResult } from '../../shared/types/models';
import { logger } from '../lib/logger';

/**
 * Agent 返回结果解析器
 * 从 Agent 返回的文本中提取结构化论文数据
 */
export class ResultParser {
  /**
   * 解析 Agent 返回的文本为 AgentPaperResult 数组
   */
  parse(text: string): AgentPaperResult[] {
    const candidates = this.extractCandidates(text);
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        return this.validateResults(candidate);
      } catch (error) {
        lastError = error;
      }
    }

    logger.error('[ResultParser] Failed to parse agent output', {
      length: text.length,
      candidateCount: candidates.length,
    });
    if (lastError instanceof Error) {
      logger.error('[ResultParser] Parse error:', lastError.message);
    }
    throw new Error('无法解析 Agent 返回结果，请检查格式');
  }

  /**
   * Pi 可能在最终 JSON 前输出思考、工具事件或 Markdown。提取所有完整
   * 的 JSON 容器，随后由 validateResults 选出真正的论文结果。
   */
  private extractCandidates(text: string): unknown[][] {
    const candidates: unknown[][] = [];
    const seen = new Set<string>();
    const visited = new WeakSet<object>();

    const addResults = (results: unknown[]) => {
      const fingerprint = JSON.stringify(results);
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        candidates.push(results);
      }
    };

    let visitText: (source: string, depth: number) => void;

    const visitValue = (value: unknown, depth: number) => {
      if (depth > 8 || value === null || value === undefined) return;

      if (typeof value === 'string') {
        visitText(value, depth + 1);
        return;
      }

      if (typeof value !== 'object') return;
      if (visited.has(value)) return;
      visited.add(value);

      if (Array.isArray(value)) {
        addResults(value);
        value.forEach((item) => visitValue(item, depth + 1));
        return;
      }

      const object = value as Record<string, unknown>;
      if (this.looksLikePaper(object)) addResults([object]);
      Object.values(object).forEach((item) => visitValue(item, depth + 1));
    };

    visitText = (source: string, depth: number) => {
      if (depth > 8) return;
      const normalized = source.replace(/^\uFEFF/, '').trim();
      if (!normalized) return;

      const direct = this.tryParseJson(normalized);
      if (direct.ok) visitValue(direct.value, depth + 1);

      // Pi 的 JSON 输出模式和部分扩展会产生逐行 JSON 事件。
      for (const line of normalized.split(/\r?\n/)) {
        const parsedLine = this.tryParseJson(line.trim());
        if (parsedLine.ok) visitValue(parsedLine.value, depth + 1);
      }

      // 扫描平衡的 [] / {}，兼容 Markdown 代码块及说明文字前后缀。
      for (let start = 0; start < normalized.length; start += 1) {
        if (normalized[start] !== '[' && normalized[start] !== '{') continue;
        const end = this.findJsonEnd(normalized, start);
        if (end < 0) continue;
        const embedded = this.tryParseJson(normalized.slice(start, end + 1));
        if (embedded.ok) {
          visitValue(embedded.value, depth + 1);
          start = end;
        }
      }
    };

    visitText(text, 0);

    return candidates;
  }

  private tryParseJson(
    text: string
  ): { ok: true; value: unknown } | { ok: false } {
    if (!text) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch {
      // LLM 偶尔会在数组或对象最后一项后留下逗号。
      const withoutTrailingCommas = this.removeTrailingCommas(text);
      if (withoutTrailingCommas === text) return { ok: false };
      try {
        return { ok: true, value: JSON.parse(withoutTrailingCommas) };
      } catch {
        return { ok: false };
      }
    }
  }

  private removeTrailingCommas(text: string): string {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        result += char;
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (char === ',') {
        let next = index + 1;
        while (/\s/.test(text[next] || '')) next += 1;
        if (text[next] === ']' || text[next] === '}') continue;
      }
      result += char;
    }

    return result;
  }

  private looksLikePaper(value: Record<string, unknown>): boolean {
    return (
      ('title' in value || 'name' in value) &&
      ('url' in value || 'link' in value || 'paperUrl' in value)
    );
  }

  private findJsonEnd(text: string, start: number): number {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '[' || char === '{') {
        stack.push(char);
      } else if (char === ']' || char === '}') {
        const expected = char === ']' ? '[' : '{';
        if (stack.pop() !== expected) return -1;
        if (stack.length === 0) return index;
      }
    }

    return -1;
  }

  /**
   * 验证并标准化结果
   */
  private validateResults(results: any[]): AgentPaperResult[] {
    if (!Array.isArray(results)) {
      throw new Error('Agent 返回结果必须是数组');
    }
    if (results.length === 0) {
      throw new Error('Agent 返回结果为空');
    }

    return results.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`第 ${index + 1} 条结果不是对象`);
      }

      const title = this.readString(item, ['title', 'name']);
      const url = this.readString(item, ['url', 'link', 'paperUrl']);
      const date = this.readString(item, [
        'date',
        'publishedDate',
        'publicationDate',
        'published_date',
      ]);
      const summary = this.readString(item, [
        'summary',
        'abstract',
        'description',
      ]);

      if (!title) {
        throw new Error(`第 ${index + 1} 条结果缺少 title 字段`);
      }
      if (!url) {
        throw new Error(`第 ${index + 1} 条结果缺少 url 字段`);
      }
      if (!date) {
        throw new Error(`第 ${index + 1} 条结果缺少 date 字段`);
      }
      if (!summary) {
        throw new Error(`第 ${index + 1} 条结果缺少 summary 字段`);
      }

      // 分类验证
      const category = this.normalizeCategory(
        this.readString(item, ['category', 'type']) || 'new'
      );
      if (!category) {
        throw new Error(
          `第 ${index + 1} 条结果的 category 必须是 new/old/intensive`
        );
      }

      // 匹配度验证
      const matchScore = this.normalizeScore(
        item.matchScore ?? item.match_score ?? item.score ?? item.relevance
      );

      const matchReason =
        this.readString(item, [
          'matchReason',
          'match_reason',
          'reason',
        ]) || '未提供匹配原因';

      return {
        category,
        title,
        date,
        url,
        summary,
        matchScore,
        matchReason,
      };
    });
  }

  private readString(
    item: Record<string, unknown>,
    keys: string[]
  ): string | null {
    for (const key of keys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private normalizeCategory(
    value: string
  ): 'new' | 'old' | 'intensive' | null {
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const categories: Record<string, 'new' | 'old' | 'intensive'> = {
      new: 'new',
      new_article: 'new',
      new_paper: 'new',
      新: 'new',
      新文章: 'new',
      old: 'old',
      old_article: 'old',
      old_paper: 'old',
      旧: 'old',
      旧文章: 'old',
      intensive: 'intensive',
      intensive_reading: 'intensive',
      deep_read: 'intensive',
      精读: 'intensive',
      精读推荐: 'intensive',
    };
    return categories[normalized] || null;
  }

  private normalizeScore(value: unknown): number {
    let score = typeof value === 'number' ? value : Number.NaN;
    if (typeof value === 'string') {
      const normalized = value.trim();
      score = Number.parseFloat(normalized.replace('%', ''));
      if (normalized.endsWith('%')) score /= 100;
    }
    if (!Number.isFinite(score)) return 0.5;
    if (score > 1 && score <= 100) score /= 100;
    return Math.max(0, Math.min(1, score));
  }
}

export const resultParser = new ResultParser();
