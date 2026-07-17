# MinIO 桶迁移工具 — 技术设计

## 架构概览

```
┌─────────────────────────────────────────────┐
│                   Docker                     │
│  ┌──────────────────────────────────────┐   │
│  │          FastAPI Server (8000)        │   │
│  │  ┌────────────┐  ┌────────────────┐  │   │
│  │  │ Auth API   │  │ Migration API  │  │   │
│  │  │ /api/auth  │  │ /api/migrate   │  │   │
│  │  └────────────┘  └────────────────┘  │   │
│  │  ┌────────────┐  ┌────────────────┐  │   │
│  │  │ Connections│  │ MinIO Client   │  │   │
│  │  │ API        │  │ (minio-py)     │  │   │
│  │  │ /api/conns │  └────────────────┘  │   │
│  │  └────────────┘                      │   │
│  │  ┌────────────────────────────────┐   │   │
│  │  │    SQLite (data.db)            │   │   │
│  │  └────────────────────────────────┘   │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │   React SPA (served by FastAPI)      │   │
│  │   / → index.html → React Router     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 目录结构

```
MinMig/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置（.env 加载）
│   │   ├── database.py          # SQLAlchemy 引擎与会话
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # 用户模型
│   │   │   ├── connection.py    # MinIO 连接配置模型
│   │   │   └── task.py          # 迁移任务模型
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # 用户 Pydantic 模型
│   │   │   ├── connection.py    # 连接 Pydantic 模型
│   │   │   └── task.py          # 任务 Pydantic 模型
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # 登录/密码修改
│   │   │   ├── connections.py   # 连接 CRUD
│   │   │   ├── buckets.py       # 桶列表浏览
│   │   │   └── migrations.py    # 迁移任务管理
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py      # 认证逻辑
│   │   │   ├── minio_service.py     # MinIO 交互
│   │   │   └── migration_service.py # 迁移执行引擎
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── security.py     # JWT、密码哈希
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── api/
│   │   │   └── client.ts       # Axios 客户端
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Connections.tsx
│   │   │   ├── Migrations.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── TaskProgress.tsx
│   │   │   └── ConnectionForm.tsx
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       └── useTasks.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 数据模型

### User（用户）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | |
| username | String, unique | 用户名 |
| password_hash | String | bcrypt 哈希 |
| created_at | DateTime | |

### Connection（MinIO 连接配置）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | |
| name | String | 连接名称（如"生产环境"）|
| endpoint | String | MinIO endpoint URL |
| access_key | String | Access Key |
| secret_key | String | Secret Key（加密存储）|
| use_ssl | Boolean | 是否使用 HTTPS |
| region | String, optional | Region（默认 us-east-1）|
| created_at | DateTime | |
| updated_at | DateTime | |

### Task（迁移任务）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | |
| name | String | 任务名称 |
| source_conn_id | Integer, FK | 源连接 |
| source_bucket | String | 源桶名 |
| target_conn_id | Integer, FK | 目标连接 |
| target_bucket | String | 目标桶名 |
| status | String | pending/running/completed/failed/cancelled |
| total_objects | Integer | 总对象数（运行后更新）|
| copied_objects | Integer | 已复制数 |
| total_bytes | Integer | 总字节数 |
| copied_bytes | Integer | 已复制字节数 |
| error_message | String, nullable | 错误信息 |
| started_at | DateTime, nullable | |
| completed_at | DateTime, nullable | |
| created_at | DateTime | |
| updated_at | DateTime | |

### TaskLog（任务日志）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | |
| task_id | Integer, FK | |
| level | String | info/warn/error |
| message | String | 日志内容 |
| object_key | String, nullable | 相关对象键 |
| created_at | DateTime | |

## API 路由设计

### Auth
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录，返回 JWT |
| PUT | /api/auth/password | 修改密码（需认证）|

### Connections
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/connections | 列表 |
| POST | /api/connections | 创建 |
| GET | /api/connections/{id} | 详情 |
| PUT | /api/connections/{id} | 更新 |
| DELETE | /api/connections/{id} | 删除 |
| GET | /api/connections/{id}/buckets | 列出该连接的桶 |

### Migrations
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/migrations | 任务列表 |
| POST | /api/migrations | 创建任务 |
| GET | /api/migrations/{id} | 任务详情 |
| POST | /api/migrations/{id}/start | 启动 |
| POST | /api/migrations/{id}/cancel | 取消 |
| DELETE | /api/migrations/{id} | 删除 |
| GET | /api/migrations/{id}/logs | 任务日志 |
| GET | /api/migrations/{id}/progress | SSE 进度推送 |

## 迁移执行流程

1. 用户创建迁移任务（指定源/目标连接和桶）
2. 用户点击"开始迁移"，状态 → running
3. 后端启动后台任务：
   a. 调用 `list_objects` 获取源桶对象列表，更新 total_objects/total_bytes
   b. 逐个复制对象到目标桶，更新 copied_objects/copied_bytes
   c. 每个对象复制完成后记录日志
   d. 通过 SSE 推送进度到前端
4. 全部完成 → status = completed
5. 中途出错 → 记录 error_message，继续下一个对象
6. 用户取消 → status = cancelled

## 并发控制

- 使用 `asyncio.Semaphore` 控制并发复制数（默认 10，可通过环境变量配置）
- 每个任务独立运行，互不干扰

## 安全设计

- 密码使用 bcrypt 哈希存储
- MinIO Secret Key 使用 Fernet 对称加密存储（密钥来自环境变量）
- JWT 鉴权，token 有效期 24 小时
- 所有 API（除登录外）需携带 `Authorization: Bearer <token>`

## 技术依赖

### Backend
- fastapi
- uvicorn
- sqlalchemy + aiosqlite
- minio (minio-py)
- python-jose (JWT)
- passlib[bcrypt]
- python-multipart
- pydantic
- pydantic-settings
- cryptography (Fernet)
- python-dotenv

### Frontend
- react + react-router-dom
- typescript
- antd + @ant-design/icons
- axios
- dayjs

## Docker 部署

```yaml
# docker-compose.yml 设计
services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data       # SQLite 数据持久化
    env_file:
      - .env
```

单容器部署：FastAPI 同时 serve 后端 API 和前端静态文件。
