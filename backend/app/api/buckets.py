from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.connection import Connection
from app.services.minio_service import get_minio_client, list_buckets
from app.utils.security import get_current_user, decrypt_secret

router = APIRouter()


@router.get("")
async def list_buckets_for_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    try:
        client = get_minio_client(
            conn.endpoint, conn.access_key,
            decrypt_secret(conn.secret_key), conn.use_ssl, conn.region,
        )
        buckets = list_buckets(client)
        return buckets
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list buckets: {e}")
