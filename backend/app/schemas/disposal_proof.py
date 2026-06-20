from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.disposal_proof import DisposalStatus


class DisposalProofBase(BaseModel):
    weighing_id: int
    route_id: int
    disposal_factory_id: int
    vehicle_id: int
    received_weight_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    receive_time: datetime
    photo_urls: Optional[List[str]] = None
    remark: Optional[str] = None


class DisposalProofCreate(DisposalProofBase):
    pass


class DisposalProofUpdate(BaseModel):
    received_weight_kg: Optional[Decimal] = None
    receive_time: Optional[datetime] = None
    photo_urls: Optional[List[str]] = None
    status: Optional[DisposalStatus] = None
    remark: Optional[str] = None


class DisposalProofVerify(BaseModel):
    status: DisposalStatus
    verified_note: Optional[str] = None


class DisposalProofResponse(BaseModel):
    id: int
    proof_no: str
    weighing_id: int
    route_id: int
    disposal_factory_id: int
    vehicle_id: int
    received_weight_kg: Decimal
    weight_diff_kg: Optional[Decimal] = None
    weight_diff_percent: Optional[Decimal] = None
    receive_time: datetime
    received_by: Optional[int] = None
    photo_urls: Optional[List[str]] = None
    status: DisposalStatus
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    remark: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DisposalProofInList(BaseModel):
    id: int
    proof_no: str
    weighing_id: int
    disposal_factory_id: int
    vehicle_id: int
    received_weight_kg: Decimal
    weight_diff_percent: Optional[Decimal] = None
    status: DisposalStatus
    receive_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True
