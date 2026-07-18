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

const statCards = [
  {
    key: 'connections',
    title: 'MinIO 连接',
    icon: <ApiOutlined />,
    gradient: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
    accent: '#1677ff',
    get: (_c: any, _t: any) => 0, // filled below
  },
];

function DonutChart({ segments, total, size = 160 }: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}) {
  if (total === 0) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          border: '12px solid #f0f0f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>暂无任务</Text>
      </div>
    );
  }

  const gap = 3; // degrees between segments
  const active = segments.filter((s) => s.value > 0);
  let cumulative = 0;
  const slices: { color: string; from: number; to: number }[] = [];

  active.forEach((seg) => {
    const start = cumulative + (slices.length > 0 ? gap : 0);
    cumulative += seg.value / total;
    const end = cumulative * 360;
    slices.push({ color: seg.color, from: start, to: end });
  });

  const gradStops = slices.map((s) => `${s.color} ${s.from}deg ${s.to}deg`).join(', ');
  const ring = size * 0.74;
  const ringOffset = (size - ring) / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: `conic-gradient(${gradStops})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: ringOffset, left: ringOffset,
          width: ring, height: ring,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#1f1f1f' }}>{total}</div>
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
    { label: '待开始', value: counts.pending, color: '#e0e0e0' },
  ];

  const cards = [
    {
      title: 'MinIO 连接',
      value: connections,
      icon: <ApiOutlined style={{ color: '#fff', fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
    },
    {
      title: '运行中',
      value: counts.running,
      icon: <SyncOutlined spin style={{ color: '#fff', fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #13c2c2 0%, #5cdbd3 100%)',
    },
    {
      title: '已完成',
      value: counts.completed,
      icon: <CheckCircleOutlined style={{ color: '#fff', fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
    },
    {
      title: '失败',
      value: counts.failed,
      icon: <CloseCircleOutlined style={{ color: '#fff', fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>仪表盘</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {cards.map((c) => (
          <Col key={c.title} xs={12} sm={6}>
            <Card
              styles={{ body: { padding: 0 } }}
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div
                  style={{
                    width: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: c.gradient,
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ flex: 1, padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#1f1f1f' }}>
                    {c.value}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={9}>
          <Card
            title="任务分布"
            loading={loading}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '12px 0' }}>
              <DonutChart segments={donutSegments} total={total} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {donutSegments.map((seg) => (
                  <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 10, height: 10, borderRadius: 3,
                        backgroundColor: seg.color, flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13, minWidth: 48 }}>{seg.label}</Text>
                    <Text strong style={{ fontSize: 14, marginLeft: 'auto', minWidth: 24, textAlign: 'right' }}>
                      {seg.value}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={15}>
          <Card
            title="最近任务"
            extra={<a onClick={() => navigate('/migrations')} style={{ fontWeight: 500 }}>查看全部 →</a>}
            loading={loading}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: 'none' }}
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
                  width: 36,
                  render: (_: any, r: MigrationTask) => {
                    const cfg = statusConfig[r.status];
                    return <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>;
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
                  width: 76,
                  align: 'right',
                  render: (_: any, r: MigrationTask) => {
                    const cfg = statusConfig[r.status];
                    return <Tag color={cfg.color} style={{ borderRadius: 4 }}>{cfg.label}</Tag>;
                  },
                },
                {
                  width: 130,
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
            {tasks.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
                还没有迁移任务，去创建一个吧
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
