import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Typography, Space, Avatar } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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

const pageMeta: Record<string, { title: string; desc: string }> = {
  '/': { title: '仪表盘', desc: '迁移任务总览与统计数据' },
  '/connections': { title: '连接管理', desc: '管理你的 MinIO 服务连接配置' },
  '/migrations': { title: '迁移任务', desc: '创建并跟踪数据迁移进度' },
  '/settings': { title: '设置', desc: '账户安全与系统偏好' },
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey =
    location.pathname === '/' ? '/' : `/${location.pathname.split('/')[1]}`;
  const current = pageMeta[activeKey] || pageMeta['/'];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        className="mm-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={236}
        collapsedWidth={76}
        trigger={null}
        style={{
          borderRight: '1px solid #eef0f4',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {/* Brand */}
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '0 18px' : '0 20px',
            borderBottom: '1px solid #eef0f4',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 17,
              flexShrink: 0,
              boxShadow: '0 6px 16px rgba(99,102,241,0.35)',
            }}
          >
            M
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>MinMig</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>MinIO 迁移工具</span>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', padding: '10px 0', background: 'transparent' }}
        />

        {/* Collapse trigger pinned at bottom */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #eef0f4',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#64748b' }}
          />
        </div>
      </Sider>

      <AntLayout>
        <Header
          style={{
            padding: '0 28px',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eef0f4',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 60,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              {current.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>{current.desc}</Text>
          </div>

          <Space size={12} align="center">
            <Avatar
              size={34}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              icon={<UserOutlined />}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <Text strong style={{ fontSize: 13 }}>
                {username || 'admin'}
              </Text>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>管理员</Text>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
              danger
            />
          </Space>
        </Header>

        <Content style={{ margin: 0, padding: 28 }}>
          <div className="mm-page" style={{ minHeight: 'calc(100vh - 60px - 56px)' }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
