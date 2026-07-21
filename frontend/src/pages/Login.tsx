import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left brand panel */}
      <div
        style={{
          flex: '1 1 56%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          color: '#fff',
          background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 45%, #8b5cf6 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -90,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            left: -70,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '42%',
            right: '12%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 21,
            }}
          >
            M
          </div>
          <span style={{ fontWeight: 700, fontSize: 21 }}>MinMig</span>
        </div>

        {/* Hero */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <Title
            style={{
              color: '#fff',
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 18,
            }}
          >
            MinIO 数据迁移
            <br />
            高效 · 安全 · 可视化
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.75 }}>
            一站式管理你的 MinIO 桶迁移任务，实时追踪进度、查看日志，让数据流转尽在掌握。
          </Text>
        </div>

        {/* Feature stats */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 40 }}>
          {[
            { n: 'S3', l: '兼容协议' },
            { n: 'SSE', l: '端到端传输' },
            { n: '实时', l: '进度日志' },
          ].map((f) => (
            <div key={f.l}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{f.n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{f.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          flex: '1 1 44%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          padding: 32,
        }}
      >
        <div className="mm-pop" style={{ width: '100%', maxWidth: 372 }}>
          <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>
            欢迎回来 👋
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            登录以继续管理你的迁移任务
          </Text>

          <Form onFinish={onFinish} size="large" layout="vertical" style={{ marginTop: 32 }}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="请输入密码" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block loading={loading} style={{ fontWeight: 600 }}>
                登录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 28, color: '#94a3b8', fontSize: 12 }}>
            MinMig · MinIO 迁移工具
          </div>
        </div>
      </div>
    </div>
  );
}
