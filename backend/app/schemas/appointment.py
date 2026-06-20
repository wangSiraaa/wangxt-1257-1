from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    store_id: int
    expected_weight_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    oil_type: str = "餐厨废油"
    appointment_time: datetime
    remark: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    expected_weight_kg: Optional[Decimal] = None
    oil_type: Optional[str] = None
    appointment_time: Optional[datetime] = None
    actual_arrive_time: Optional[datetime] = None
    actual_complete_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    remark: Optional[str] = None


class AppointmentAccept(BaseModel):
    vehicle_id: int


class AppointmentResponse(AppointmentBase):
    id: int
    appointment_no: str
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    actual_arrive_time: Optional[datetime] = None
    actual_complete_time: Optional[datetime] = None
    status: AppointmentStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentInList(BaseModel):
    id: int
    appointment_no: str
    store_id: int
    vehicle_id: Optional[int]
    driver_id: Optional[int]
    expected_weight_kg: Decimal
    oil_type: str
    appointment_time: datetime
    status: AppointmentStatus
    created_at: datetime

    class Config:
        from_attributes = True
