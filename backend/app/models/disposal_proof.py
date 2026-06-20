from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Enum, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DisposalStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class DisposalProof(Base):
    __tablename__ = "disposal_proofs"

    id = Column(Integer, primary_key=True, index=True)
    proof_no = Column(String(50), unique=True, nullable=False, index=True)
    weighing_id = Column(Integer, ForeignKey("weighings.id"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    disposal_factory_id = Column(Integer, ForeignKey("disposal_factories.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    received_weight_kg = Column(Numeric(10, 2), nullable=False)
    weight_diff_kg = Column(Numeric(10, 2))
    weight_diff_percent = Column(Numeric(5, 2))
    receive_time = Column(DateTime(timezone=True), nullable=False)
    received_by = Column(Integer, ForeignKey("users.id"))
    photo_urls = Column(ARRAY(String))
    status = Column(Enum(DisposalStatus), default=DisposalStatus.PENDING)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    weighing = relationship("Weighing", back_populates="disposal_proofs")
    route = relationship("Route", back_populates="disposal_proofs")
    disposal_factory = relationship("DisposalFactory", back_populates="disposal_proofs")
    vehicle = relationship("Vehicle", back_populates="disposal_proofs")
    receiver = relationship("User", foreign_keys=[received_by], back_populates="received_disposals")
    verifier = relationship("User", foreign_keys=[verified_by], back_populates="verified_disposals")
