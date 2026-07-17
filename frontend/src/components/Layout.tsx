import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, theme, Typography, Space } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/connections', icon: <ApiOutlined />, label: '连接管理' },
  { key: '/migrations', icon: <DatabaseOutlined />, label: '迁移任务' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/connections': '连接管理',
  '/migrations': '迁移任务',
  '/settings': '设置',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ borderRight: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div
          style={{
            height: 52,
            margin: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: collapsed ? 0 : 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff, #69b1ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            M
          </div>
          {!collapsed && (
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 17 }}>
              MinMig
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname === '/' ? '/' : `/${location.pathname.split('/')[1]}`]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            height: 52,
          }}
        >
          <Space>
            <UserOutlined style={{ color: '#1677ff' }} />
            <Text strong>{username || 'admin'}</Text>
          </Space>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            danger
          >
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 20 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
