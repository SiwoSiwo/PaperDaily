import { ipcMain, BrowserWindow } from 'electron';
import { typedHandle } from '../lib/typed-ipc';
import { PiCliAdapter } from '../services/agent/pi-cli';
import { promptBuilder } from '../services/prompt-builder';
import { resultParser } from '../services/result-parser';
import { papersRepository } from '../db/repositories/papers';
import { settingsRepository } from '../db/repositories/settings';
import { recommendationPoolService } from '../services/recommendation-pool';
import { wrapAsync, ok, err } from '../../shared/types/result';
import { logger } from '../lib/logger';
import type { AgentPaperResult, Paper } from '../../shared/types/models';
import type { IpcResult } from '../../shared/types/result';
import { researchRepository } from '../db/repositories/research';
import type { PromptPreviewInput } from '../../shared/types/models';

// Agent 适配器实例（单例）
let agentAdapter: PiCliAdapter | null = null;

function getAgentAdapter(): PiCliAdapter {
  const settings = settingsRepository.getAll();

  if (!agentAdapter) {
    agentAdapter = new PiCliAdapter(
      settings.piCliPath,
      settings.piCliTimeout,
      settings.piProvider,
      settings.piModel
    );
  } else {
    agentAdapter.updateConfig(
      settings.piCliPath,
      settings.piCliTimeout,
      settings.piProvider,
      settings.piModel
    );
  }
  return agentAdapter;
}

/**
 * 推送主流程：检查候选池 → 必要时调用 Agent 补库 → 选择今日推荐。
 */
let activeFetch: Promise<IpcResult<AgentPaperResult[]>> | null = null;

async function runFetchPapersWorkflow(
  customPrompt?: string
): Promise<IpcResult<AgentPaperResult[]>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const context = researchRepository.getActive();
    const settings = settingsRepository.getAll();
    const initialStatus = recommendationPoolService.getStatus(settings, context);

    if (
      initialStatus.missingToday.new === 0 &&
      initialStatus.missingToday.old === 0 &&
      initialStatus.missingToday.intensive === 0 &&
      !customPrompt
    ) {
      logger.info('[Agent] Today\'s recommendation target is already complete');
      return ok(
        papersRepository.findToday(context.question.id).map(toAgentPaperResult)
      );
    }

    const shouldCallAgent =
      Boolean(customPrompt) || !initialStatus.hasEnoughCandidates;

    if (shouldCallAgent) {
      broadcastProgress('building-prompt');
      const prompt =
        customPrompt || promptBuilder.build(
          initialStatus.agentRequired,
          context.question.id
        );

      broadcastProgress('calling-agent');
      const result = await getAgentAdapter().call(prompt);
      if (!result.success) {
        broadcastError(result.error);
        return err(result.error);
      }

      broadcastProgress('parsing-result');
      let parsedResults: AgentPaperResult[];
      try {
        parsedResults = resultParser.parse(result.data);
      } catch (firstParseError) {
        const detail = firstParseError instanceof Error
          ? firstParseError.message
          : String(firstParseError);
        logger.warn(
          `[Agent] First response was not parseable; retrying once: ${detail}`
        );

        broadcastProgress('calling-agent');
        const retryResult = await getAgentAdapter().call(`${prompt}\n\n## 输出纠正\n上一次返回无法被程序解析。请重新完成请求，并且只输出一个合法的 JSON 数组。不要使用 Markdown 代码块，不要添加解释、前言、结语或省略号。所有字符串必须正确转义。`);
        if (!retryResult.success) {
          throw new Error(`Agent 返回格式错误，自动重试失败：${retryResult.error}`);
        }

        broadcastProgress('parsing-result');
        try {
          parsedResults = resultParser.parse(retryResult.data);
        } catch {
          throw new Error('Agent 连续两次返回无法解析，请稍后重试或更换模型');
        }
      }
      recommendationPoolService.storeAgentResults(parsedResults, context);
      logger.info(
        `[Agent] Added ${parsedResults.length} results to the paper library`
      );
    } else {
      logger.info('[Agent] Candidate pool is sufficient; skipping Agent call');
    }

    const papers = recommendationPoolService.fillToday(context);
    const finalStatus = recommendationPoolService.getStatus(settings, context);
    const remaining =
      finalStatus.missingToday.new +
      finalStatus.missingToday.old +
      finalStatus.missingToday.intensive;
    if (remaining > 0) {
      logger.warn(
        `[RecommendationPool] Daily target remains short by ${remaining} papers`
      );
    }

    // 6. 广播进度：完成
    broadcastProgress('done');

    // 7. 通知渲染进程推送到达
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('papers:pushArrived', {
        count: papers.length,
        date: today,
      });
    });

    logger.info(`[Agent] Prepared ${papers.length} papers for today's recommendation`);
    return ok(papers.map(toAgentPaperResult));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Agent] Fetch workflow failed:', message);
    broadcastError(message);
    return err(message);
  }
}

/**
 * 串行化推送请求，避免启动自动推送与用户手动推送重复执行。
 */
export function fetchPapersWorkflow(
  customPrompt?: string
): Promise<IpcResult<AgentPaperResult[]>> {
  if (activeFetch) return activeFetch;

  activeFetch = runFetchPapersWorkflow(customPrompt).finally(() => {
    activeFetch = null;
  });
  return activeFetch;
}

/**
 * 应用启动后补齐当天推送。候选池足够时不会调用 Agent。
 */
export async function ensureDailyPush(): Promise<IpcResult<AgentPaperResult[]> | null> {
  const status = recommendationPoolService.getStatus();
  if (
    status.missingToday.new === 0 &&
    status.missingToday.old === 0 &&
    status.missingToday.intensive === 0
  ) {
    logger.info('[Agent] Today\'s recommendation target is complete');
    return null;
  }

  logger.info(
    `[Agent] Filling daily recommendation; Agent required: ${JSON.stringify(status.agentRequired)}`
  );
  return fetchPapersWorkflow();
}

/**
 * 广播 Agent 进度
 */
function broadcastProgress(stage: 'building-prompt' | 'calling-agent' | 'parsing-result' | 'done'): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('agent:progress', { stage });
  });
}

function broadcastError(message: string): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('agent:error', { message });
  });
}

function toAgentPaperResult(paper: Paper): AgentPaperResult {
  return {
    category: paper.category,
    title: paper.title,
    date: paper.date,
    url: paper.url,
    summary: paper.summary || '',
    matchScore: paper.matchScore || 0,
    matchReason: paper.matchReason || '',
  };
}

function isPromptPreviewInput(value: PromptPreviewInput): boolean {
  return typeof value === 'object'
    && value !== null
    && typeof value.directionName === 'string'
    && value.directionName.trim().length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && Array.isArray(value.domains)
    && value.domains.every((item) => typeof item === 'string')
    && typeof value.extraRequirements === 'string'
    && (value.promptOverride === null || typeof value.promptOverride === 'string')
    && (value.questionId === undefined || typeof value.questionId === 'string');
}

/**
 * 注册 Agent 相关的 IPC Handler
 */
export function registerAgentHandlers(): void {
  // Agent 抓取论文
  typedHandle(ipcMain, 'agent:fetch', async () => {
    logger.info('[IPC] agent:fetch');
    return await fetchPapersWorkflow();
  });

  // Agent 连接测试
  typedHandle(ipcMain, 'agent:test', async () => {
    logger.info('[IPC] agent:test');
    return getAgentAdapter().testConnection();
  });

  typedHandle(ipcMain, 'agent:models', async () => {
    logger.info('[IPC] agent:models');
    return getAgentAdapter().listModels();
  });

  typedHandle(ipcMain, 'agent:poolStatus', async () => {
    logger.info('[IPC] agent:poolStatus');
    return ok(recommendationPoolService.getStatus());
  });

  logger.info('[IPC] Agent handlers registered');
}

/**
 * Prompt 相关的 IPC Handler
 */
export function registerPromptHandlers(): void {
  // 预览 Prompt
  typedHandle(ipcMain, 'prompt:preview', async (_event, input) => {
    return wrapAsync(async () => {
      logger.info('[IPC] prompt:preview');
      if (input && !isPromptPreviewInput(input)) {
        throw new Error('Prompt 预览参数无效');
      }
      return input ? promptBuilder.preview(input) : promptBuilder.build();
    });
  });

  // 使用编辑后的 Prompt 抓取论文
  typedHandle(ipcMain, 'prompt:fetchWithEdit', async (_event, editedPrompt) => {
    logger.info('[IPC] prompt:fetchWithEdit');
    return await fetchPapersWorkflow(editedPrompt);
  });

  logger.info('[IPC] Prompt handlers registered');
}

/**
 * 清理 Agent 资源
 */
export function disposeAgent(): void {
  if (agentAdapter) {
    agentAdapter.dispose();
    agentAdapter = null;
  }
}
