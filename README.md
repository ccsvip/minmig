# MinMig - MinIO 桶迁移工具

MinIO 桶数据迁移（复制）工具，支持跨桶和跨集群的数据复制，提供 Web 管理界面。

## 架构

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser  │ ──▶ │  Nginx   │ ──▶ │ Backend  │ ──▶ MinIO
│  :80      │     │ (front)  │     │ :8000    │
└──────────┘     └──────────┘     └──────────┘
                        │                │
                        ▼                ▼
                  React SPA         SQLite DB
```

- **前端**: Nginx 容器 serve React SPA，反向代理 `/api/` 到后端
- **后端**: FastAPI + SQLAlchemy + SQLite
- **部署**: 全部通过 `docker-compose.yml` 管理

## 快速开始

```bash
# 1. 复制环境变量配置
cp .env.example .env
# 编辑 .env，配置 JWT_SECRET_KEY 和 ENCRYPTION_KEY

# 2. 启动所有服务
docker-compose up --build

# 3. 访问
# http://localhost:80     ← Web UI
# 默认登录: admin / admin123456
```

## 开发

### 后端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev       # 开发模式（Vite 代理 /api/ → localhost:8000）
npm run build     # 构建生产版本
```
