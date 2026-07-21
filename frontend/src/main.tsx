import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          colorInfo: '#6366f1',
          colorLink: '#6366f1',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 10,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          colorBgLayout: '#f6f7fb',
          colorText: '#1e293b',
          colorTextSecondary: '#64748b',
          colorBorder: '#e6e8ee',
          controlHeight: 36,
          controlHeightLG: 44,
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff',
            bodyBg: '#f6f7fb',
            headerHeight: 60,
          },
          Menu: {
            itemSelectedBg: 'rgba(99,102,241,0.10)',
            itemSelectedColor: '#4f46e5',
            itemHoverBg: 'rgba(99,102,241,0.06)',
            itemBorderRadius: 10,
            itemMarginInline: 12,
            itemHeight: 42,
          },
          Card: {
            borderRadiusLG: 14,
            boxShadowTertiary:
              '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)',
          },
          Button: {
            controlHeight: 36,
            controlHeightLG: 44,
            fontWeight: 500,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#64748b',
            rowHoverBg: '#f8fafc',
            borderColor: '#eef0f4',
          },
          Modal: {
            borderRadiusLG: 16,
          },
          Input: {
            controlHeight: 36,
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
