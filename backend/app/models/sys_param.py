from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base


class SysParam(Base):
    __tablename__ = "sys_params"

    id = Column(Integer, primary_key=True, index=True)
    param_key = Column(String(100), unique=True, nullable=False, index=True)
    param_value = Column(String(500), nullable=False)
    param_name = Column(String(200), nullable=False)
    description = Column(Text)
    data_type = Column(String(20), default="string")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
