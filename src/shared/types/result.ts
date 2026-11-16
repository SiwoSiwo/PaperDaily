// ========== IpcResult 通用返回类型 ==========
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// 成功返回辅助函数
export function ok<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

// 失败返回辅助函数
export function err<T>(error: string): IpcResult<T> {
  return { success: false, error };
}

// 执行异步操作并包装为 IpcResult
export async function wrapAsync<T>(
  operation: () => Promise<T> | T
): Promise<IpcResult<T>> {
  try {
    const data = await operation();
    // 使用 JSON 序列化/反序列化来确保数据是纯净的
    // 这样可以移除任何非可序列化的属性（如数据库连接）
    const cleanData = data === undefined
      ? data
      : JSON.parse(JSON.stringify(data));
    return ok(cleanData);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}
