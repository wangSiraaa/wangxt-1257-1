from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RouteStatus(str, enum.Enum):
    PLANNING = "planning"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    DEVIATED = "deviated"


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_no = Column(String(50), unique=True, nullable=False, index=True)
    weighing_id = Column(Integer, ForeignKey("weighings.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    disposal_factory_id = Column(Integer, ForeignKey("disposal_factories.id"), nullable=False)
    planned_path = Column(JSON, nullable=False)
    actual_start_time = Column(DateTime(timezone=True))
    actual_end_time = Column(DateTime(timezone=True))
    distance_km = Column(Numeric(10, 2))
    status = Column(Enum(RouteStatus), default=RouteStatus.PLANNING)
    deviation_count = Column(Integer, default=0)
    max_deviation_meters = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    weighing = relationship("Weighing", back_populates="routes")
    vehicle = relationship("Vehicle", back_populates="routes")
    disposal_factory = relationship("DisposalFactory", back_populates="routes")
    tracks = relationship("VehicleTrack", back_populates="route", cascade="all, delete-orphan")
    disposal_proofs = relationship("DisposalProof", back_populates="route")
