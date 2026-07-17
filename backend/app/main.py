from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.api.auth import router as auth_router
from app.api.connections import router as connections_router
from app.api.buckets import router as buckets_router
from app.api.migrations import router as migrations_router
from app.services.auth_service import create_default_user

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await create_default_user()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(connections_router, prefix="/api/connections", tags=["connections"])
app.include_router(buckets_router, prefix="/api/buckets", tags=["buckets"])
app.include_router(migrations_router, prefix="/api/migrations", tags=["migrations"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
