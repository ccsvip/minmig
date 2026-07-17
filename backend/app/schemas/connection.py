from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConnectionResponse(BaseModel):
    id: int
    name: str
    endpoint: str
    access_key: str
    use_ssl: bool
    region: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionCreate(BaseModel):
    name: str
    endpoint: str
    access_key: str
    secret_key: str
    use_ssl: bool = True
    region: str = "us-east-1"


class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    endpoint: Optional[str] = None
    access_key: Optional[str] = None
    secret_key: Optional[str] = None
    use_ssl: Optional[bool] = None
    region: Optional[str] = None
