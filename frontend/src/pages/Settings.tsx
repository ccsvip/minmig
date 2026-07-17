import { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import client from '../api/client';

const { Title } = Typography;

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
    <div>
      <Title level={4}>设置</Title>
      <Card title="修改密码" style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password />
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
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
