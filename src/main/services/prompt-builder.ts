import { settingsRepository } from '../db/repositories/settings';
import { papersRepository } from '../db/repositories/papers';
import { researchRepository } from '../db/repositories/research';
import type {
  PromptPreviewInput,
  ResearchQuestion,
  UserSettings,
} from '../../shared/types/models';
import type { CategoryCounts } from '../db/repositories/papers';

/**
 * Prompt 构建器
 * 根据用户配置和历史记录构建发送给 Agent 的 prompt
 */
export class PromptBuilder {
  /**
   * 构建完整的 prompt
   */
  build(requiredCounts?: CategoryCounts, questionId?: string): string {
    const settings = settingsRepository.getAll();
    const context = questionId
      ? researchRepository.getQuestion(questionId)
      : researchRepository.getActive();
    if (!context) throw new Error('研究问题不存在');
    if (context.question.promptOverride?.trim()) {
      return context.question.promptOverride.trim();
    }
    const historyIds = papersRepository.getAllIds(context.question.id);
    const today = new Date().toISOString().split('T')[0];

    return this.buildPrompt(
      settings,
      context.direction.name,
      context.question,
      historyIds,
      today,
      requiredCounts
    );
  }

  preview(input: PromptPreviewInput): string {
    if (input.promptOverride?.trim()) return input.promptOverride.trim();
    const settings = settingsRepository.getAll();
    const historyIds = input.questionId
      ? papersRepository.getAllIds(input.questionId)
      : [];
    const question: ResearchQuestion = {
      id: input.questionId || '',
      directionId: '',
      name: input.name,
      domains: input.domains,
      extraRequirements: input.extraRequirements,
      promptOverride: null,
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    };
    return this.buildPrompt(
      settings,
      input.directionName,
      question,
      historyIds,
      new Date().toISOString().split('T')[0]
    );
  }

  /**
   * 构建 prompt 模板
   */
  private buildPrompt(
    settings: UserSettings,
    directionName: string,
    question: ResearchQuestion,
    historyIds: string[],
    today: string,
    requiredCounts?: CategoryCounts
  ): string {
    const { dateThreshold } = settings;
    const counts = requiredCounts || {
      new: settings.newCount,
      old: settings.oldCount,
      intensive: settings.intensiveCount,
    };
    const requirements = [
      counts.new > 0
        ? `- **新文章**: 至少 ${counts.new} 篇（发表日期 >= ${dateThreshold}）`
        : '',
      counts.old > 0
        ? `- **旧文章**: 至少 ${counts.old} 篇（发表日期 < ${dateThreshold}）`
        : '',
      counts.intensive > 0
        ? `- **精读推荐**: 至少 ${counts.intensive} 篇（特别值得深入阅读的文章）`
        : '',
    ].filter(Boolean).join('\n');

    return `
你是一个学术论文推荐助手。请根据以下信息为用户推荐相关的学术论文。

## 用户研究背景
- **研究方向**: ${directionName}
- **关注的问题**: ${question.name}
- **领域**: ${question.domains.join(', ')}
- **额外需求**: ${question.extraRequirements || '无'}

## 推荐要求
${requirements}

## 当前日期
${today}

## 用户历史记录（请避免推荐这些论文）
已阅读论文 ID 列表：
${historyIds.length > 0 ? historyIds.slice(0, 100).join(', ') : '无历史记录'}

## 返回格式要求
请以 JSON 数组格式返回推荐结果，每篇论文包含以下字段：

\`\`\`json
[
  {
    "category": "new|old|intensive",
    "title": "论文标题",
    "date": "YYYY-MM-DD",
    "url": "论文链接",
    "summary": "论文内容简述（100字左右）",
    "matchScore": 0.95,
    "matchReason": "匹配原因说明"
  }
]
\`\`\`

**注意**:
- category 必须是 "new", "old", "intensive" 之一
- matchScore 为 0~1 之间的数字，表示与用户研究方向的匹配度
- matchReason 简述为什么推荐这篇文章
- 所有字段必须存在且符合格式要求
- 每个 URL 只能出现一次，三个 category 是互斥分组，不要重复返回同一论文
- 可以返回多于最低数量的高质量结果；多出的结果会进入候选文章库供后续日期复用

请开始推荐：
`.trim();
  }
}

export const promptBuilder = new PromptBuilder();
