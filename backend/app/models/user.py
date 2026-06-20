from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STORE = "store"
    DRIVER = "driver"
    INSPECTOR = "inspector"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    real_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STORE)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    stores = relationship("Store", back_populates="user")
    driver_vehicles = relationship("Vehicle", back_populates="driver")
    created_appointments = relationship("Appointment", foreign_keys="Appointment.created_by", back_populates="creator")
    driver_appointments = relationship("Appointment", foreign_keys="Appointment.driver_id", back_populates="driver")
    signed_weighings = relationship("Weighing", foreign_keys="Weighing.signed_by", back_populates="signer")
    driver_weighings = relationship("Weighing", foreign_keys="Weighing.driver_id", back_populates="driver")
    received_disposals = relationship("DisposalProof", foreign_keys="DisposalProof.received_by", back_populates="receiver")
    verified_disposals = relationship("DisposalProof", foreign_keys="DisposalProof.verified_by", back_populates="verifier")
    handled_exceptions = relationship("ExceptionItem", foreign_keys="ExceptionItem.handled_by", back_populates="handler")
    paid_settlements = relationship("Settlement", foreign_keys="Settlement.paid_by", back_populates="payer")
