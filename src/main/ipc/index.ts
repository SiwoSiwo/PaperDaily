import { registerPapersHandlers } from './papers';
import { registerSettingsHandlers } from './settings';
import { registerAgentHandlers, registerPromptHandlers } from './agent';
import { registerIntensiveHandlers } from './intensive';
import { registerReviewHandlers } from './review';
import { logger } from '../lib/logger';
import { registerResearchHandlers } from './research';

/**
 * 注册所有 IPC Handler
 */
export function registerAllHandlers(): void {
  logger.info('[IPC] Registering all handlers...');

  registerPapersHandlers();
  registerSettingsHandlers();
  registerResearchHandlers();
  registerAgentHandlers();
  registerPromptHandlers();
  registerIntensiveHandlers();
  registerReviewHandlers();

  logger.info('[IPC] All handlers registered successfully');
}
