import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography } from 'antd';
import {
  ApiOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { MigrationTask } from '../api/client';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [connections, setConnections] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/migrations').then((res) => setTasks(res.data));
    client.get('/connections').then((res) => setConnections(res.data.length));
  }, []);

  const running = tasks.filter((t) => t.status === 'running').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div>
      <Title level={4}>仪表盘</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="连接数" value={connections} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="运行中" value={running} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="失败" value={failed} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Title level={5}>最近任务</Title>
      <Table
        dataSource={tasks.slice(0, 10)}
        rowKey="id"
        size="small"
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate('/migrations'),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: '任务名称', dataIndex: 'name' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: string) => <Tag color={statusColors[s]}>{s}</Tag>,
          },
          { title: '源桶', dataIndex: 'source_bucket' },
          { title: '目标桶', dataIndex: 'target_bucket' },
          {
            title: '进度',
            render: (_: any, r: MigrationTask) =>
              r.total_objects > 0
                ? `${r.copied_objects}/${r.total_objects}`
                : '-',
          },
        ]}
      />
    </div>
  );
}
