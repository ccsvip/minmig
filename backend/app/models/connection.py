from sqlalchemy import Column, Integer, String, Boolean, DateTime, func

from app.database import Base


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    endpoint = Column(String(255), nullable=False)
    access_key = Column(String(255), nullable=False)
    secret_key = Column(String(512), nullable=False)  # encrypted
    use_ssl = Column(Boolean, default=True)
    region = Column(String(50), default="us-east-1")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
