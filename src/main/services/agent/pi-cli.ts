import { spawn, type ChildProcess } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AgentAdapter } from './adapter';
import type { AgentModelOption } from '../../../shared/types/models';
import type { IpcResult } from '../../../shared/types/result';
import { ok, err } from '../../../shared/types/result';
import { logger } from '../../lib/logger';

/**
 * Pi CLI Agent 适配器实现
 */
export class PiCliAdapter implements AgentAdapter {
  private processes = new Set<ChildProcess>();
  private piCliPath: string;
  private timeout: number;
  private provider: string;
  private model: string;

  constructor(
    piCliPath: string = 'pi',
    timeout: number = 180000,
    provider: string = 'cc-switch-deep-seek',
    model: string = 'deepseek-flash'
  ) {
    this.piCliPath = piCliPath;
    this.timeout = timeout;
    this.provider = provider;
    this.model = model;
  }

  /**
   * 调用 Pi CLI
   */
  async call(prompt: string): Promise<IpcResult<string>> {
    try {
      logger.info(
        `[PiCliAdapter] Calling Pi CLI with ${this.provider}/${this.model}...`
      );
      const output = await this.callPrompt(prompt, this.timeout, false);
      logger.info('[PiCliAdapter] Pi CLI call succeeded');
      return ok(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[PiCliAdapter] Pi CLI call failed:', message);
      return err(this.describeError(message));
    }
  }

  private async callPrompt(
    prompt: string,
    timeout: number,
    disableAllTools: boolean
  ): Promise<string> {
    this.validateModelConfig();
    const promptDirectory = mkdtempSync(join(tmpdir(), 'paper-daily-'));
    const promptPath = join(promptDirectory, 'prompt.md');

    try {
      writeFileSync(promptPath, prompt, 'utf8');
      return await this.spawnPi(
        [
          '--print',
          '--no-session',
          '--no-context-files',
          disableAllTools ? '--no-tools' : '--no-builtin-tools',
          '--provider',
          this.provider,
          '--model',
          this.model,
          `@${promptPath}`,
        ],
        timeout
      );
    } finally {
      rmSync(promptDirectory, { recursive: true, force: true });
    }
  }

  /**
   * Spawn Pi CLI 子进程
   */
  private spawnPi(args: string[], timeout = this.timeout): Promise<string> {
    return new Promise((resolve, reject) => {
      // Windows command shims such as pi.cmd cannot be spawned directly by Node.
      const executable = process.platform === 'win32'
        ? process.env.ComSpec || 'cmd.exe'
        : this.piCliPath;
      const commandArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', this.piCliPath, ...args]
        : args;
      const child = spawn(executable, commandArgs, {
        windowsHide: true, // Windows 下隐藏控制台窗口
        // Pi print mode reads piped stdin before processing arguments. Keep it at EOF.
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.processes.add(child);

      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        this.processes.delete(child);
        clearTimeout(timeoutId);

        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      };

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          finish();
        } else {
          finish(
            new Error(
              `Pi CLI exited with code ${code}. stderr: ${stderr || '(empty)'}`
            )
          );
        }
      });

      child.on('error', (error) => {
        finish(
          new Error(`Failed to spawn Pi CLI: ${error.message}`)
        );
      });

      // 超时保护
      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM');
          finish(new Error(`Pi CLI timeout after ${timeout}ms`));
        }
      }, timeout);
    });
  }

  /**
   * 检查 Pi CLI 是否可用
   */
  async isAvailable(): Promise<boolean> {
    return (await this.testConnection()).success;
  }

  async testConnection(): Promise<IpcResult<string>> {
    try {
      this.validateModelConfig();
      await this.spawnPi(['--version'], 5000);

      const authOutput = await this.spawnPi(
        ['auth', 'check', '--provider', this.provider, '--json'],
        15000
      );
      const auth = JSON.parse(authOutput) as { status?: string; reason?: string };
      if (auth.status !== 'ready') {
        throw new Error(
          `Provider ${this.provider} 凭据不可用${auth.reason ? `：${auth.reason}` : ''}`
        );
      }

      const output = await this.callPrompt(
        '只输出 OK，不要解释。',
        Math.min(this.timeout, 30000),
        true
      );
      if (!output.trim()) {
        throw new Error('模型返回了空响应');
      }

      return ok(`${this.provider}/${this.model} 已通过真实推理测试`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(this.describeError(message));
    }
  }

  async listModels(): Promise<IpcResult<AgentModelOption[]>> {
    try {
      const output = await this.spawnPi(['--list-models'], 15000);
      const models = output
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim().split(/\s+/))
        .filter((columns) => columns.length >= 2)
        .map(([provider, model]) => ({ provider, model }));
      return ok(models);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(`无法读取 Pi 模型列表：${message}`);
    }
  }

  /**
   * 清理所有子进程
   */
  dispose(): void {
    logger.info(`[PiCliAdapter] Disposing ${this.processes.size} processes`);
    for (const proc of this.processes) {
      if (!proc.killed) {
        proc.kill('SIGTERM');
      }
    }
    this.processes.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(
    piCliPath: string,
    timeout: number,
    provider: string,
    model: string
  ): void {
    this.piCliPath = piCliPath;
    this.timeout = timeout;
    this.provider = provider;
    this.model = model;
    logger.info(
      `[PiCliAdapter] Config updated: path=${piCliPath}, model=${provider}/${model}, timeout=${timeout}`
    );
  }

  private validateModelConfig(): void {
    const safeIdentifier = /^[a-zA-Z0-9._:/-]+$/;
    if (!this.provider || !safeIdentifier.test(this.provider)) {
      throw new Error('Pi Provider 未配置或格式无效');
    }
    if (!this.model || !safeIdentifier.test(this.model)) {
      throw new Error('Pi 模型未配置或格式无效');
    }
  }

  private describeError(message: string): string {
    if (/request timed out/i.test(message)) {
      return `模型 ${this.provider}/${this.model} 请求超时，请检查该 Provider 的服务状态或改用其他模型`;
    }
    return message;
  }
}
