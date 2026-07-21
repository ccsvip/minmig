import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Typography,
  Popconfirm,
  message,
  Select,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import client, { Connection, ConnectionForm, BucketInfo } from '../api/client';

const { Text } = Typography;

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [bucketsModalOpen, setBucketsModalOpen] = useState(false);
  const [bucketsConnId, setBucketsConnId] = useState<number | null>(null);
  const [bucketsLoading, setBucketsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await client.get('/connections');
      setConnections(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (conn: Connection) => {
    setEditing(conn);
    form.setFieldsValue(conn);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await client.put(`/connections/${editing.id}`, values);
        message.success('连接已更新');
      } else {
        await client.post('/connections', values);
        message.success('连接已创建');
      }
      setModalOpen(false);
      fetch();
    } catch {
      message.error('操作失败，请检查网络或后端服务');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await client.delete(`/connections/${id}`);
    message.success('连接已删除');
    fetch();
  };

  const viewBuckets = async (connId: number) => {
    setBucketsConnId(connId);
    setBucketsLoading(true);
    setBucketsModalOpen(true);
    try {
      const res = await client.get(`/buckets?conn_id=${connId}`);
      setBuckets(res.data);
    } finally {
      setBucketsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建连接
          </Button>
        </Space>
      </div>

      {connections.length === 0 && !loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '72px 24px',
            background: '#fff',
            borderRadius: 14,
            border: '1px dashed #e2e8f0',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(99,102,241,0.1)',
              color: '#6366f1',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 16,
            }}
          >
            <ApiOutlined />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
            还没有 MinIO 连接
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            新建一个连接以开始管理你的桶
          </Text>
          <div style={{ marginTop: 20 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建连接
            </Button>
          </div>
        </div>
      ) : (
        <Table
          className="mm-table"
          dataSource={connections}
          rowKey="id"
          loading={loading}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              render: (v: string) => <Text strong>{v}</Text>,
            },
            { title: 'Endpoint', dataIndex: 'endpoint' },
            { title: 'Access Key', dataIndex: 'access_key' },
            {
              title: 'SSL',
              dataIndex: 'use_ssl',
              render: (v: boolean) =>
                v ? <Tag color="green" style={{ borderRadius: 6, border: 'none' }}>是</Tag> : <Text type="secondary">否</Text>,
            },
            { title: 'Region', dataIndex: 'region' },
            {
              title: '操作',
              align: 'right',
              render: (_: any, record: Connection) => (
                <Space>
                  <Button size="small" onClick={() => viewBuckets(record.id)}>
                    查看桶
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        title={editing ? '编辑连接' : '新建连接'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="连接名称" rules={[{ required: true }]}>
            <Input placeholder="例如：生产环境" />
          </Form.Item>
          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true }]}>
            <Input placeholder="例如：play.min.io" />
          </Form.Item>
          <Form.Item name="access_key" label="Access Key" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="secret_key"
            label="Secret Key"
            rules={editing ? [] : [{ required: true }]}
          >
            <Input.Password placeholder={editing ? '留空则不修改' : ''} />
          </Form.Item>
          <Form.Item name="use_ssl" label="使用 SSL" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item name="region" label="Region">
            <Input placeholder="us-east-1" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="桶列表"
        open={bucketsModalOpen}
        onCancel={() => setBucketsModalOpen(false)}
        footer={null}
      >
        <Table
          dataSource={buckets}
          rowKey="name"
          loading={bucketsLoading}
          pagination={false}
          style={{ marginTop: 8 }}
          columns={[
            { title: '桶名称', dataIndex: 'name' },
            { title: '创建时间', dataIndex: 'creation_date' },
          ]}
        />
      </Modal>
    </div>
  );
}
