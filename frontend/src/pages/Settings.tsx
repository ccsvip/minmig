import { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title, Text } = Typography;

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { old_password: string; new_password: string; confirm: string }) => {
    if (values.new_password !== values.confirm) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await client.put('/auth/password', {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('密码已修改');
      form.resetFields();
    } catch {
      message.error('旧密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <Card className="mm-card" styles={{ body: { padding: 0 } }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '22px 28px',
            borderBottom: '1px solid #eef0f4',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(99,102,241,0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
              修改密码
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              定期更新密码以保障账户安全
            </Text>
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 420 }}>
            <Form.Item
              name="old_password"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="确认密码"
              dependencies={['new_password']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
}
