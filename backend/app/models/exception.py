from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ExceptionType(str, enum.Enum):
    WEIGHT_DIFF = "weight_diff"
    ROUTE_DEVIATION = "route_deviation"
    NO_SIGNATURE = "no_signature"
    TIMEOUT = "timeout"


class ExceptionStatus(str, enum.Enum):
    OPEN = "open"
    PROCESSING = "processing"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ExceptionItem(Base):
    __tablename__ = "exceptions"

    id = Column(Integer, primary_key=True, index=True)
    exception_no = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(Enum(ExceptionType), nullable=False)
    related_type = Column(String(50))
    related_id = Column(Integer)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    severity = Column(Integer, default=1)
    status = Column(Enum(ExceptionStatus), default=ExceptionStatus.OPEN)
    handled_by = Column(Integer, ForeignKey("users.id"))
    handled_at = Column(DateTime(timezone=True))
    handle_note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    handler = relationship("User", back_populates="handled_exceptions")
