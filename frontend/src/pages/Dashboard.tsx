import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Progress } from 'antd';
import {
  ApiOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { MigrationTask } from '../api/client';

const { Title, Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#d9d9d9', icon: <ClockCircleOutlined />, label: '待开始' },
  running: { color: '#1677ff', icon: <SyncOutlined spin />, label: '运行中' },
  completed: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '失败' },
  cancelled: { color: '#faad14', icon: <PauseCircleOutlined />, label: '已取消' },
};

function DonutChart({ segments, total, size = 140 }: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}) {
  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text type="secondary">暂无任务</Text>
      </div>
    );
  }

  const active = segments.filter((s) => s.value > 0);
  let cumulative = 0;
  const gradients = active.map((seg) => {
    const start = cumulative;
    cumulative += seg.value / total;
    return `${seg.color} ${start * 360}deg ${cumulative * 360}deg`;
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `conic-gradient(${gradients.join(', ')})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '22%',
          width: '56%',
          height: '56%',
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>总任务</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [connections, setConnections] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      client.get('/migrations'),
      client.get('/connections'),
    ]).then(([taskRes, connRes]) => {
      setTasks(taskRes.data);
      setConnections(connRes.data.length);
    }).finally(() => setLoading(false));
  }, []);

  const counts: Record<string, number> = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  tasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const total = tasks.length;

  const donutSegments = [
    { label: '已完成', value: counts.completed, color: '#52c41a' },
    { label: '运行中', value: counts.running, color: '#1677ff' },
    { label: '失败', value: counts.failed, color: '#ff4d4f' },
    { label: '已取消', value: counts.cancelled, color: '#faad14' },
    { label: '待开始', value: counts.pending, color: '#d9d9d9' },
  ];

  return (
    <div>
      <Title level={4}>仪表盘</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderLeft: '3px solid #1677ff' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title="MinIO 连接"
              value={connections}
              prefix={<ApiOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderLeft: '3px solid #1677ff' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title="运行中"
              value={counts.running}
              prefix={<SyncOutlined spin style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderLeft: '3px solid #52c41a' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title="已完成"
              value={counts.completed}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderLeft: '3px solid #ff4d4f' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title="失败"
              value={counts.failed}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card title="任务分布" loading={loading}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart segments={donutSegments} total={total} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {donutSegments.map((seg) => (
                  <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 10, height: 10, borderRadius: '50%',
                        backgroundColor: seg.color, flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13 }}>{seg.label}</Text>
                    <Text strong style={{ fontSize: 13, marginLeft: 'auto', minWidth: 20, textAlign: 'right' }}>
                      {seg.value}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title="最近任务"
            extra={<a onClick={() => navigate('/migrations')}>查看全部</a>}
            loading={loading}
          >
            <Table
              dataSource={tasks.slice(0, 5)}
              rowKey="id"
              size="small"
              pagination={false}
              showHeader={false}
              onRow={(record) => ({
                onClick: () => navigate('/migrations'),
                style: { cursor: 'pointer' },
              })}
              columns={[
                {
                  width: 40,
                  render: (_: any, r: MigrationTask) => {
                    const cfg = statusConfig[r.status];
                    return (
                      <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>
                    );
                  },
                },
                {
                  render: (_: any, r: MigrationTask) => (
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.source_bucket} → {r.target_bucket}
                      </Text>
                    </div>
                  ),
                },
                {
                  width: 80,
                  align: 'right',
                  render: (_: any, r: MigrationTask) => {
                    const cfg = statusConfig[r.status];
                    return <Tag color={cfg.color}>{cfg.label}</Tag>;
                  },
                },
                {
                  width: 140,
                  render: (_: any, r: MigrationTask) => {
                    if (r.total_objects === 0) return <Text type="secondary">-</Text>;
                    const pct = Math.round((r.copied_objects / r.total_objects) * 100);
                    return (
                      <Progress
                        percent={pct}
                        size="small"
                        status={r.status === 'failed' ? 'exception' : r.status === 'completed' ? 'success' : 'active'}
                        format={() => `${r.copied_objects}/${r.total_objects}`}
                      />
                    );
                  },
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
