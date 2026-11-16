import type {
  AgentPaperResult,
  Paper,
  RecommendationPoolStatus,
  UserSettings,
} from '../../shared/types/models';
import { papersRepository } from '../db/repositories/papers';
import type {
  CategoryCounts,
  PaperCategory,
} from '../db/repositories/papers';
import { settingsRepository } from '../db/repositories/settings';
import { reviewScheduler } from './review-scheduler';
import type { PaperSelectionStrategy } from './paper-selection';
import { paperSelectionStrategy } from './paper-selection';
import { logger } from '../lib/logger';
import {
  researchRepository,
  type ActiveResearchContext,
} from '../db/repositories/research';
import type { PaperInput } from '../db/repositories/papers';

export class RecommendationPoolService {
  constructor(private readonly selectionStrategy: PaperSelectionStrategy) {}

  getStatus(
    settings: UserSettings = settingsRepository.getAll(),
    context: ActiveResearchContext = researchRepository.getActive()
  ): RecommendationPoolStatus {
    const today = this.today();
    const target = this.targetFromSettings(settings);
    const recommendedToday = papersRepository.countRecommendedByDate(
      today,
      context.question.id
    );
    const missingToday = this.subtract(target, recommendedToday);
    const available = papersRepository.countAvailableByCategory(context.question.id);
    const agentRequired = this.subtract(missingToday, available);

    return {
      target,
      recommendedToday,
      missingToday,
      available,
      agentRequired,
      hasEnoughCandidates: this.isEmpty(agentRequired),
    };
  }

  storeAgentResults(
    results: AgentPaperResult[],
    context: ActiveResearchContext = researchRepository.getActive()
  ): Paper[] {
    const storedAt = this.today();
    const papers: PaperInput[] = results.map(
      (item) => ({
        id: this.generatePaperId(context.question.id, item.url),
        researchDirectionId: context.direction.id,
        researchQuestionId: context.question.id,
        title: item.title,
        url: item.url,
        date: item.date,
        summary: item.summary,
        category: item.category,
        matchScore: item.matchScore,
        matchReason: item.matchReason,
        isIntensive: item.category === 'intensive',
        isFinished: false,
        // Legacy compatibility: actual push history lives in paper_recommendations.
        pushDate: storedAt,
      })
    );
    papersRepository.batchUpsert(papers);
    return papers.map((paper) => ({
      ...paper,
      researchDirection: context.direction.name,
      researchQuestion: context.question.name,
      createdAt: storedAt,
      updatedAt: storedAt,
    }));
  }

  fillToday(
    context: ActiveResearchContext = researchRepository.getActive()
  ): Paper[] {
    const status = this.getStatus(settingsRepository.getAll(), context);
    if (this.isEmpty(status.missingToday)) {
      return papersRepository.findToday(context.question.id);
    }

    const selected = this.selectionStrategy.select(
      papersRepository.findAvailable(context.question.id),
      status.missingToday
    );
    if (selected.length === 0) {
      return papersRepository.findToday(context.question.id);
    }

    const today = this.today();
    papersRepository.recordRecommendations(
      selected.map((paper) => paper.id),
      today
    );
    reviewScheduler.batchCreateSchedules(
      selected.map((paper) => ({ id: paper.id, pushDate: today }))
    );
    logger.info(
      `[RecommendationPool] Selected ${selected.length} papers for ${today}`
    );
    return papersRepository.findToday(context.question.id);
  }

  private targetFromSettings(settings: UserSettings): CategoryCounts {
    return {
      new: settings.newCount,
      old: settings.oldCount,
      intensive: settings.intensiveCount,
    };
  }

  private subtract(required: CategoryCounts, actual: CategoryCounts): CategoryCounts {
    const categories: PaperCategory[] = ['new', 'old', 'intensive'];
    return categories.reduce<CategoryCounts>(
      (result, category) => {
        result[category] = Math.max(0, required[category] - actual[category]);
        return result;
      },
      { new: 0, old: 0, intensive: 0 }
    );
  }

  private isEmpty(counts: CategoryCounts): boolean {
    return counts.new === 0 && counts.old === 0 && counts.intensive === 0;
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private generatePaperId(questionId: string, url: string): string {
    const suffix = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-50);
    return `${questionId.slice(0, 12)}_${suffix}`;
  }
}

export const recommendationPoolService = new RecommendationPoolService(
  paperSelectionStrategy
);
