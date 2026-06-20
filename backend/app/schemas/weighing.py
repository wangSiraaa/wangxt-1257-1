from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.weighing import WeighingStatus


class WeighingBase(BaseModel):
    appointment_id: int
    store_id: int
    vehicle_id: int
    driver_id: int
    declared_weight_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    actual_weight_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    tare_weight_kg: Decimal = Decimal("0")
    photo_urls: Optional[List[str]] = None
    remark: Optional[str] = None


class WeighingCreate(WeighingBase):
    pass


class WeighingUpdate(BaseModel):
    declared_weight_kg: Optional[Decimal] = None
    actual_weight_kg: Optional[Decimal] = None
    tare_weight_kg: Optional[Decimal] = None
    photo_urls: Optional[List[str]] = None
    status: Optional[WeighingStatus] = None
    remark: Optional[str] = None


class WeighingSign(BaseModel):
    signature_data: str


class WeighingResponse(BaseModel):
    id: int
    weighing_no: str
    appointment_id: int
    store_id: int
    vehicle_id: int
    driver_id: int
    declared_weight_kg: Decimal
    actual_weight_kg: Decimal
    tare_weight_kg: Decimal
    net_weight_kg: Decimal
    weight_diff_percent: Optional[Decimal] = None
    photo_urls: Optional[List[str]] = None
    status: WeighingStatus
    signature_data: Optional[str] = None
    signed_at: Optional[datetime] = None
    signed_by: Optional[int] = None
    remark: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WeighingInList(BaseModel):
    id: int
    weighing_no: str
    appointment_id: int
    store_id: int
    vehicle_id: int
    net_weight_kg: Decimal
    weight_diff_percent: Optional[Decimal] = None
    status: WeighingStatus
    created_at: datetime

    class Config:
        from_attributes = True
