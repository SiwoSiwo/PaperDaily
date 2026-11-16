import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  message,
  type MenuProps,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type {
  ArticleLibraryItem,
  ArticleLibraryQuery,
  ResearchDirection,
} from '../../../../shared/types/models';

const initialQuery: ArticleLibraryQuery = {
  title: '',
  researchDirectionId: 'all',
  researchQuestionId: 'all',
  intensive: 'all',
  read: 'all',
  review: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
};

const booleanOptions = (yesLabel: string, noLabel: string) => [
  { value: 'all', label: '全部' },
  { value: 'yes', label: yesLabel },
  { value: 'no', label: noLabel },
];

export default function ArticleLibraryPage() {
  const [query, setQuery] = useState<ArticleLibraryQuery>(initialQuery);
  const [papers, setPapers] = useState<ArticleLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<ResearchDirection[]>([]);

  const loadDirections = useCallback(async () => {
    const result = await window.electronAPI.researchList();
    if (result.success) {
      setDirections(result.data);
      setQuery((current) => {
        if (current.researchDirectionId === 'all') return current;
        const direction = result.data.find(
          (item) => item.id === current.researchDirectionId
        );
        if (!direction) {
          return {
            ...current,
            researchDirectionId: 'all',
            researchQuestionId: 'all',
          };
        }
        if (
          current.researchQuestionId !== 'all' &&
          !direction.questions.some((item) => item.id === current.researchQuestionId)
        ) {
          return { ...current, researchQuestionId: 'all' };
        }
        return current;
      });
    }
  }, []);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.papersLibrary(query);
      if (result.success) {
        setPapers(result.data);
      } else {
        message.error(`加载文章库失败：${result.error}`);
      }
    } catch (error) {
      message.error(`加载文章库失败：${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPapers();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadPapers]);

  useEffect(() => {
    void loadDirections();
  }, [loadDirections]);

  useEffect(() => {
    return window.electronAPI.onPapersChanged(() => {
      void loadPapers();
    });
  }, [loadPapers]);

  useEffect(() => window.electronAPI.onResearchChanged(() => {
    void loadDirections();
    void loadPapers();
  }), [loadDirections, loadPapers]);

  const selectedDirection = directions.find(
    (direction) => direction.id === query.researchDirectionId
  );

  const updateQuery = <K extends keyof ArticleLibraryQuery>(
    key: K,
    value: ArticleLibraryQuery[K]
  ): void => {
    setQuery((current) => ({ ...current, [key]: value }));
  };

  const mutatePaper = async (
    action: () => ReturnType<typeof window.electronAPI.papersSetFinished>,
    successMessage: string
  ): Promise<void> => {
    try {
      const result = await action();
      if (result.success) {
        message.success(successMessage);
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error(`操作失败：${String(error)}`);
    }
  };

  const deletePaper = (paper: ArticleLibraryItem): void => {
    Modal.confirm({
      title: '删除文章',
      content: `确定从文章库中删除“${paper.title}”吗？相关推送和复习记录也会一并删除。`,
      okText: '删除',
      okButtonProps: { className: 'destructive-button' },
      cancelText: '取消',
      className: 'destructive-confirm',
      onOk: async () => {
        await mutatePaper(
          () => window.electronAPI.papersDelete(paper.id),
          '文章已删除'
        );
      },
    });
  };

  const contextMenu = (paper: ArticleLibraryItem): MenuProps => ({
    items: [
      {
        key: 'intensive',
        icon: <StarOutlined />,
        label: paper.isIntensive ? '取消精读标记' : '标记为精读',
      },
      {
        key: 'finished',
        icon: <CheckCircleOutlined />,
        label: paper.isFinished ? '标记为未读' : '标记为已读',
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        className: 'destructive-menu-item',
      },
    ],
    onClick: ({ key }) => {
      if (key === 'intensive') {
        void mutatePaper(
          () => window.electronAPI.papersSetIntensive(paper.id, !paper.isIntensive),
          paper.isIntensive ? '已取消精读标记' : '已标记为精读'
        );
      } else if (key === 'finished') {
        void mutatePaper(
          () => window.electronAPI.papersSetFinished(paper.id, !paper.isFinished),
          paper.isFinished ? '已标记为未读' : '已标记为已读'
        );
      } else if (key === 'delete') {
        deletePaper(paper);
      }
    },
  });

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="page-title">文章库</h2>
        <p className="page-subtitle">
          共 {papers.length} 篇文章，包含 Agent 返回的全部候选结果
        </p>
      </div>

      <div className="toolbar-panel mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            allowClear
            value={query.title}
            onChange={(event) => updateQuery('title', event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="按标题搜索"
            className="min-w-64 flex-1"
          />
          <Select
            aria-label="研究方向筛选"
            value={query.researchDirectionId}
            options={[
              { value: 'all', label: '全部研究方向' },
              ...directions.map((direction) => ({
                value: direction.id,
                label: direction.name,
              })),
            ]}
            onChange={(value) => setQuery((current) => ({
              ...current,
              researchDirectionId: value,
              researchQuestionId: 'all',
            }))}
            className="min-w-40"
          />
          <Select
            aria-label="研究问题筛选"
            value={query.researchQuestionId}
            disabled={query.researchDirectionId === 'all'}
            options={[
              { value: 'all', label: '全部研究问题' },
              ...(selectedDirection?.questions || []).map((question) => ({
                value: question.id,
                label: question.name,
              })),
            ]}
            onChange={(value) => updateQuery('researchQuestionId', value)}
            className="min-w-40"
          />
          <Select
            aria-label="精读筛选"
            value={query.intensive}
            options={booleanOptions('已精读标记', '无精读标记')}
            onChange={(value) => updateQuery('intensive', value)}
            className="w-36"
          />
          <Select
            aria-label="阅读状态筛选"
            value={query.read}
            options={booleanOptions('已读', '未读')}
            onChange={(value) => updateQuery('read', value)}
            className="w-28"
          />
          <Select
            aria-label="复习状态筛选"
            value={query.review}
            options={booleanOptions('需要复习', '无需复习')}
            onChange={(value) => updateQuery('review', value)}
            className="w-32"
          />
          <Select
            aria-label="排序字段"
            value={query.sortBy}
            options={[
              { value: 'date', label: '文章日期' },
              { value: 'matchScore', label: '匹配度' },
            ]}
            onChange={(value) => updateQuery('sortBy', value)}
            className="w-28"
          />
          <Select
            aria-label="排序方向"
            value={query.sortOrder}
            options={[
              { value: 'desc', label: '降序' },
              { value: 'asc', label: '升序' },
            ]}
            onChange={(value) => updateQuery('sortOrder', value)}
            className="w-24"
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {papers.length === 0 && !loading ? (
          <Empty description="没有符合条件的文章" />
        ) : (
          <List
            className="library-list"
            dataSource={papers}
            pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
            renderItem={(paper) => (
              <Dropdown menu={contextMenu(paper)} trigger={['contextMenu']}>
                <div className="library-row">
                  <List.Item className="!p-0">
                    <List.Item.Meta
                      title={
                        <a href={paper.url} target="_blank" rel="noreferrer">
                          {paper.title}
                        </a>
                      }
                      description={
                        <div className="mt-2">
                          <Space size={[6, 6]} wrap>
                            <span>{paper.date}</span>
                            <span>匹配度 {Math.round((paper.matchScore ?? 0) * 100)}%</span>
                            <Tag className="status-tag status-tag--accent">
                              {paper.researchDirection}
                            </Tag>
                            <Tag className="status-tag">{paper.researchQuestion}</Tag>
                            {paper.isIntensive && (
                              <Tag className="status-tag status-tag--warning">精读</Tag>
                            )}
                            {paper.isFinished && (
                              <Tag className="status-tag status-tag--complete">已读</Tag>
                            )}
                            {paper.needsReview && (
                              <Tag className="status-tag status-tag--running">待复习</Tag>
                            )}
                          </Space>
                          {paper.summary && (
                            <p className="text-sm text-notes-text mt-2 line-clamp-2">
                              {paper.summary}
                            </p>
                          )}
                        </div>
                      }
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      title="右键管理文章"
                      aria-label="右键管理文章"
                      className="icon-button"
                    />
                  </List.Item>
                </div>
              </Dropdown>
            )}
          />
        )}
      </Spin>
    </div>
  );
}
