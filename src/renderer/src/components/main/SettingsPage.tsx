import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { ApiOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../stores/settings';
import { useAgentStore } from '../../stores/agent';
import AgentPushPanel from './AgentPushPanel';
import type {
  AgentModelOption,
  UserSettings,
} from '../../../../shared/types/models';

type SettingsFormValues = Pick<
  UserSettings,
  | 'newCount'
  | 'oldCount'
  | 'intensiveCount'
  | 'dateThreshold'
  | 'piCliPath'
  | 'piCliTimeout'
  | 'piProvider'
  | 'piModel'
>;

export default function SettingsPage() {
  const { settings, loading, loadSettings, updateSettings } = useSettingsStore();
  const { testAgent } = useAgentStore();
  const [form] = Form.useForm<SettingsFormValues>();
  const [modelOptions, setModelOptions] = useState<AgentModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const selectedProvider = Form.useWatch('piProvider', form);
  const selectedModel = Form.useWatch('piModel', form);

  const providers = useMemo(
    () => Array.from(new Set(modelOptions.map((item) => item.provider))),
    [modelOptions]
  );
  const modelsForProvider = useMemo(
    () => modelOptions.filter((item) => item.provider === selectedProvider),
    [modelOptions, selectedProvider]
  );

  const loadAgentModels = async () => {
    setModelsLoading(true);
    setModelLoadError(null);
    try {
      const result = await window.electronAPI.agentModels();
      if (!result.success) {
        throw new Error(result.error);
      }
      setModelOptions(result.data);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setModelLoadError(detail);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    void loadAgentModels();
  }, []);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        newCount: settings.newCount,
        oldCount: settings.oldCount,
        intensiveCount: settings.intensiveCount,
        dateThreshold: settings.dateThreshold,
        piCliPath: settings.piCliPath,
        piCliTimeout: settings.piCliTimeout,
        piProvider: settings.piProvider,
        piModel: settings.piModel,
      });
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateSettings(values);
      message.success('设置已保存');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '请检查表单内容';
      message.error(`保存失败：${detail}`);
    }
  };

  const handleProviderChange = (provider: string) => {
    const firstModel = modelOptions.find((item) => item.provider === provider);
    form.setFieldValue('piModel', firstModel?.model);
    setTestResult(null);
  };

  const handleTestAgent = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const values = await form.validateFields([
        'piCliPath',
        'piCliTimeout',
        'piProvider',
        'piModel',
      ]);
      await updateSettings({
        piCliPath: values.piCliPath,
        piCliTimeout: values.piCliTimeout,
        piProvider: values.piProvider,
        piModel: values.piModel,
      });
      const result = await testAgent();
      setTestResult({ type: 'success', message: result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setTestResult({ type: 'error', message: detail });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h2 className="page-title">设置</h2>
        <p className="page-subtitle">配置推送参数、Agent 连接与推荐补齐</p>
      </div>

      <Card className="surface-card settings-panel max-w-3xl mb-6">
        <Form form={form} layout="vertical" initialValues={settings}>
          {/* 推送数量 */}
          <Card
            title="推送数量配置"
            size="small"
            className="settings-section mb-4"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item
                label="新文章数量"
                name="newCount"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={20} />
              </Form.Item>
              <Form.Item
                label="旧文章数量"
                name="oldCount"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={20} />
              </Form.Item>
              <Form.Item
                label="精读推荐数量"
                name="intensiveCount"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={10} />
              </Form.Item>
            </Space>
          </Card>

          {/* 日期阈值 */}
          <Form.Item
            label="新旧文章分界日期"
            name="dateThreshold"
            tooltip="发表日期早于此日期的文章被视为「旧文章」"
          >
            <Input type="date" />
          </Form.Item>

          {/* Pi CLI 配置 */}
          <Card title="Pi CLI 配置" size="small" className="settings-section mb-4">
            <Form.Item
              label="Pi CLI 路径"
              name="piCliPath"
              tooltip="Pi CLI 可执行文件路径，Windows 下通常为 'pi' 或完整路径"
              rules={[{ required: true, message: '请输入 Pi CLI 路径' }]}
            >
              <Input placeholder="pi" />
            </Form.Item>
            <Form.Item
              label="超时时间（毫秒）"
              name="piCliTimeout"
              tooltip="Agent 调用超时时间"
              rules={[{ required: true, message: '请输入超时时间' }]}
            >
              <InputNumber
                min={10000}
                max={300000}
                step={1000}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="Provider"
              name="piProvider"
              rules={[{ required: true, message: '请选择 Provider' }]}
            >
              <Select
                loading={modelsLoading}
                showSearch
                placeholder="选择 Provider"
                options={providers.map((provider) => ({
                  label: provider,
                  value: provider,
                }))}
                onChange={handleProviderChange}
              />
            </Form.Item>
            <Form.Item
              label="模型"
              name="piModel"
              rules={[{ required: true, message: '请选择模型' }]}
            >
              <Select
                loading={modelsLoading}
                showSearch
                placeholder="选择模型"
                options={modelsForProvider.map(({ model }) => ({
                  label: model,
                  value: model,
                }))}
              />
            </Form.Item>

            <Space wrap className="mb-3">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void loadAgentModels()}
                loading={modelsLoading}
              >
                刷新模型列表
              </Button>
              <Button
                type="primary"
                icon={<ApiOutlined />}
                onClick={() => void handleTestAgent()}
                loading={testing}
              >
                保存并测试连接
              </Button>
            </Space>

            <Typography.Paragraph type="secondary" className="mb-3">
              推送时将显式调用 {selectedProvider || '未选择 Provider'}/
              {selectedModel || '未选择模型'}。
            </Typography.Paragraph>

            {modelLoadError && (
              <Alert
                type="warning"
                showIcon
                className="mb-3"
                message="无法读取 Pi 模型列表"
                description={modelLoadError}
              />
            )}
            {testResult && (
              <Alert
                type={testResult.type}
                showIcon
                className="mb-3"
                message={
                  testResult.type === 'success'
                    ? 'Agent 配置可用'
                    : 'Agent 配置不可用'
                }
                description={testResult.message}
              />
            )}
          </Card>

          {/* 保存按钮 */}
          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              size="large"
            >
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div className="max-w-3xl">
        <AgentPushPanel />
      </div>
    </div>
  );
}
