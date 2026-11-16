import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Tag,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  RobotOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAgentStore } from '../../stores/agent';
import { usePapersStore } from '../../stores/papers';

export default function AgentPushPanel() {
  const {
    isFetching,
    currentStage,
    poolStatus,
    loadingPoolStatus,
    fetchPapers,
    testAgent,
    loadPoolStatus,
  } = useAgentStore();
  const { fetchToday } = usePapersStore();
  const [poolLoadError, setPoolLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadPoolStatus().catch((error: unknown) => {
      setPoolLoadError(error instanceof Error ? error.message : String(error));
    });

    const unsubscribe = window.electronAPI.onAgentProgress((data) => {
      console.log('[AgentPushPanel] Agent progress:', data.stage);
    });

    return unsubscribe;
  }, [loadPoolStatus]);

  const handleTestAgent = async () => {
    try {
      const result = await testAgent();
      message.success(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleFetchPapers = async () => {
    try {
      await fetchPapers();
      await fetchToday();
      message.success('今日推荐已补齐');
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    }
  };

  const stageMap = {
    'building-prompt': { label: '构建 Prompt', percent: 25 },
    'calling-agent': { label: '调用 Agent', percent: 50 },
    'parsing-result': { label: '解析结果', percent: 75 },
    done: { label: '完成', percent: 100 },
  };

  const currentProgress = currentStage ? stageMap[currentStage] : null;

  return (
    <Card className="surface-card agent-panel mb-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RobotOutlined className="text-2xl text-notes-accent" />
            <h3 className="text-lg font-semibold">Agent 推送</h3>
          </div>
          <p className="text-notes-secondary">
            使用已配置的 Pi CLI Agent 获取个性化论文推荐
          </p>
        </div>

        <Alert
          message="候选池优先"
          description="点击「补齐今日推荐」时会先复用文章库中的未推送候选；仅当某个分类库存不足时才调用 Agent，Agent 的全部结果都会进入文章库。"
          type="info"
          showIcon
        />

        {poolLoadError && (
          <Alert
            type="warning"
            showIcon
            message="无法读取推荐库存状态"
            description={poolLoadError}
          />
        )}

        <Descriptions title="推荐库存状态" size="small" bordered column={4}>
          <Descriptions.Item label="分类">新 / 旧 / 精读</Descriptions.Item>
          <Descriptions.Item label="今日目标">
            {formatCounts(poolStatus?.target)}
          </Descriptions.Item>
          <Descriptions.Item label="今日已推荐">
            {formatCounts(poolStatus?.recommendedToday)}
          </Descriptions.Item>
          <Descriptions.Item label="候选库存">
            {formatCounts(poolStatus?.available)}
          </Descriptions.Item>
          <Descriptions.Item label="仍需 Agent" span={3}>
            {formatCounts(poolStatus?.agentRequired)}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {loadingPoolStatus ? (
              <Tag className="status-tag">读取中</Tag>
            ) : poolStatus &&
              poolStatus.missingToday.new === 0 &&
              poolStatus.missingToday.old === 0 &&
              poolStatus.missingToday.intensive === 0 ? (
              <Tag className="status-tag status-tag--complete">
                今日已补齐，不调用 Agent
              </Tag>
            ) : poolStatus?.hasEnoughCandidates ? (
              <Tag className="status-tag status-tag--complete">
                库存充足，不调用 Agent
              </Tag>
            ) : (
              <Tag className="status-tag status-tag--warning">
                库存不足，需要 Agent
              </Tag>
            )}
          </Descriptions.Item>
        </Descriptions>

        {isFetching && currentProgress && (
          <div className="space-y-2">
            <Progress percent={currentProgress.percent} status="active" />
            <p className="text-sm text-notes-secondary text-center">
              {currentProgress.label}...
            </p>
          </div>
        )}

        <Space wrap>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => void handleTestAgent()}
          >
            测试连接
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => void handleFetchPapers()}
            loading={isFetching}
            size="large"
          >
            补齐今日推荐
          </Button>
        </Space>
      </div>
    </Card>
  );
}

function formatCounts(
  counts?: { new: number; old: number; intensive: number }
): string {
  if (!counts) return '-';
  return `${counts.new} / ${counts.old} / ${counts.intensive}`;
}
