from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskResponse(BaseModel):
    id: int
    name: str
    source_conn_id: int
    source_bucket: str
    target_conn_id: int
    target_bucket: str
    status: str
    total_objects: int
    copied_objects: int
    total_bytes: int
    copied_bytes: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    name: str
    source_conn_id: int
    source_bucket: str
    target_conn_id: int
    target_bucket: str


class TaskLogResponse(BaseModel):
    id: int
    task_id: int
    level: str
    message: str
    object_key: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
