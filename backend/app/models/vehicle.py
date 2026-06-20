from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class VehicleStatus(str, enum.Enum):
    IDLE = "idle"
    IN_SERVICE = "in_service"
    MAINTENANCE = "maintenance"
    DISABLED = "disabled"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(20), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)
    capacity_kg = Column(Numeric(10, 2), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(VehicleStatus), default=VehicleStatus.IDLE)
    device_id = Column(String(100))
    current_longitude = Column(Numeric(10, 7))
    current_latitude = Column(Numeric(10, 7))
    last_update_time = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    driver = relationship("User", back_populates="driver_vehicles")
    appointments = relationship("Appointment", back_populates="vehicle")
    weighings = relationship("Weighing", back_populates="vehicle")
    routes = relationship("Route", back_populates="vehicle")
    tracks = relationship("VehicleTrack", back_populates="vehicle")
    disposal_proofs = relationship("DisposalProof", back_populates="vehicle")
