import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch,
  Space, Typography, Popconfirm, message, Select,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import client, { Connection, ConnectionForm, BucketInfo } from '../api/client';

const { Title } = Typography;

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [bucketsModalOpen, setBucketsModalOpen] = useState(false);
  const [bucketsConnId, setBucketsConnId] = useState<number | null>(null);
  const [bucketsLoading, setBucketsLoading] = useState(false);
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
    if (editing) {
      await client.put(`/connections/${editing.id}`, values);
      message.success('连接已更新');
    } else {
      await client.post('/connections', values);
      message.success('连接已创建');
    }
    setModalOpen(false);
    fetch();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>MinIO 连接管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建连接
          </Button>
        </Space>
      </div>

      <Table
        dataSource={connections}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: 'Endpoint', dataIndex: 'endpoint' },
          { title: 'Access Key', dataIndex: 'access_key' },
          {
            title: 'SSL',
            dataIndex: 'use_ssl',
            render: (v: boolean) => (v ? '是' : '否'),
          },
          { title: 'Region', dataIndex: 'region' },
          {
            title: '操作',
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

      <Modal
        title={editing ? '编辑连接' : '新建连接'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
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
          columns={[
            { title: '桶名称', dataIndex: 'name' },
            { title: '创建时间', dataIndex: 'creation_date' },
          ]}
        />
      </Modal>
    </div>
  );
}
