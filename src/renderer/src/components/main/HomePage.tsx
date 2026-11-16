import { useEffect } from 'react';
import { Card, List, Tag, Button, Space, Empty, Spin } from 'antd';
import { StarOutlined, StarFilled, CheckOutlined } from '@ant-design/icons';
import { usePapersStore } from '../../stores/papers';
import type { Paper } from '../../../../shared/types/models';

export default function HomePage() {
  const { todayPapers, loadingToday, fetchToday, setIntensive, setFinished } =
    usePapersStore();

  useEffect(() => {
    fetchToday();
  }, []);

  const handleToggleIntensive = async (paper: Paper) => {
    try {
      await setIntensive(paper.id, !paper.isIntensive);
    } catch (error) {
      console.error('Failed to toggle intensive:', error);
    }
  };

  const handleToggleFinished = async (paper: Paper) => {
    try {
      await setFinished(paper.id, !paper.isFinished);
    } catch (error) {
      console.error('Failed to toggle finished:', error);
    }
  };

  const renderCategoryBadge = (category: string) => {
    const classMap: Record<string, string> = {
      new: 'status-tag--accent',
      old: '',
      intensive: 'status-tag--warning',
    };
    const labelMap: Record<string, string> = {
      new: '新',
      old: '旧',
      intensive: '精读',
    };
    return (
      <Tag className={`status-tag ${classMap[category] || ''}`}>
        {labelMap[category]}
      </Tag>
    );
  };

  if (loadingToday) {
    return (
      <div className="state-panel">
        <Spin tip="加载中..." size="large" />
      </div>
    );
  }

  if (todayPapers.length === 0) {
    return (
      <div className="state-panel">
        <Empty description="暂无今日推送" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="page-title">今日推送</h2>
        <p className="page-subtitle">
          共 {todayPapers.length} 篇论文
        </p>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
        dataSource={todayPapers}
        renderItem={(paper) => (
          <List.Item>
            <Card
              hoverable
              className="paper-card"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  {renderCategoryBadge(paper.category)}
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        paper.isIntensive ? (
                            <StarFilled />
                        ) : (
                          <StarOutlined />
                        )
                      }
                      onClick={() => handleToggleIntensive(paper)}
                      title={paper.isIntensive ? '取消精读标记' : '标记为精读'}
                      aria-label={paper.isIntensive ? '取消精读标记' : '标记为精读'}
                      className={`icon-button ${paper.isIntensive ? 'is-selected' : ''}`}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      title={paper.isFinished ? '标记为未读' : '标记为已读'}
                      aria-label={paper.isFinished ? '标记为未读' : '标记为已读'}
                      className={`icon-button ${paper.isFinished ? 'is-complete' : ''}`}
                      onClick={() => handleToggleFinished(paper)}
                    />
                  </Space>
                </div>

                <h3 className="text-base font-semibold text-notes-text line-clamp-2">
                  {paper.title}
                </h3>

                <p className="text-xs text-notes-secondary">{paper.date}</p>

                {paper.summary && (
                  <p className="text-sm text-notes-text line-clamp-3">
                    {paper.summary}
                  </p>
                )}

                {paper.matchReason && (
                  <div className="paper-card__reason">
                    <strong>匹配原因：</strong> {paper.matchReason}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-notes-border">
                  <span className="text-xs text-notes-secondary">
                    匹配度：{((paper.matchScore || 0) * 100).toFixed(0)}%
                  </span>
                  <Button
                    type="link"
                    size="small"
                    href={paper.url}
                    target="_blank"
                  >
                    查看原文
                  </Button>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
