from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.connection import Connection
from app.schemas.connection import ConnectionResponse, ConnectionCreate, ConnectionUpdate
from app.utils.security import get_current_user, encrypt_secret, decrypt_secret

router = APIRouter()


@router.get("", response_model=List[ConnectionResponse])
async def list_connections(
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Connection).order_by(Connection.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ConnectionResponse)
async def create_connection(
    data: ConnectionCreate,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    conn = Connection(
        name=data.name,
        endpoint=data.endpoint,
        access_key=data.access_key,
        secret_key=encrypt_secret(data.secret_key),
        use_ssl=data.use_ssl,
        region=data.region,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


@router.put("/{conn_id}", response_model=ConnectionResponse)
async def update_connection(
    conn_id: int,
    data: ConnectionUpdate,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    update_data = data.model_dump(exclude_unset=True)
    if "secret_key" in update_data and update_data["secret_key"]:
        update_data["secret_key"] = encrypt_secret(update_data["secret_key"])
    for key, value in update_data.items():
        setattr(conn, key, value)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.delete("/{conn_id}")
async def delete_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"message": "Connection deleted"}
