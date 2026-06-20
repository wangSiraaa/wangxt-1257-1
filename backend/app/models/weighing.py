from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Enum, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class WeighingStatus(str, enum.Enum):
    DRAFT = "draft"
    SIGNED = "signed"
    VERIFIED = "verified"
    EXCEPTION = "exception"


class Weighing(Base):
    __tablename__ = "weighings"

    id = Column(Integer, primary_key=True, index=True)
    weighing_no = Column(String(50), unique=True, nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    declared_weight_kg = Column(Numeric(10, 2), nullable=False)
    actual_weight_kg = Column(Numeric(10, 2), nullable=False)
    tare_weight_kg = Column(Numeric(10, 2), default=0)
    net_weight_kg = Column(Numeric(10, 2), nullable=False)
    weight_diff_percent = Column(Numeric(5, 2))
    photo_urls = Column(ARRAY(String))
    status = Column(Enum(WeighingStatus), default=WeighingStatus.DRAFT)
    signature_data = Column(Text)
    signed_at = Column(DateTime(timezone=True))
    signed_by = Column(Integer, ForeignKey("users.id"))
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    appointment = relationship("Appointment", back_populates="weighings")
    store = relationship("Store", back_populates="weighings")
    vehicle = relationship("Vehicle", back_populates="weighings")
    driver = relationship("User", foreign_keys=[driver_id], back_populates="driver_weighings")
    signer = relationship("User", foreign_keys=[signed_by], back_populates="signed_weighings")
    routes = relationship("Route", back_populates="weighing")
    disposal_proofs = relationship("DisposalProof", back_populates="weighing")
    settlements = relationship("Settlement", back_populates="weighing")
