import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  List,
  Select,
  Spin,
  Tag,
  message,
} from 'antd';
import { CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../stores/settings';
import type { ReviewItem } from '../../../../shared/types/models';

type ReviewSettingsFormValues = {
  reviewIntervals: Array<string | number>;
};

export default function ReviewPage() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [intervalForm] = Form.useForm<ReviewSettingsFormValues>();
  const {
    settings,
    loading: settingsLoading,
    loadSettings,
    updateSettings,
  } = useSettingsStore();

  const loadReviewItems = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.reviewToday();
      if (result.success) {
        setReviewItems(result.data);
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error('加载复习计划失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewItems();
    void loadSettings();
  }, []);

  useEffect(() => {
    intervalForm.setFieldValue(
      'reviewIntervals',
      normalizeNumberList(settings.reviewIntervals)
    );
  }, [settings.reviewIntervals, intervalForm]);

  const handleMarkDone = async (scheduleId: number) => {
    try {
      const result = await window.electronAPI.reviewMarkDone(scheduleId);
      if (result.success) {
        message.success('已标记为完成');
        void loadReviewItems();
      } else {
        message.error(result.error);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSaveIntervals = async () => {
    try {
      const values = await intervalForm.validateFields();
      const reviewIntervals = normalizeNumberList(values.reviewIntervals);
      await updateSettings({ reviewIntervals });
      message.success('复习间隔已保存');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '请检查复习间隔';
      message.error(`保存失败：${detail}`);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="page-title">复习计划</h2>
        <p className="page-subtitle">
          今日待复习：{reviewItems.length} 篇
        </p>
      </div>

      <Card
        title="复习间隔设置"
        className="surface-card mb-6"
      >
        <Form form={intervalForm} layout="vertical">
          <Form.Item
            label="间隔天数"
            name="reviewIntervals"
            tooltip="艾宾浩斯复习间隔，默认：1, 2, 4, 7, 15, 30"
            rules={[
              { required: true, message: '请输入至少一个复习间隔' },
              {
                validator: (_, value: unknown[]) => {
                  const valid =
                    value?.length > 0 &&
                    value.every(
                      (item) =>
                        Number.isInteger(Number(item)) && Number(item) > 0
                    );
                  return valid
                    ? Promise.resolve()
                    : Promise.reject(new Error('复习间隔必须是正整数'));
                },
              },
            ]}
          >
            <Select
              mode="tags"
              tokenSeparators={[',', '，']}
              placeholder="输入后按回车，例如：1、2、4、7、15、30"
            />
          </Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => void handleSaveIntervals()}
            loading={settingsLoading}
          >
            保存复习间隔
          </Button>
        </Form>
      </Card>

      <Card title="今日任务" className="surface-card">
        <Spin spinning={loading} tip="加载中...">
          {reviewItems.length === 0 ? (
            <Empty description="今日无复习任务" />
          ) : (
            <List
              dataSource={reviewItems}
              renderItem={(item) => (
                <List.Item
                  extra={
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => void handleMarkDone(item.scheduleId)}
                    >
                      标记完成
                    </Button>
                  }
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-2">
                        <a
                          href={item.paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.paper.title}
                        </a>
                        <Tag className="status-tag status-tag--running">
                          第 {item.intervalDay} 天
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-xs text-notes-secondary">
                          {item.paper.date}
                        </div>
                        {item.paper.summary && (
                          <div className="text-sm text-notes-text">
                            {item.paper.summary}
                          </div>
                        )}
                        <div className="text-xs text-notes-accent">
                          复习日期：{item.reviewDate}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}

function normalizeNumberList(value: unknown): number[] {
  const values = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[,，]/);
  return values
    .map(Number)
    .filter((interval) => Number.isInteger(interval) && interval > 0);
}
