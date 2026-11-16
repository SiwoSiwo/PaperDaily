import { useEffect, useState } from 'react';
import { Card, List, Button, Empty, Spin, Tag, Space, message } from 'antd';
import { StarFilled, CheckOutlined } from '@ant-design/icons';
import type { Paper } from '../../../../shared/types/models';

export default function IntensivePage() {
  const [intensivePapers, setIntensivePapers] = useState<Paper[]>([]);
  const [recommendations, setRecommendations] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);

  const loadIntensivePapers = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.intensiveList();
      if (result.success) {
        setIntensivePapers(result.data);
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error('加载精读库失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const result = await window.electronAPI.intensiveRecommend();
      if (result.success) {
        setRecommendations(result.data);
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error('加载推荐失败');
    }
  };

  useEffect(() => {
    loadIntensivePapers();
    loadRecommendations();
  }, []);

  const handleToggleFinished = async (id: string, currentStatus: boolean) => {
    try {
      const result = await window.electronAPI.papersSetFinished(id, !currentStatus);
      if (result.success) {
        message.success(currentStatus ? '标记为未读' : '标记为已读');
        loadIntensivePapers();
        loadRecommendations();
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="state-panel">
        <Spin tip="加载中..." size="large" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="page-title">精读库</h2>
        <p className="page-subtitle">
          共 {intensivePapers.length} 篇精读论文
        </p>
      </div>

      {/* 今日推荐 */}
      {recommendations.length > 0 && (
        <Card
          title={
            <Space>
              <StarFilled className="text-notes-accent" />
              <span>今日推荐精读</span>
            </Space>
          }
          className="surface-card mb-6"
        >
          <List
            dataSource={recommendations}
            renderItem={(paper) => (
              <List.Item
                extra={
                  <Button
                    icon={<CheckOutlined />}
                    onClick={() => handleToggleFinished(paper.id, paper.isFinished)}
                  >
                    {paper.isFinished ? '标记未读' : '标记已读'}
                  </Button>
                }
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <a href={paper.url} target="_blank" rel="noopener noreferrer">
                        {paper.title}
                      </a>
                      {paper.isFinished && (
                        <Tag className="status-tag status-tag--complete">已读</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      <div className="text-xs text-notes-secondary">{paper.date}</div>
                      {paper.summary && (
                        <div className="text-sm">{paper.summary}</div>
                      )}
                      <div className="text-xs text-notes-accent">
                        匹配度：{((paper.matchScore || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 所有精读论文 */}
      {intensivePapers.length === 0 ? (
        <Empty description="精读库为空" />
      ) : (
        <List
          dataSource={intensivePapers}
          renderItem={(paper) => (
            <List.Item
              extra={
                <Button
                  icon={<CheckOutlined />}
                  onClick={() => handleToggleFinished(paper.id, paper.isFinished)}
                >
                  {paper.isFinished ? '标记未读' : '标记已读'}
                </Button>
              }
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center gap-2">
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      {paper.title}
                    </a>
                    {paper.isFinished && (
                      <Tag className="status-tag status-tag--complete">已读</Tag>
                    )}
                  </div>
                }
                description={
                  <div className="space-y-1">
                    <div className="text-xs text-notes-secondary">{paper.date}</div>
                    {paper.summary && (
                      <div className="text-sm text-notes-text">{paper.summary}</div>
                    )}
                    <div className="text-xs text-notes-accent">
                      匹配度：{((paper.matchScore || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
