// ========== 论文模型 ==========
export interface Paper {
  id: string;
  researchDirectionId: string;
  researchQuestionId: string;
  researchDirection: string;
  researchQuestion: string;
  title: string;
  url: string;
  date: string; // YYYY-MM-DD
  summary: string | null;
  category: 'new' | 'old' | 'intensive';
  matchScore: number | null; // 0~1
  matchReason: string | null;
  isIntensive: boolean; // 是否在精读库中
  isFinished: boolean; // 是否已读完
  pushDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type ArticleLibraryBooleanFilter = 'all' | 'yes' | 'no';

export interface ArticleLibraryQuery {
  title: string;
  researchDirectionId: string;
  researchQuestionId: string;
  intensive: ArticleLibraryBooleanFilter;
  read: ArticleLibraryBooleanFilter;
  review: ArticleLibraryBooleanFilter;
  sortBy: 'date' | 'matchScore';
  sortOrder: 'asc' | 'desc';
}

export interface ArticleLibraryItem extends Paper {
  needsReview: boolean;
}

// Agent 返回的论文结果
export interface AgentPaperResult {
  category: 'new' | 'old' | 'intensive';
  title: string;
  date: string; // YYYY-MM-DD
  url: string;
  summary: string;
  matchScore: number; // 0~1
  matchReason: string;
}

export interface AgentModelOption {
  provider: string;
  model: string;
}

export interface PaperCategoryCounts {
  new: number;
  old: number;
  intensive: number;
}

export interface RecommendationPoolStatus {
  target: PaperCategoryCounts;
  recommendedToday: PaperCategoryCounts;
  missingToday: PaperCategoryCounts;
  available: PaperCategoryCounts;
  agentRequired: PaperCategoryCounts;
  hasEnoughCandidates: boolean;
}

// ========== 研究方向 ==========
export interface ResearchQuestion {
  id: string;
  directionId: string;
  name: string;
  domains: string[];
  extraRequirements: string;
  promptOverride: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchDirection {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  questions: ResearchQuestion[];
}

export interface ResearchQuestionUpdate {
  name: string;
  domains: string[];
  extraRequirements: string;
  promptOverride: string | null;
}

export interface PromptPreviewInput extends ResearchQuestionUpdate {
  questionId?: string;
  directionName: string;
}

// ========== 复习计划 ==========
export interface ReviewSchedule {
  id: number;
  paperId: string;
  reviewDate: string; // YYYY-MM-DD
  isDone: boolean;
  intervalDay: number; // 1, 2, 4, 7, 15, 30
  createdAt: string;
}

export interface ReviewItem {
  scheduleId: number; // review_schedule 表的主键
  paperId: string;
  paper: Paper;
  reviewDate: string;
  intervalDay: number;
  isDone: boolean;
}

// ========== 用户设置 ==========
export interface UserSettings {
  newCount: number; // 每日新文章数量
  oldCount: number; // 每日旧文章数量
  intensiveCount: number; // 每日精读推荐数量

  // 日期配置
  dateThreshold: string; // 新旧分界日期 YYYY-MM-DD

  // 复习配置
  reviewIntervals: number[]; // 艾宾浩斯记忆曲线间隔 [1,2,4,7,15,30]
  reviewCount: number; // 每日复习篇数上限

  // Agent 配置
  piCliPath: string; // Pi CLI 可执行路径
  piCliTimeout: number; // Agent 调用超时（毫秒）
  piProvider: string; // Pi Provider
  piModel: string; // Pi 模型 ID

  // 主题
  theme: 'light' | 'dark';
}

// 设置的默认值
export const defaultSettings: UserSettings = {
  newCount: 5,
  oldCount: 3,
  intensiveCount: 2,
  dateThreshold: '2025-01-01',
  reviewIntervals: [1, 2, 4, 7, 15, 30],
  reviewCount: 3,
  piCliPath: 'pi',
  piCliTimeout: 180000,
  piProvider: 'cc-switch-deep-seek',
  piModel: 'deepseek-flash',
  theme: 'light',
};

// ========== Agent 调用状态 ==========
export type AgentStage =
  | 'building-prompt'
  | 'calling-agent'
  | 'parsing-result'
  | 'done';
