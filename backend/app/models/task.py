from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Text, ForeignKey, func

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    source_conn_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    source_bucket = Column(String(255), nullable=False)
    target_conn_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    target_bucket = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")  # pending, running, completed, failed, cancelled
    total_objects = Column(BigInteger, default=0)
    copied_objects = Column(BigInteger, default=0)
    total_bytes = Column(BigInteger, default=0)
    copied_bytes = Column(BigInteger, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    level = Column(String(10), default="info")  # info, warn, error
    message = Column(Text, nullable=False)
    object_key = Column(String(1024), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
