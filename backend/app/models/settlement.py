from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SettlementStatus(str, enum.Enum):
    PENDING = "pending"
    FROZEN = "frozen"
    PAID = "paid"
    CANCELLED = "cancelled"


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    settlement_no = Column(String(50), unique=True, nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    weighing_id = Column(Integer, ForeignKey("weighings.id"), nullable=False)
    weight_kg = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 4), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum(SettlementStatus), default=SettlementStatus.PENDING)
    is_frozen = Column(Boolean, default=False)
    frozen_reason = Column(String(500))
    paid_at = Column(DateTime(timezone=True))
    paid_by = Column(Integer, ForeignKey("users.id"))
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="settlements")
    weighing = relationship("Weighing", back_populates="settlements")
    payer = relationship("User", back_populates="paid_settlements")
