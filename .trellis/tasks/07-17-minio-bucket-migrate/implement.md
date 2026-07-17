# MinIO 桶迁移工具 — 执行计划

## 执行顺序

### Phase 1: 项目脚手架

- [ ] 1.1 创建 `backend/` 目录结构和基础配置
  - `backend/app/__init__.py`
  - `backend/app/main.py` — FastAPI app 入口
  - `backend/app/config.py` — .env 配置加载
  - `backend/app/database.py` — SQLAlchemy 引擎
  - `backend/requirements.txt`
  - `backend/.env.example`

- [ ] 1.2 创建 `frontend/` 项目（Vite + React + TS）
  - 使用 Vite 初始化 React + TypeScript 项目
  - 安装 antd、axios、react-router-dom
  - 基础目录结构

- [ ] 1.3 Docker 配置
  - `backend/Dockerfile`
  - `docker-compose.yml`（单容器，前后端合一）

### Phase 2: 后端核心

- [ ] 2.1 数据模型（SQLAlchemy）
  - User、Connection、Task、TaskLog
  - 自动建表

- [ ] 2.2 认证系统
  - POST `/api/auth/login` — JWT 登录
  - PUT `/api/auth/password` — 修改密码
  - JWT 中间件（依赖注入）
  - 默认用户初始化（从 .env 读取）

- [ ] 2.3 MinIO 连接管理 API
  - CRUD: connections
  - GET `/api/connections/{id}/buckets` — 列出桶
  - Secret Key Fernet 加密存储

- [ ] 2.4 MinIO 服务层
  - minio-py 客户端封装
  - `list_objects(bucket)` — 列举对象
  - `copy_object(src_bucket, obj_key, dest_client, dest_bucket)` — 复制对象
  - 错误处理与重试

- [ ] 2.5 迁移任务管理 API
  - CRUD: migrations
  - POST `/api/migrations/{id}/start` — 后台启动迁移
  - POST `/api/migrations/{id}/cancel` — 取消
  - GET `/api/migrations/{id}/progress` — SSE 进度推送

- [ ] 2.6 迁移执行引擎
  - 后台任务（`asyncio.create_task`）
  - 对象列表获取 → 逐个复制 → 进度更新
  - 并发控制（Semaphore）
  - 日志记录
  - 取消支持（`asyncio.Event`）

### Phase 3: 前端

- [ ] 3.1 项目基础配置
  - Vite proxy 配置（开发时代理到后端 8000）
  - Axios 实例 + 拦截器（自动带 token）

- [ ] 3.2 登录页面
  - 表单（用户名 + 密码）
  - 登录成功 → 存储 token → 跳转首页

- [ ] 3.3 布局与路由
  - 侧边栏导航（Ant Design Layout）
  - 路由守卫（未登录跳转登录页）
  - 路由：Dashboard / Connections / Migrations / Settings

- [ ] 3.4 连接管理页面
  - 连接列表（表格）
  - 新建/编辑连接（弹窗表单）
  - 删除确认

- [ ] 3.5 迁移任务页面
  - 任务列表（表格，状态标签）
  - 新建任务（选择源/目标连接 + 桶）
  - 启动 / 取消 / 删除操作
  - 任务详情展开（日志 + 进度条）

- [ ] 3.6 任务进度实时更新
  - EventSource（SSE）监听进度
  - Ant Design Progress 实时展示

- [ ] 3.7 设置页面
  - 密码修改表单

### Phase 4: 集成与部署

- [ ] 4.1 后端 serve 前端静态文件
  - 构建前端 → 复制到 `backend/static/`
  - FastAPI 挂载 `StaticFiles` 和 SPA 回退

- [ ] 4.2 Docker 构建
  - 多阶段构建（第一阶段构建前端，第二阶段运行后端）
  - volume 挂载 SQLite 数据
  - .env 配置说明

- [ ] 4.3 端到端验证
  - `docker-compose up` 启动
  - 登录 → 添加连接 → 创建任务 → 执行迁移

## 验证命令

```bash
# 启动后端（开发）
cd backend && uvicorn app.main:app --reload --port 8000

# 启动前端（开发）
cd frontend && npm run dev

# 构建前端
cd frontend && npm run build

# Docker 构建启动
docker-compose up --build

# 访问
# http://localhost:8000
```

## 风险点与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| 大量对象导致 list_objects 慢 | 任务卡在"准备中" | 使用分页列举，分批处理 |
| 复制中途出错 | 部分完成 | 记录错误日志，跳过继续 |
| Secret Key 加密密钥丢失 | 无法解密连接 | 密钥存 .env，备份说明 |
| SSE 连接断开 | 前端进度丢失 | 支持重新连接，补充进度查询接口 |

## 关键文件与修改点

- `backend/app/main.py` — 应用入口，路由挂载，静态文件
- `backend/app/services/minio_service.py` — MinIO 客户端封装
- `backend/app/services/migration_service.py` — 迁移核心逻辑
- `frontend/src/api/client.ts` — API 客户端配置
- `docker-compose.yml` — 部署编排
