from sqlalchemy import Column, BigInteger, Integer, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class VehicleTrack(Base):
    __tablename__ = "vehicle_tracks"

    id = Column(BigInteger, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    latitude = Column(Numeric(10, 7), nullable=False)
    speed_kmh = Column(Numeric(6, 2))
    heading = Column(Numeric(5, 2))
    is_deviated = Column(Boolean, default=False)
    deviation_distance_meters = Column(Numeric(10, 2))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    route = relationship("Route", back_populates="tracks")
    vehicle = relationship("Vehicle", back_populates="tracks")
