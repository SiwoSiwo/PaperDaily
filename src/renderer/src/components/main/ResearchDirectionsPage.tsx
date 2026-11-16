import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  message,
  type MenuProps,
} from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  MenuOutlined,
  PlusOutlined,
  RightOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type {
  PromptPreviewInput,
  ResearchDirection,
  ResearchQuestion,
  ResearchQuestionUpdate,
} from '../../../../shared/types/models';

const { TextArea } = Input;

type DragItem =
  | { kind: 'direction'; id: string }
  | { kind: 'question'; id: string; directionId: string };

type PromptModal = {
  mode: 'preview' | 'edit';
  questionId: string;
  value: string;
};

export default function ResearchDirectionsPage() {
  const [directions, setDirections] = useState<ResearchDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedDirections, setExpandedDirections] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [directionNameEditing, setDirectionNameEditing] = useState<string | null>(null);
  const [questionNameEditing, setQuestionNameEditing] = useState<string | null>(null);
  const [directionNames, setDirectionNames] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, ResearchQuestionUpdate>>({});
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [promptModal, setPromptModal] = useState<PromptModal | null>(null);

  const loadDirections = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.researchList();
      if (!result.success) throw new Error(result.error);
      setDirections(result.data);
      setDirectionNames(Object.fromEntries(
        result.data.map((direction) => [direction.id, direction.name])
      ));
      setDrafts((current) => {
        const next = { ...current };
        for (const direction of result.data) {
          for (const question of direction.questions) {
            if (!next[question.id]) next[question.id] = toUpdate(question);
          }
        }
        return next;
      });
    } catch (error) {
      message.error(`加载研究方向失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirections();
    return window.electronAPI.onResearchChanged(() => {
      void loadDirections();
    });
  }, [loadDirections]);

  const active = useMemo(() => {
    const direction = directions.find((item) => item.questions.length > 0);
    return direction
      ? { directionId: direction.id, questionId: direction.questions[0].id }
      : null;
  }, [directions]);

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string
  ): void => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createDirection = async (): Promise<void> => {
    const result = await window.electronAPI.researchCreateDirection();
    if (!result.success) {
      message.error(result.error);
      return;
    }
    setExpandedDirections((current) => new Set(current).add(result.data.id));
    setDirectionNameEditing(result.data.id);
    await loadDirections();
  };

  const saveDirectionName = async (direction: ResearchDirection): Promise<void> => {
    const name = (directionNames[direction.id] || '').trim();
    if (!name) {
      message.error('研究方向不能为空');
      return;
    }
    const result = await window.electronAPI.researchUpdateDirection(direction.id, name);
    if (!result.success) message.error(result.error);
    setDirectionNameEditing(null);
  };

  const createQuestion = async (directionId: string): Promise<void> => {
    const result = await window.electronAPI.researchCreateQuestion(directionId);
    if (!result.success) {
      message.error(result.error);
      return;
    }
    setExpandedDirections((current) => new Set(current).add(directionId));
    setExpandedQuestions((current) => new Set(current).add(result.data.id));
    setQuestionNameEditing(result.data.id);
    await loadDirections();
  };

  const updateDraft = (
    question: ResearchQuestion,
    update: Partial<ResearchQuestionUpdate>
  ): void => {
    setDrafts((current) => ({
      ...current,
      [question.id]: { ...(current[question.id] || toUpdate(question)), ...update },
    }));
  };

  const saveQuestion = async (question: ResearchQuestion): Promise<void> => {
    const draft = drafts[question.id] || toUpdate(question);
    const direction = directions.find((item) => item.id === question.directionId);
    const directionName = (directionNames[question.directionId] || '').trim();
    if (!direction || !directionName) {
      message.error('研究方向不能为空');
      return;
    }
    if (!draft.name.trim()) {
      message.error('研究问题不能为空');
      return;
    }
    if (draft.domains.length === 0) {
      message.error('请至少填写一个领域关键词');
      return;
    }
    setSavingId(question.id);
    try {
      const directionResult = await window.electronAPI.researchUpdateDirection(
        direction.id,
        directionName
      );
      if (!directionResult.success) throw new Error(directionResult.error);
      const result = await window.electronAPI.researchUpdateQuestion(
        question.id,
        normalizeUpdate(draft)
      );
      if (!result.success) throw new Error(result.error);
      setQuestionNameEditing(null);
      message.success('研究问题已保存');
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSavingId(null);
    }
  };

  const promptInput = (
    direction: ResearchDirection,
    question: ResearchQuestion,
    includeOverride: boolean
  ): PromptPreviewInput => {
    const draft = drafts[question.id] || toUpdate(question);
    return {
      ...normalizeUpdate(draft),
      promptOverride: includeOverride ? draft.promptOverride : null,
      questionId: question.id,
      directionName: directionNames[direction.id] || direction.name,
    };
  };

  const openPrompt = async (
    direction: ResearchDirection,
    question: ResearchQuestion,
    mode: PromptModal['mode']
  ): Promise<void> => {
    const draft = drafts[question.id] || toUpdate(question);
    const result = await window.electronAPI.promptPreview(
      promptInput(direction, question, mode === 'preview')
    );
    if (!result.success) {
      message.error(`生成 Prompt 失败：${result.error}`);
      return;
    }
    setPromptModal({
      mode,
      questionId: question.id,
      value: mode === 'edit' && draft.promptOverride
        ? draft.promptOverride
        : result.data,
    });
  };

  const applyPromptEdit = (): void => {
    if (!promptModal) return;
    const question = directions
      .flatMap((direction) => direction.questions)
      .find((item) => item.id === promptModal.questionId);
    if (question) updateDraft(question, { promptOverride: promptModal.value.trim() || null });
    setPromptModal(null);
  };

  const confirmDeleteDirection = (direction: ResearchDirection): void => {
    Modal.confirm({
      title: '删除研究方向',
      content: `删除“${direction.name}”后，其研究问题、文章库条目、筛选选项、推送记录和复习计划都会一并删除。此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { className: 'destructive-button' },
      cancelText: '取消',
      className: 'destructive-confirm',
      onOk: async () => {
        const result = await window.electronAPI.researchDeleteDirection(direction.id);
        if (!result.success) throw new Error(result.error);
        message.success('研究方向及关联数据已删除');
      },
    });
  };

  const confirmDeleteQuestion = (question: ResearchQuestion): void => {
    Modal.confirm({
      title: '删除研究问题',
      content: `删除“${question.name}”后，对应文章库条目、筛选选项、推送记录和复习计划都会一并删除。此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { className: 'destructive-button' },
      cancelText: '取消',
      className: 'destructive-confirm',
      onOk: async () => {
        const result = await window.electronAPI.researchDeleteQuestion(question.id);
        if (!result.success) throw new Error(result.error);
        message.success('研究问题及关联数据已删除');
      },
    });
  };

  const directionMenu = (direction: ResearchDirection): MenuProps => ({
    items: [{
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除研究方向',
      className: 'destructive-menu-item',
    }],
    onClick: () => confirmDeleteDirection(direction),
  });

  const questionMenu = (question: ResearchQuestion): MenuProps => ({
    items: [{
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除研究问题',
      className: 'destructive-menu-item',
    }],
    onClick: () => confirmDeleteQuestion(question),
  });

  const reorderOnDrop = async (target: DragItem): Promise<void> => {
    if (!dragItem || dragItem.kind !== target.kind || dragItem.id === target.id) return;
    if (dragItem.kind === 'direction' && target.kind === 'direction') {
      const reordered = moveById(directions, dragItem.id, target.id);
      setDirections(reordered);
      const result = await window.electronAPI.researchReorderDirections(
        reordered.map((item) => item.id)
      );
      if (!result.success) {
        message.error(result.error);
        await loadDirections();
      }
    }
    if (
      dragItem.kind === 'question' &&
      target.kind === 'question' &&
      dragItem.directionId === target.directionId
    ) {
      const direction = directions.find((item) => item.id === target.directionId);
      if (!direction) return;
      const questions = moveById(direction.questions, dragItem.id, target.id);
      setDirections((current) => current.map((item) =>
        item.id === direction.id ? { ...item, questions } : item
      ));
      const result = await window.electronAPI.researchReorderQuestions(
        direction.id,
        questions.map((item) => item.id)
      );
      if (!result.success) {
        message.error(result.error);
        await loadDirections();
      }
    }
    setDragItem(null);
  };

  return (
    <div className="research-page h-full min-h-0 flex flex-col overflow-hidden">
      <div className="research-header flex-none flex items-center justify-between">
        <div>
          <h2 className="page-title">研究方向</h2>
          <p className="page-subtitle">
            排在最上方的研究方向与研究问题用于每日论文推送
          </p>
        </div>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => void createDirection()}
          title="新建研究方向"
          aria-label="新建研究方向"
          className="icon-button"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <Spin spinning={loading}>
          {directions.length === 0 && !loading ? (
            <Empty
              description="暂无研究方向"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void createDirection()}>
                新建研究方向
              </Button>
            </Empty>
          ) : (
            <div className="max-w-4xl mx-auto space-y-3 pb-6">
              {directions.map((direction) => {
                const directionExpanded = expandedDirections.has(direction.id);
                const isActiveDirection = active?.directionId === direction.id;
                return (
                  <div key={direction.id}>
                    <Dropdown menu={directionMenu(direction)} trigger={['contextMenu']}>
                      <div
                        className="direction-card"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void reorderOnDrop({ kind: 'direction', id: direction.id })}
                      >
                        <div className="direction-card__row h-14 px-3 flex items-center gap-3">
                          <DragHandle
                            label="拖动研究方向排序"
                            onDragStart={(event) => {
                              event.stopPropagation();
                              setDragItem({ kind: 'direction', id: direction.id });
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            {directionNameEditing === direction.id ? (
                              <Input
                                autoFocus
                                value={directionNames[direction.id] || ''}
                                onChange={(event) => setDirectionNames((current) => ({
                                  ...current,
                                  [direction.id]: event.target.value,
                                }))}
                                onBlur={() => void saveDirectionName(direction)}
                                onPressEnter={() => void saveDirectionName(direction)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') setDirectionNameEditing(null);
                                }}
                              />
                            ) : (
                              <div
                                className="font-medium text-notes-text truncate cursor-text"
                                onDoubleClick={() => setDirectionNameEditing(direction.id)}
                                title="双击编辑研究方向"
                              >
                                {directionNames[direction.id] || direction.name}
                              </div>
                            )}
                          </div>
                          {isActiveDirection && (
                            <Tag className="status-tag status-tag--accent">默认推送</Tag>
                          )}
                          <Button
                            type="text"
                            icon={directionExpanded ? <DownOutlined /> : <RightOutlined />}
                            onClick={() => toggleSet(setExpandedDirections, direction.id)}
                            title={directionExpanded ? '收起研究问题' : '展开研究问题'}
                            aria-label={directionExpanded ? '收起研究问题' : '展开研究问题'}
                            className="icon-button"
                          />
                        </div>
                      </div>
                    </Dropdown>

                    {directionExpanded && (
                      <div className="question-stack ml-10 mt-2 space-y-2">
                        {direction.questions.map((question) => (
                          <QuestionRow
                            key={question.id}
                            directionName={directionNames[direction.id] || direction.name}
                            question={question}
                            draft={drafts[question.id] || toUpdate(question)}
                            expanded={expandedQuestions.has(question.id)}
                            active={active?.questionId === question.id}
                            editingName={questionNameEditing === question.id}
                            saving={savingId === question.id}
                            menu={questionMenu(question)}
                            onToggle={() => toggleSet(setExpandedQuestions, question.id)}
                            onStartNameEdit={() => setQuestionNameEditing(question.id)}
                            onNameChange={(name) => updateDraft(question, { name })}
                            onDirectionNameChange={(name) => setDirectionNames((current) => ({
                              ...current,
                              [direction.id]: name,
                            }))}
                            onNameEditEnd={() => setQuestionNameEditing(null)}
                            onDraftChange={(update) => updateDraft(question, update)}
                            onSave={() => void saveQuestion(question)}
                            onPreview={() => void openPrompt(direction, question, 'preview')}
                            onEditPrompt={() => void openPrompt(direction, question, 'edit')}
                            onResetPrompt={() => updateDraft(question, { promptOverride: null })}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              setDragItem({
                                kind: 'question',
                                id: question.id,
                                directionId: direction.id,
                              });
                            }}
                            onDrop={() => void reorderOnDrop({
                              kind: 'question',
                              id: question.id,
                              directionId: direction.id,
                            })}
                          />
                        ))}
                        <div className="flex justify-center py-1">
                          <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={() => void createQuestion(direction.id)}
                            title="新建研究问题"
                            aria-label="新建研究问题"
                            className="icon-button"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Spin>
      </div>

      <Modal
        title={promptModal?.mode === 'edit' ? '编辑 Prompt' : '预览 Prompt'}
        open={Boolean(promptModal)}
        onCancel={() => setPromptModal(null)}
        onOk={promptModal?.mode === 'edit' ? applyPromptEdit : () => setPromptModal(null)}
        okText={promptModal?.mode === 'edit' ? '应用到研究问题' : '关闭'}
        cancelButtonProps={promptModal?.mode === 'preview' ? { style: { display: 'none' } } : undefined}
        width={820}
        className="app-modal"
      >
        {promptModal?.mode === 'edit' ? (
          <TextArea
            rows={20}
            value={promptModal.value}
            onChange={(event) => setPromptModal({ ...promptModal, value: event.target.value })}
          />
        ) : (
          <pre className="prompt-preview">
            {promptModal?.value}
          </pre>
        )}
      </Modal>
    </div>
  );
}

interface QuestionRowProps {
  directionName: string;
  question: ResearchQuestion;
  draft: ResearchQuestionUpdate;
  expanded: boolean;
  active: boolean;
  editingName: boolean;
  saving: boolean;
  menu: MenuProps;
  onToggle: () => void;
  onStartNameEdit: () => void;
  onNameChange: (name: string) => void;
  onDirectionNameChange: (name: string) => void;
  onNameEditEnd: () => void;
  onDraftChange: (update: Partial<ResearchQuestionUpdate>) => void;
  onSave: () => void;
  onPreview: () => void;
  onEditPrompt: () => void;
  onResetPrompt: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: () => void;
}

function QuestionRow(props: QuestionRowProps) {
  const {
    draft,
    expanded,
    active,
    editingName,
    saving,
    menu,
    onToggle,
    onStartNameEdit,
    onNameChange,
    onDirectionNameChange,
    onNameEditEnd,
    onDraftChange,
    onSave,
    onPreview,
    onEditPrompt,
    onResetPrompt,
    onDragStart,
    onDrop,
  } = props;

  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <div
        className="question-card"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div className="question-card__row h-12 px-3 flex items-center gap-3">
          <DragHandle label="拖动研究问题排序" onDragStart={onDragStart} />
          <div className="min-w-0 flex-1">
            {editingName ? (
              <Input
                autoFocus
                value={draft.name}
                onChange={(event) => onNameChange(event.target.value)}
                onBlur={onNameEditEnd}
                onPressEnter={onNameEditEnd}
              />
            ) : (
              <div
                className="text-sm font-medium text-notes-text truncate cursor-text"
                onDoubleClick={onStartNameEdit}
                title="双击编辑研究问题"
              >
                {draft.name}
              </div>
            )}
          </div>
          {active && <Tag className="status-tag status-tag--accent">当前问题</Tag>}
          <Button
            type="text"
            icon={expanded ? <DownOutlined /> : <RightOutlined />}
            onClick={onToggle}
            title={expanded ? '收起配置' : '展开配置'}
            aria-label={expanded ? '收起配置' : '展开配置'}
            className="icon-button"
          />
        </div>

        {expanded && (
          <div className="question-card__expanded px-4 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-notes-text mb-1">研究方向</label>
              <Input
                value={props.directionName}
                onChange={(event) => onDirectionNameChange(event.target.value)}
                placeholder="输入研究方向"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-notes-text mb-1">关注的研究问题</label>
              <TextArea
                rows={2}
                value={draft.name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="输入需要持续关注的研究问题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-notes-text mb-1">领域关键词</label>
              <Select
                mode="tags"
                value={draft.domains}
                tokenSeparators={[',', '，']}
                onChange={(domains) => onDraftChange({ domains })}
                placeholder="输入后按回车，例如 cs.AI、cs.CL"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-notes-text mb-1">额外需求</label>
              <TextArea
                rows={3}
                value={draft.extraRequirements}
                onChange={(event) => onDraftChange({ extraRequirements: event.target.value })}
                placeholder="补充论文范围、方法、年份或排除条件"
              />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Button icon={<EyeOutlined />} onClick={onPreview}>预览 Prompt</Button>
                <Button icon={<EditOutlined />} onClick={onEditPrompt}>编辑 Prompt</Button>
                {draft.promptOverride && (
                  <Button type="link" onClick={onResetPrompt}>恢复自动生成</Button>
                )}
              </div>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={onSave}
              >
                保存
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dropdown>
  );
}

function DragHandle({
  label,
  onDragStart,
}: {
  label: string;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      className="w-7 h-7 flex-none inline-flex items-center justify-center text-notes-secondary hover:text-notes-text cursor-grab active:cursor-grabbing"
      title={label}
      aria-label={label}
    >
      <MenuOutlined />
    </button>
  );
}

function toUpdate(question: ResearchQuestion): ResearchQuestionUpdate {
  return {
    name: question.name,
    domains: [...question.domains],
    extraRequirements: question.extraRequirements,
    promptOverride: question.promptOverride,
  };
}

function normalizeUpdate(update: ResearchQuestionUpdate): ResearchQuestionUpdate {
  return {
    name: update.name.trim(),
    domains: update.domains.map((item) => item.trim()).filter(Boolean),
    extraRequirements: update.extraRequirements.trim(),
    promptOverride: update.promptOverride?.trim() || null,
  };
}

function moveById<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return items;
  const next = [...items];
  const [source] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, source);
  return next;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
