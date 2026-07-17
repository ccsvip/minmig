import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, Tag,
  Space, Typography, Popconfirm, message, Progress, Drawer,
  Row, Col, Empty, Badge, Segmented,
} from 'antd';
import {
  PlusOutlined, PlayCircleOutlined, StopOutlined,
  DeleteOutlined, ReloadOutlined, SyncOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  PauseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { MigrationTask, Connection, TaskLog } from '../api/client';
import { useTasks } from '../hooks/useTasks';

const { Title, Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#d9d9d9', icon: <ClockCircleOutlined />, label: '待开始' },
  running: { color: '#1677ff', icon: <SyncOutlined spin />, label: '运行中' },
  completed: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '失败' },
  cancelled: { color: '#faad14', icon: <PauseCircleOutlined />, label: '已取消' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Migrations() {
  const { tasks, loading, fetch, subscribeProgress } = useTasks();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [sourceBuckets, setSourceBuckets] = useState<string[]>([]);
  const [targetBuckets, setTargetBuckets] = useState<string[]>([]);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<TaskLog[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [logLevel, setLogLevel] = useState<string>('all');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.get('/connections').then((res) => setConnections(res.data));
  }, []);

  const loadBuckets = async (connId: number, target: 'source' | 'target') => {
    try {
      const res = await client.get(`/buckets?conn_id=${connId}`);
      const names = res.data.map((b: any) => b.name);
      if (target === 'source') setSourceBuckets(names);
      else setTargetBuckets(names);
    } catch {
      message.error('获取桶列表失败');
    }
  };

  const openCreate = () => {
    form.resetFields();
    setSourceBuckets([]);
    setTargetBuckets([]);
    setModalOpen(true);
  };

  const handleStart = async (taskId: number) => {
    await client.post(`/migrations/${taskId}/start`);
    message.success('任务已启动');
    subscribeProgress(taskId, (data: any) => {
      setProgressMap((prev) => ({ ...prev, [taskId]: data }));
    });
    fetch();
  };

  const handleRetry = async (taskId: number) => {
    await client.post(`/migrations/${taskId}/start`);
    message.success('任务已重新启动');
    subscribeProgress(taskId, (data: any) => {
      setProgressMap((prev) => ({ ...prev, [taskId]: data }));
    });
    fetch();
  };

  const handleCancel = async (taskId: number) => {
    await client.post(`/migrations/${taskId}/cancel`);
    message.success('任务取消请求已发送');
    fetch();
  };

  const handleDelete = async (taskId: number) => {
    await client.delete(`/migrations/${taskId}`);
    message.success('任务已删除');
    fetch();
  };

  const viewLogs = async (taskId: number) => {
    setCurrentTaskId(taskId);
    setLogLevel('all');
    const res = await client.get(`/migrations/${taskId}/logs`);
    setCurrentLogs(res.data);
    setLogsDrawerOpen(true);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [currentLogs, logLevel]);

  const handleSubmitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await client.post('/migrations', values);
      message.success('迁移任务已创建');
      setModalOpen(false);
      fetch();
    } catch {
      message.error('创建任务失败，请检查网络或后端服务');
    } finally {
      setSubmitting(false);
    }
  };

  const getTaskActions = (task: MigrationTask) => {
    const actions: React.ReactNode[] = [];

    if (task.status === 'pending') {
      actions.push(
        <Button
          key="start"
          type="link"
          icon={<PlayCircleOutlined />}
          onClick={(e) => { e.stopPropagation(); handleStart(task.id); }}
        >
          启动
        </Button>
      );
    }
    if (task.status === 'running') {
      actions.push(
        <Button
          key="cancel"
          type="link"
          icon={<StopOutlined />}
          onClick={(e) => { e.stopPropagation(); handleCancel(task.id); }}
        >
          取消
        </Button>
      );
    }
    if (['failed', 'cancelled'].includes(task.status)) {
      actions.push(
        <Button
          key="retry"
          type="link"
          icon={<ReloadOutlined />}
          onClick={(e) => { e.stopPropagation(); handleRetry(task.id); }}
        >
          重试
        </Button>
      );
    }
    actions.push(
      <Button
        key="logs"
        type="link"
        onClick={(e) => { e.stopPropagation(); viewLogs(task.id); }}
      >
        日志
      </Button>
    );
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      actions.push(
        <Popconfirm key="delete" title="确定删除？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(task.id); }}>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      );
    }
    return actions;
  };

  const getTaskProgress = (task: MigrationTask) => {
    const p = progressMap[task.id];
    const copied = p?.copied_objects ?? task.copied_objects;
    const total = p?.total_objects ?? task.total_objects;
    const copiedBytes = p?.copied_bytes ?? task.copied_bytes;
    const totalBytes = p?.total_bytes ?? task.total_bytes;

    if (total === 0) return null;

    const percent = Math.round((copied / total) * 100);
    const status = task.status === 'failed' ? 'exception'
      : task.status === 'completed' ? 'success'
      : task.status === 'running' ? 'active'
      : 'normal';

    return (
      <div style={{ marginTop: 12 }}>
        <Progress
          percent={percent}
          status={status}
          format={() => (
            <span style={{ fontSize: 12 }}>
              {copied}/{total} 对象
            </span>
          )}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatBytes(copiedBytes)} / {formatBytes(totalBytes)}
          </Text>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>迁移任务</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建任务
          </Button>
        </Space>
      </div>

      {!loading && tasks.length === 0 ? (
        <Empty
          description="暂无迁移任务"
          style={{ marginTop: 80 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            创建第一个任务
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {tasks.map((task) => {
            const cfg = statusConfig[task.status] || statusConfig.pending;
            const isActive = task.status === 'running';
            const progress = getTaskProgress(task);

            return (
              <Col key={task.id} xs={24} sm={12} lg={8} xl={6}>
                <Badge.Ribbon
                  text={cfg.label}
                  color={cfg.color}
                  style={{ display: task.status === 'pending' ? 'none' : undefined }}
                >
                  <Card
                    hoverable
                    size="small"
                    style={{ height: '100%' }}
                    onClick={() => viewLogs(task.id)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: task.status === 'pending' ? 0 : 40 }}>
                        <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>
                        <Text strong ellipsis style={{ maxWidth: 160 }}>{task.name}</Text>
                      </div>
                    }
                  >
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>源:</Text>
                        <Text style={{ fontSize: 13 }}>{task.source_bucket}</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>目标:</Text>
                        <Text style={{ fontSize: 13 }}>{task.target_bucket}</Text>
                      </div>
                    </div>

                    {progress}

                    {task.error_message && (
                      <Text
                        type="danger"
                        style={{ fontSize: 11, display: 'block', marginTop: 8 }}
                        ellipsis
                      >
                        {task.error_message}
                      </Text>
                    )}

                    <div
                      style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getTaskActions(task)}
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title="新建迁移任务"
        open={modalOpen}
        onOk={handleSubmitForm}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="例如：迁移 logs 桶到灾备集群" />
          </Form.Item>
          <Form.Item
            name="source_conn_id"
            label="源连接"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="选择源 MinIO 连接"
              options={connections.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(val) => loadBuckets(val, 'source')}
            />
          </Form.Item>
          <Form.Item
            name="source_bucket"
            label="源桶"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择源桶" options={sourceBuckets.map((b) => ({ label: b, value: b }))} />
          </Form.Item>
          <Form.Item
            name="target_conn_id"
            label="目标连接"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="选择目标 MinIO 连接"
              options={connections.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(val) => loadBuckets(val, 'target')}
            />
          </Form.Item>
          <Form.Item
            name="target_bucket"
            label="目标桶"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择目标桶" options={targetBuckets.map((b) => ({ label: b, value: b }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <Space>
            <span>任务日志 #{currentTaskId}</span>
            <Tag>{currentLogs.length} 条</Tag>
          </Space>
        }
        open={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        width={640}
        extra={
          <Segmented
            size="small"
            value={logLevel}
            onChange={(val) => setLogLevel(val as string)}
            options={[
              { label: '全部', value: 'all' },
              { label: 'info', value: 'info' },
              { label: 'warn', value: 'warn' },
              { label: 'error', value: 'error' },
            ]}
          />
        }
      >
        <div
          ref={logContainerRef}
          style={{
            height: '100%',
            overflow: 'auto',
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
            fontSize: 12,
            background: '#1e1e2e',
            borderRadius: 8,
            padding: '8px 0',
          }}
        >
          {currentLogs
            .filter((log) => logLevel === 'all' || log.level === logLevel)
            .map((log, i) => {
              const borderColor = log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#94a3b8';
              const bgColor = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
              const tagColor = log.level === 'error' ? 'red' : log.level === 'warn' ? 'gold' : 'geekblue';

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '6px 16px',
                    borderLeft: `3px solid ${borderColor}`,
                    background: bgColor,
                    lineHeight: '1.6',
                  }}
                >
                  <Tag
                    color={tagColor}
                    style={{ margin: 0, flexShrink: 0, fontSize: 10, lineHeight: '18px', height: 20 }}
                  >
                    {log.level.toUpperCase()}
                  </Tag>
                  <Text
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: log.level === 'error' ? '#fca5a5' : log.level === 'warn' ? '#fde68a' : '#cbd5e1',
                      wordBreak: 'break-all',
                    }}
                  >
                    {log.message}
                    {log.object_key && (
                      <span style={{ display: 'block', color: '#64748b', fontSize: 11, marginTop: 1 }}>
                        {log.object_key}
                      </span>
                    )}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dayjs(log.created_at).format('HH:mm:ss')}
                  </Text>
                </div>
              );
            })}
          {currentLogs.filter((log) => logLevel === 'all' || log.level === logLevel).length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {logLevel === 'all' ? '暂无日志' : `无 ${logLevel.toUpperCase()} 级别日志`}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
