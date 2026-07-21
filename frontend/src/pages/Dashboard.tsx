import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Progress } from 'antd';
import {
  ApiOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { MigrationTask } from '../api/client';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#94a3b8', icon: <ClockCircleOutlined />, label: '待开始' },
  running: { color: '#6366f1', icon: <SyncOutlined spin />, label: '运行中' },
  completed: { color: '#10b981', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: '#ef4444', icon: <CloseCircleOutlined />, label: '失败' },
  cancelled: { color: '#f59e0b', icon: <PauseCircleOutlined />, label: '已取消' },
};

function DonutChart({
  segments,
  total,
  size = 168,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}) {
  if (total === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '14px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          暂无任务
        </Text>
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
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `conic-gradient(${gradStops})`,
          filter: 'drop-shadow(0 4px 12px rgba(15,23,42,0.08))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: ringOffset,
          left: ringOffset,
          width: ring,
          height: ring,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, color: '#1e293b' }}>
          {total}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>总任务</div>
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
    Promise.all([client.get('/migrations'), client.get('/connections')])
      .then(([taskRes, connRes]) => {
        setTasks(taskRes.data);
        setConnections(connRes.data.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const counts: Record<string, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  tasks.forEach((t) => {
    counts[t.status] = (counts[t.status] || 0) + 1;
  });
  const total = tasks.length;

  const donutSegments = [
    { label: '已完成', value: counts.completed, color: '#10b981' },
    { label: '运行中', value: counts.running, color: '#6366f1' },
    { label: '失败', value: counts.failed, color: '#ef4444' },
    { label: '已取消', value: counts.cancelled, color: '#f59e0b' },
    { label: '待开始', value: counts.pending, color: '#cbd5e1' },
  ];

  const cards = [
    {
      title: 'MinIO 连接',
      value: connections,
      icon: <ApiOutlined />,
      color: '#6366f1',
      tint: 'rgba(99,102,241,0.12)',
    },
    {
      title: '运行中',
      value: counts.running,
      icon: <SyncOutlined spin />,
      color: '#0ea5e9',
      tint: 'rgba(14,165,233,0.12)',
    },
    {
      title: '已完成',
      value: counts.completed,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
      tint: 'rgba(16,185,129,0.12)',
    },
    {
      title: '失败',
      value: counts.failed,
      icon: <CloseCircleOutlined />,
      color: '#ef4444',
      tint: 'rgba(239,68,68,0.12)',
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="mm-stagger">
        {cards.map((c) => (
          <Col key={c.title} xs={12} sm={12} md={6}>
            <Card
              className="mm-card mm-card-hover"
              styles={{ body: { padding: 22 } }}
              style={{ height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{c.title}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                    {c.value}
                  </div>
                </div>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: c.tint,
                    color: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 21,
                  }}
                >
                  {c.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={9}>
          <Card
            title={<span style={{ fontWeight: 700 }}>任务分布</span>}
            loading={loading}
            className="mm-card"
            style={{ height: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 32,
                padding: '12px 0',
              }}
            >
              <DonutChart segments={donutSegments} total={total} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {donutSegments.map((seg) => (
                  <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        backgroundColor: seg.color,
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 13, minWidth: 48, color: '#475569' }}>{seg.label}</Text>
                    <Text
                      strong
                      style={{ fontSize: 14, marginLeft: 'auto', minWidth: 24, textAlign: 'right' }}
                    >
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
            title={<span style={{ fontWeight: 700 }}>最近任务</span>}
            extra={
              <a
                onClick={() => navigate('/migrations')}
                style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                查看全部 <ArrowRightOutlined style={{ fontSize: 11 }} />
              </a>
            }
            loading={loading}
            className="mm-card"
            style={{ height: '100%' }}
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
                    return <span style={{ color: cfg.color, fontSize: 17 }}>{cfg.icon}</span>;
                  },
                },
                {
                  render: (_: any, r: MigrationTask) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.name}</div>
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
                    return (
                      <Tag color={cfg.color} style={{ borderRadius: 6, border: 'none' }}>
                        {cfg.label}
                      </Tag>
                    );
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
                        status={
                          r.status === 'failed'
                            ? 'exception'
                            : r.status === 'completed'
                            ? 'success'
                            : 'active'
                        }
                        format={() => `${r.copied_objects}/${r.total_objects}`}
                      />
                    );
                  },
                },
              ]}
            />
            {tasks.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
                还没有迁移任务，去创建一个吧
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
