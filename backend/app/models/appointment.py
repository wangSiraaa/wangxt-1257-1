from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_no = Column(String(50), unique=True, nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    driver_id = Column(Integer, ForeignKey("users.id"))
    expected_weight_kg = Column(Numeric(10, 2), nullable=False)
    oil_type = Column(String(50), default="餐厨废油")
    appointment_time = Column(DateTime(timezone=True), nullable=False)
    actual_arrive_time = Column(DateTime(timezone=True))
    actual_complete_time = Column(DateTime(timezone=True))
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING)
    remark = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="appointments")
    vehicle = relationship("Vehicle", back_populates="appointments")
    driver = relationship("User", foreign_keys=[driver_id], back_populates="driver_appointments")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_appointments")
    weighings = relationship("Weighing", back_populates="appointment")
