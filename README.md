# PaperDaily

面向科研人员的每日论文推送桌面工具（Electron + React + TypeScript + SQLite + Pi CLI Agent）

## 项目状态

✅ **Phase 1 & Phase 2 核心层已完成**

### 已完成

#### 配置层
- [x] `package.json` - 完整依赖清单
- [x] TypeScript 配置（main/renderer/root）
- [x] `electron-vite.config.ts` - 构建配置
- [x] Tailwind CSS + PostCSS 配置
- [x] macOS Notes 风格主题配置

#### 类型系统（src/shared/types/）
- [x] `result.ts` - IpcResult<T> 统一返回类型
- [x] `models.ts` - Paper, AgentPaperResult, ReviewSchedule, ReviewItem, UserSettings
- [x] `ipc.ts` - IpcChannelMap（20个类型安全通道）
- [x] `ipc-events.ts` - IpcEventMap（3个事件）
- [x] `channels.ts` - IPC_CHANNELS 和 IPC_EVENTS 常量

#### 数据库层（src/main/db/）
- [x] `index.ts` - SQLite 初始化、迁移管理
- [x] `migrations/001_init.sql` - papers, review_schedule, settings 表
- [x] `repositories/papers.ts` - 完整的 CRUD 和查询方法
- [x] `repositories/review-schedule.ts` - 复习计划管理
- [x] `repositories/settings.ts` - 设置管理

#### 主进程服务（src/main/services/）
- [x] `agent/adapter.ts` - Agent 适配器接口
- [x] `agent/pi-cli.ts` - Pi CLI Agent 实现
- [x] `prompt-builder.ts` - Prompt 构建器
- [x] `result-parser.ts` - Agent 结果解析器
- [x] `review-scheduler.ts` - 艾宾浩斯复习调度器
- [x] `intensive-recommender.ts` - 精读推荐器

#### 主进程 IPC Handler（src/main/ipc/）
- [x] `papers.ts` - 6个论文操作 handler
- [x] `settings.ts` - 4个设置操作 handler
- [x] `agent.ts` - Agent 推送 + Prompt 预览/编辑 handler
- [x] `intensive.ts` - 精读库查询和推荐 handler
- [x] `review.ts` - 今日复习查询和标记完成 handler
- [x] `index.ts` - 统一注册入口

#### 主进程工具（src/main/lib/）
- [x] `typed-ipc.ts` - 类型安全的 IPC 注册工具
- [x] `logger.ts` - 简单日志工具

#### 窗口管理（src/main/windows/）
- [x] `widget-window.ts` - Widget 窗口创建和管理
- [x] `main-window.ts` - 主窗口创建和管理
- [x] `ipc-handlers.ts` - 窗口相关 IPC handler

#### 主进程入口
- [x] `src/main/index.ts` - 应用启动、单实例锁、生命周期管理

#### Preload 层
- [x] `src/preload/index.ts` - contextBridge API 暴露
- [x] `src/preload/types.d.ts` - 全局类型声明

#### 渲染进程（src/renderer/）
- [x] `index.html` - HTML 入口
- [x] `src/main.tsx` - React 入口
- [x] `src/App.tsx` - 路由配置
- [x] `src/index.css` - 全局样式

#### Zustand Stores
- [x] `stores/papers.ts` - 论文状态管理
- [x] `stores/agent.ts` - Agent 状态管理
- [x] `stores/settings.ts` - 设置状态管理
- [x] `stores/review.ts` - 复习状态管理

#### UI 组件
- [x] `pages/WidgetView.tsx` - Widget 窗口（四分类卡片）
- [x] `pages/MainView.tsx` - 主窗口布局
- [x] `components/main/HomePage.tsx` - 首页（今日推送列表）
- [x] `components/main/AgentPage.tsx` - Agent 推送页面
- [x] `components/main/IntensivePage.tsx` - 精读库页面
- [x] `components/main/ReviewPage.tsx` - 复习计划页面
- [x] `components/main/SettingsPage.tsx` - 设置页面

## 下一步操作

### 1. 安装依赖（需要稳定网络环境）

```bash
npm install
```

**注意**：Electron 二进制文件较大（~150MB），如遇网络超时，可尝试：

```bash
# 方法 1：使用国内镜像
npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
npm install

# 方法 2：使用代理
npm config set proxy http://your-proxy:port
npm install

# 方法 3：离线安装（先在网络良好的机器上 npm pack）
```

### 2. 开发模式运行

```bash
npm run dev
```

应该会启动：
- Widget 窗口（360x520，无边框，透明，桌面常驻）
- Main 窗口（1100x750，点击 Widget 时显示）

### 3. 验证核心功能

#### 3.1 数据库初始化
启动后检查日志，应该看到：
```
[App] Application ready
[DB] Database initialized at ...
[DB] Running migration: 001_init.sql
[IPC] All handlers registered successfully
```

#### 3.2 设置配置
在主窗口「设置」页面：
- 填写研究方向、研究问题、领域关键词
- 配置 Pi CLI 路径（Windows 下通常是 `pi`）
- 保存设置

#### 3.3 测试 Agent 连接
在「Agent 推送」页面：
- 点击「测试连接」，验证 Pi CLI 可用
- 点击「预览 Prompt」，查看构建的 Prompt
- 点击「推送论文」，触发完整推送流程

#### 3.4 验证推送结果
推送成功后：
- Widget 窗口应显示四分类卡片（新/旧/精读/复习）
- 主窗口「首页」应显示今日推送列表
- 「精读库」应包含 Agent 推荐的精读文章
- 「复习计划」应显示今日待复习任务（如果有）

### 4. 构建生产版本

```bash
npm run build
```

生成的可执行文件位于 `dist/` 目录。

## 技术栈

- **Electron** 30 - 桌面应用框架
- **React** 18 - UI 框架
- **TypeScript** 5 - 类型安全
- **Vite** 5 - 构建工具（通过 electron-vite）
- **better-sqlite3** - 嵌入式数据库
- **Zustand** - 状态管理
- **Ant Design** 5 - UI 组件库
- **Tailwind CSS** 3 - 样式工具
- **Pi CLI** - Agent 后端

## 架构亮点

### 1. 类型安全的 IPC 通信
所有 IPC 通道在 `IpcChannelMap` 中集中定义，`typedHandle` 和 `typedInvoke` 确保编译时类型检查。

### 2. 双窗口架构
- **Widget 窗口**：桌面常驻，快速浏览
- **Main 窗口**：完整功能，按需展开

### 3. Agent 驱动的内容发现
替代 RSS 抓取，Agent 根据用户研究方向推荐论文，并提供匹配度和匹配原因。

### 4. 艾宾浩斯复习系统
- 用户可配置复习间隔（默认：1, 2, 4, 7, 15, 30 天）
- 推送时自动创建完整复习计划
- 每日复习提醒

### 5. 精读推荐算法
- Agent 自动标记精读候选
- 用户可手动添加
- 算法排序（基于 matchScore）推荐 Top-K

### 6. 安全最佳实践
- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- CSP 策略

## 开发文档

详细设计文档：`开发说明.md`（16 章，8200+ 行）

## 许可证

MIT
