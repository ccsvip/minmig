import asyncio
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.config import get_settings
from app.models.task import Task, TaskLog
from app.schemas.task import TaskResponse, TaskCreate, TaskLogResponse
from app.utils.security import get_current_user
from app.services.migration_service import run_migration, cancel_migration, subscribe, unsubscribe

router = APIRouter()
settings = get_settings()


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    task = Task(
        name=data.name,
        source_conn_id=data.source_conn_id,
        source_bucket=data.source_bucket,
        target_conn_id=data.target_conn_id,
        target_bucket=data.target_bucket,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/start")
async def start_task(
    task_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status not in ("pending", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot start task with status: {task.status}")

    semaphore = asyncio.Semaphore(settings.migration_concurrency)
    asyncio.create_task(run_migration(task_id, semaphore, settings.migration_concurrency))
    return {"message": "Task started"}


@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: int,
    _user: dict = Depends(get_current_user),
):
    if cancel_migration(task_id):
        return {"message": "Task cancellation requested"}
    raise HTTPException(status_code=400, detail="Task is not running")


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted"}


@router.get("/{task_id}/logs", response_model=List[TaskLogResponse])
async def get_task_logs(
    task_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskLog).where(TaskLog.task_id == task_id).order_by(TaskLog.created_at)
    )
    return result.scalars().all()


@router.get("/{task_id}/progress")
async def task_progress(
    task_id: int,
    request: Request,
    _user: dict = Depends(get_current_user),
):
    q = subscribe(task_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(q.get(), timeout=30)
                    if data.get("status") == "__done__":
                        break
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: { { 'status': 'keepalive', 'task_id': task_id } }\n\n"
        finally:
            unsubscribe(task_id, q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
