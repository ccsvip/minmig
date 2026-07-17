import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.connection import Connection as ConnectionModel
from app.models.task import Task, TaskLog
from app.services.minio_service import get_minio_client, list_objects, copy_object
from app.utils.security import decrypt_secret

logger = logging.getLogger(__name__)

# Active tasks: task_id -> asyncio.Event for cancellation
_active_tasks: dict[int, asyncio.Event] = {}

# SSE subscribers: task_id -> list of asyncio.Queue
_sse_subscribers: dict[int, list[asyncio.Queue]] = {}


async def notify_progress(task_id: int, data: dict):
    """Push progress data to all SSE subscribers for this task."""
    if task_id in _sse_subscribers:
        for queue in _sse_subscribers[task_id]:
            await queue.put(data)


def subscribe(task_id: int) -> asyncio.Queue:
    if task_id not in _sse_subscribers:
        _sse_subscribers[task_id] = []
    q: asyncio.Queue = asyncio.Queue()
    _sse_subscribers[task_id].append(q)
    return q


def unsubscribe(task_id: int, q: asyncio.Queue):
    if task_id in _sse_subscribers:
        _sse_subscribers[task_id].remove(q)
        if not _sse_subscribers[task_id]:
            del _sse_subscribers[task_id]


async def add_log(db: AsyncSession, task_id: int, level: str, message: str, object_key: str = None):
    log = TaskLog(task_id=task_id, level=level, message=message, object_key=object_key)
    db.add(log)
    await db.commit()


async def run_migration(task_id: int, semaphore: asyncio.Semaphore, concurrency: int):
    """Run the migration task in background."""
    cancel_event = asyncio.Event()
    _active_tasks[task_id] = cancel_event

    try:
        async with async_session_factory() as db:
            # Load task
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                return

            # Load connections
            src_conn_result = await db.execute(select(ConnectionModel).where(ConnectionModel.id == task.source_conn_id))
            src_conn = src_conn_result.scalar_one_or_none()
            tgt_conn_result = await db.execute(select(ConnectionModel).where(ConnectionModel.id == task.target_conn_id))
            tgt_conn = tgt_conn_result.scalar_one_or_none()

            if not src_conn or not tgt_conn:
                task.status = "failed"
                task.error_message = "Source or target connection not found"
                await db.commit()
                return

            # Create MinIO clients
            src_secret = decrypt_secret(src_conn.secret_key)
            tgt_secret = decrypt_secret(tgt_conn.secret_key)
            
            # Debug logging
            await add_log(db, task_id, "info", f"Source connection: {src_conn.endpoint}, Access Key: {src_conn.access_key}")
            await add_log(db, task_id, "info", f"Target connection: {tgt_conn.endpoint}, Access Key: {tgt_conn.access_key}")
            
            src_client = get_minio_client(
                src_conn.endpoint, src_conn.access_key,
                src_secret, src_conn.use_ssl, src_conn.region,
            )
            tgt_client = get_minio_client(
                tgt_conn.endpoint, tgt_conn.access_key,
                tgt_secret, tgt_conn.use_ssl, tgt_conn.region,
            )

            # Update task status
            task.status = "running"
            task.started_at = datetime.now(timezone.utc)
            await db.commit()
            await notify_progress(task_id, {
                "task_id": task_id, "status": "running",
                "copied_objects": 0, "total_objects": 0,
                "copied_bytes": 0, "total_bytes": 0, "message": "Starting migration...",
            })

            # List objects
            await add_log(db, task_id, "info", f"Listing objects from {task.source_bucket}...")
            objects = await asyncio.to_thread(list_objects, src_client, task.source_bucket)
            total = len(objects)
            total_bytes = sum(o["size"] for o in objects)
            task.total_objects = total
            task.total_bytes = total_bytes
            await db.commit()

            await notify_progress(task_id, {
                "task_id": task_id, "status": "running",
                "copied_objects": 0, "total_objects": total,
                "copied_bytes": 0, "total_bytes": total_bytes,
                "message": f"Found {total} objects to copy",
            })
            await add_log(db, task_id, "info", f"Found {total} objects ({total_bytes} bytes)")

            # Copy objects concurrently
            copied = 0
            copied_bytes = 0
            errors = 0

            async def copy_one(obj: dict) -> tuple[bool, str, int, str]:
                nonlocal copied, copied_bytes, errors
                if cancel_event.is_set():
                    return False, "", 0, ""
                async with semaphore:
                    success, error_msg = await asyncio.to_thread(
                        copy_object, src_client, task.source_bucket,
                        obj["key"], tgt_client, task.target_bucket,
                    )
                    if success:
                        return True, obj["key"], obj["size"], ""
                    else:
                        return False, obj["key"], 0, error_msg

            # Process in batches
            batch_size = concurrency * 2
            for i in range(0, total, batch_size):
                if cancel_event.is_set():
                    break
                batch = objects[i:i + batch_size]
                results = await asyncio.gather(*[copy_one(obj) for obj in batch])

                for success, key, size, error_msg in results:
                    if cancel_event.is_set():
                        break
                    if success:
                        copied += 1
                        copied_bytes += size
                    else:
                        errors += 1
                        error_detail = f"Failed to copy: {key}"
                        if error_msg:
                            error_detail += f" - Error: {error_msg}"
                        await add_log(db, task_id, "error", error_detail, key)

                task.copied_objects = copied
                task.copied_bytes = copied_bytes
                await db.commit()

                await notify_progress(task_id, {
                    "task_id": task_id, "status": "running",
                    "copied_objects": copied, "total_objects": total,
                    "copied_bytes": copied_bytes, "total_bytes": total_bytes,
                    "message": f"Copied {copied}/{total} objects",
                })

            # Finalize
            if cancel_event.is_set():
                task.status = "cancelled"
                await add_log(db, task_id, "warn", "Migration cancelled by user")
                await notify_progress(task_id, {
                    "task_id": task_id, "status": "cancelled",
                    "copied_objects": copied, "total_objects": total,
                    "copied_bytes": copied_bytes, "total_bytes": total_bytes,
                    "message": "Migration cancelled",
                })
            elif errors > 0:
                task.status = "completed"
                task.error_message = f"{errors} objects failed to copy"
                await add_log(db, task_id, "warn", f"Completed with {errors} errors")
                await notify_progress(task_id, {
                    "task_id": task_id, "status": "completed",
                    "copied_objects": copied, "total_objects": total,
                    "copied_bytes": copied_bytes, "total_bytes": total_bytes,
                    "message": f"Completed with {errors} errors",
                })
            else:
                task.status = "completed"
                await add_log(db, task_id, "info", "Migration completed successfully")
                await notify_progress(task_id, {
                    "task_id": task_id, "status": "completed",
                    "copied_objects": copied, "total_objects": total,
                    "copied_bytes": copied_bytes, "total_bytes": total_bytes,
                    "message": "Migration completed",
                })

            task.completed_at = datetime.now(timezone.utc)
            await db.commit()

    except Exception as e:
        logger.exception("Migration failed")
        async with async_session_factory() as db:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if task:
                task.status = "failed"
                task.error_message = str(e)
                task.completed_at = datetime.now(timezone.utc)
                await db.commit()
            await add_log(db, task_id, "error", f"Migration failed: {e}")
            await notify_progress(task_id, {
                "task_id": task_id, "status": "failed",
                "copied_objects": 0, "total_objects": 0,
                "copied_bytes": 0, "total_bytes": 0,
                "message": f"Migration failed: {e}",
            })
    finally:
        _active_tasks.pop(task_id, None)
        # Final notify to close SSE
        await notify_progress(task_id, {"task_id": task_id, "status": "__done__"})


def cancel_migration(task_id: int):
    event = _active_tasks.get(task_id)
    if event:
        event.set()
        return True
    return False
