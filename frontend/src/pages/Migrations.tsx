import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag,
  Space, Typography, Popconfirm, message, Progress, Drawer, List,
} from 'antd';
import {
  PlusOutlined, PlayCircleOutlined, StopOutlined,
  DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import client, { MigrationTask, TaskForm, Connection, TaskLog } from '../api/client';
import { useTasks } from '../hooks/useTasks';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const statusLabels: Record<string, string> = {
  pending: '待开始',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

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
    const res = await client.get(`/migrations/${taskId}/logs`);
    setCurrentLogs(res.data);
    setLogsDrawerOpen(true);
  };

  const handleSubmitForm = async () => {
    const values = await form.validateFields();
    await client.post('/migrations', values);
    message.success('迁移任务已创建');
    setModalOpen(false);
    fetch();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>迁移任务</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建任务
          </Button>
        </Space>
      </div>

      <Table
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '任务名称', dataIndex: 'name' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
          },
          { title: '源桶', dataIndex: 'source_bucket' },
          { title: '目标桶', dataIndex: 'target_bucket' },
          {
            title: '进度',
            render: (_: any, r: MigrationTask) => {
              const p = progressMap[r.id];
              const copied = p?.copied_objects ?? r.copied_objects;
              const total = p?.total_objects ?? r.total_objects;
              if (total === 0) return <Text type="secondary">等待中</Text>;
              const percent = Math.round((copied / total) * 100);
              return (
                <Progress
                  percent={percent}
                  size="small"
                  format={() => `${copied}/${total}`}
                  style={{ width: 180 }}
                />
              );
            },
          },
          {
            title: '操作',
            width: 260,
            render: (_: any, record: MigrationTask) => (
              <Space>
                {record.status === 'pending' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStart(record.id)}
                  >
                    启动
                  </Button>
                )}
                {record.status === 'running' && (
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => handleCancel(record.id)}
                  >
                    取消
                  </Button>
                )}
                <Button size="small" onClick={() => viewLogs(record.id)}>
                  日志
                </Button>
                {['completed', 'failed', 'cancelled'].includes(record.status) && (
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建迁移任务"
        open={modalOpen}
        onOk={handleSubmitForm}
        onCancel={() => setModalOpen(false)}
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
        title={`任务日志 #${currentTaskId}`}
        open={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        width={500}
      >
        <List
          dataSource={currentLogs}
          renderItem={(log: TaskLog) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'orange' : 'blue'}>
                      {log.level}
                    </Tag>
                    <Text code>{log.created_at}</Text>
                  </Space>
                }
                description={
                  <div>
                    <div>{log.message}</div>
                    {log.object_key && <Text type="secondary" code>{log.object_key}</Text>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
