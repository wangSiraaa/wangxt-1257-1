from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class DisposalFactory(Base):
    __tablename__ = "disposal_factories"

    id = Column(Integer, primary_key=True, index=True)
    factory_code = Column(String(50), unique=True, nullable=False, index=True)
    factory_name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    latitude = Column(Numeric(10, 7), nullable=False)
    contact_person = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    qualification_cert = Column(String(100))
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    routes = relationship("Route", back_populates="disposal_factory")
    disposal_proofs = relationship("DisposalProof", back_populates="disposal_factory")
