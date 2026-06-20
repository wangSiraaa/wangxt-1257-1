from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.vehicle import VehicleStatus


class VehicleBase(BaseModel):
    plate_number: str = Field(..., max_length=20)
    vehicle_type: str = Field(..., max_length=50)
    capacity_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    driver_id: Optional[int] = None
    status: VehicleStatus = VehicleStatus.IDLE
    device_id: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[Decimal] = None
    driver_id: Optional[int] = None
    status: Optional[VehicleStatus] = None
    device_id: Optional[str] = None
    current_longitude: Optional[Decimal] = None
    current_latitude: Optional[Decimal] = None


class VehicleLocationUpdate(BaseModel):
    longitude: Decimal
    latitude: Decimal
    speed_kmh: Optional[Decimal] = None
    heading: Optional[Decimal] = None


class VehicleResponse(VehicleBase):
    id: int
    current_longitude: Optional[Decimal] = None
    current_latitude: Optional[Decimal] = None
    last_update_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VehicleInList(BaseModel):
    id: int
    plate_number: str
    vehicle_type: str
    capacity_kg: Decimal
    driver_id: Optional[int]
    status: VehicleStatus
    current_longitude: Optional[Decimal] = None
    current_latitude: Optional[Decimal] = None

    class Config:
        from_attributes = True
