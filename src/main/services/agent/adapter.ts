import type { IpcResult } from '../../../shared/types/result';
import type { AgentModelOption } from '../../../shared/types/models';

/**
 * Agent 适配器接口
 * 支持不同 Agent 实现（Pi CLI / 直接 API 调用等）
 */
export interface AgentAdapter {
  /**
   * 发送 prompt，返回 Agent 原始文本输出
   */
  call(prompt: string): Promise<IpcResult<string>>;

  /**
   * 检查 Agent 是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 验证 Provider 凭据及所选模型能否完成一次真实推理
   */
  testConnection(): Promise<IpcResult<string>>;

  /**
   * 列出 Pi CLI 当前可见的模型
   */
  listModels(): Promise<IpcResult<AgentModelOption[]>>;

  /**
   * 应用退出时清理资源
   */
  dispose(): void;
}
