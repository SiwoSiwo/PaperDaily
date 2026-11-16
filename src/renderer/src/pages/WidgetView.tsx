import { useEffect, useState, type MouseEvent } from 'react';
import { Alert, Empty, Spin, Button, Checkbox, message } from 'antd';
import {
  ClockCircleOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usePapersStore } from '../stores/papers';
import { useReviewStore } from '../stores/review';
import type { Paper } from '../../../shared/types/models';
import type { AgentStage } from '../../../shared/types/models';

interface PaperCardProps {
  title: string;
  papers: Paper[];
  emptyText: string;
  pendingIds: string[];
  onToggleRead: (paper: Paper, value: boolean) => Promise<void>;
  onOpenPaper: (paper: Paper) => Promise<void>;
}

function PaperCard({
  title,
  papers,
  emptyText,
  pendingIds,
  onToggleRead,
  onOpenPaper,
}: PaperCardProps) {
  return (
    <div className="widget-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-notes-text">{title}</h3>
        <span className="widget-count" aria-label={`${papers.length} 篇`}>
          {papers.length}
        </span>
      </div>
      <div className="widget-paper-list space-y-1 overflow-y-auto pr-1">
        {papers.length === 0 ? (
          <p className="text-xs text-notes-secondary">{emptyText}</p>
        ) : (
          papers.map((paper) => (
            <div
              key={paper.id}
              className="widget-no-drag flex items-start gap-2 py-1"
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={paper.isFinished}
                disabled={pendingIds.includes(paper.id)}
                onChange={(event) => {
                  void onToggleRead(paper, event.target.checked);
                }}
                aria-label={`标记“${paper.title}”为已读`}
              />
              <a
                href={paper.url}
                title={`在 Microsoft Edge 中打开“${paper.title}”`}
                className={`widget-paper-link text-xs leading-5 break-words min-w-0 ${
                  paper.isFinished
                    ? 'is-finished'
                    : ''
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  void onOpenPaper(paper);
                }}
              >
                {paper.title}
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function WidgetView() {
  const { todayPapers, loadingToday, fetchToday } = usePapersStore();
  const { reviewItems, fetchTodayReviews } = useReviewStore();
  const [agentStage, setAgentStage] = useState<AgentStage | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchToday();
    fetchTodayReviews();

    // 监听论文推送到达事件
    const unsubscribe = window.electronAPI.onPapersPushArrived((data) => {
      console.log('[WidgetView] Papers push arrived:', data);
      setAgentStage('done');
      setPushError(null);
      fetchToday();
      fetchTodayReviews();
    });

    const unsubscribeProgress = window.electronAPI.onAgentProgress(({ stage }) => {
      setAgentStage(stage);
      if (stage !== 'done') setPushError(null);
    });

    const unsubscribeError = window.electronAPI.onAgentError(({ message }) => {
      setAgentStage(null);
      setPushError(message);
    });

    const unsubscribeChanges = window.electronAPI.onPapersChanged(() => {
      void fetchToday();
      void fetchTodayReviews();
    });

    return () => {
      unsubscribe();
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeChanges();
    };
  }, []);

  const handleOpenMain = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    void window.electronAPI.windowOpenMain();
  };

  const handleOpenPaper = async (paper: Paper): Promise<void> => {
    try {
      const result = await window.electronAPI.shellOpenExternal(paper.url);
      if (!result.success) message.error(`无法打开论文链接：${result.error}`);
    } catch (error) {
      message.error(`无法打开论文链接：${String(error)}`);
    }
  };

  const stopAndRefresh = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    void fetchToday();
  };

  const hideWidget = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    void window.electronAPI.windowHideWidget();
  };

  const retryPush = async (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPushError(null);
    const result = await window.electronAPI.agentFetch();
    if (!result.success) setPushError(result.error);
  };

  const handleToggleRead = async (paper: Paper, value: boolean): Promise<void> => {
    setPendingIds((current) => [...current, paper.id]);
    try {
      await usePapersStore.getState().setFinished(paper.id, value);
    } catch (error) {
      message.error(`更新阅读状态失败：${String(error)}`);
    } finally {
      setPendingIds((current) => current.filter((id) => id !== paper.id));
    }
  };

  const newPapers = todayPapers.filter((p) => p.category === 'new');
  const oldPapers = todayPapers.filter((p) => p.category === 'old');
  const intensivePapers = todayPapers.filter((p) => p.category === 'intensive');
  const reviewPapers = Array.from(
    new Map(reviewItems.map((item) => [item.paper.id, item.paper])).values()
  );

  return (
    <div className="widget-drag-region widget-shell w-full h-full p-3 flex flex-col">
      {/* Header */}
      <div className="widget-header flex-none flex items-center justify-between mb-3">
        <div
          className="widget-header__open-target widget-no-drag flex min-w-0 flex-1 items-center gap-2"
          title="双击打开主窗口"
          onDoubleClick={handleOpenMain}
        >
          <span className="widget-title-icon" aria-hidden="true">
            <ClockCircleOutlined />
          </span>
          <h1 className="text-base font-semibold text-notes-text">每日论文</h1>
        </div>
        <div className="widget-no-drag flex items-center gap-1">
          <Button
            icon={<ReloadOutlined />}
            size="small"
            type="text"
            title="刷新今日推送"
            aria-label="刷新今日推送"
            onClick={stopAndRefresh}
            loading={loadingToday}
            className="icon-button"
          />
          <Button
            icon={<CloseOutlined />}
            size="small"
            type="text"
            title="隐藏到系统托盘"
            aria-label="隐藏 Widget"
            onClick={hideWidget}
            className="destructive-icon-button"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {agentStage && agentStage !== 'done' && (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message="正在获取今日论文"
            description={agentStage === 'calling-agent' ? 'Agent 正在检索和筛选论文...' : '正在整理推送结果...'}
          />
        )}

        {pushError && (
          <Alert
            className="widget-no-drag mb-3"
            type="error"
            showIcon
            message="自动推送失败"
            description={pushError}
            action={
              <Button size="small" onClick={retryPush}>
                重试
              </Button>
            }
          />
        )}

        {/* Loading State */}
        {loadingToday && (
          <div className="flex justify-center items-center h-64">
            <Spin tip="加载中..." />
          </div>
        )}

        {/* Empty State */}
        {!loadingToday && todayPapers.length === 0 && (
          <Empty description="暂无今日推送" />
        )}

        {/* 四分类卡片 */}
        {!loadingToday && todayPapers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PaperCard
              title="新文章"
              papers={newPapers}
              emptyText="暂无新文章"
              pendingIds={pendingIds}
              onToggleRead={handleToggleRead}
              onOpenPaper={handleOpenPaper}
            />
            <PaperCard
              title="旧文章"
              papers={oldPapers}
              emptyText="暂无旧文章"
              pendingIds={pendingIds}
              onToggleRead={handleToggleRead}
              onOpenPaper={handleOpenPaper}
            />
            <PaperCard
              title="精读推荐"
              papers={intensivePapers}
              emptyText="暂无精读推荐"
              pendingIds={pendingIds}
              onToggleRead={handleToggleRead}
              onOpenPaper={handleOpenPaper}
            />
            <PaperCard
              title="今日复习"
              papers={reviewPapers}
              emptyText="暂无复习任务"
              pendingIds={pendingIds}
              onToggleRead={handleToggleRead}
              onOpenPaper={handleOpenPaper}
            />
          </div>
        )}
      </div>
    </div>
  );
}
