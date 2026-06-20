from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    store_code = Column(String(50), unique=True, nullable=False, index=True)
    store_name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    latitude = Column(Numeric(10, 7), nullable=False)
    contact_person = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    business_license = Column(String(100))
    daily_output_kg = Column(Numeric(10, 2), default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="stores")
    appointments = relationship("Appointment", back_populates="store")
    weighings = relationship("Weighing", back_populates="store")
    settlements = relationship("Settlement", back_populates="store")
