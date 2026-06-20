from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class StoreBase(BaseModel):
    store_code: str = Field(..., max_length=50)
    store_name: str = Field(..., max_length=200)
    address: str = Field(..., max_length=500)
    longitude: Decimal = Field(..., max_digits=10, decimal_places=7)
    latitude: Decimal = Field(..., max_digits=10, decimal_places=7)
    contact_person: str = Field(..., max_length=100)
    contact_phone: str = Field(..., max_length=20)
    business_license: Optional[str] = None
    daily_output_kg: Decimal = Decimal("0")
    user_id: Optional[int] = None
    is_active: bool = True


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    address: Optional[str] = None
    longitude: Optional[Decimal] = None
    latitude: Optional[Decimal] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    business_license: Optional[str] = None
    daily_output_kg: Optional[Decimal] = None
    user_id: Optional[int] = None
    is_active: Optional[bool] = None


class StoreResponse(StoreBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoreInList(BaseModel):
    id: int
    store_code: str
    store_name: str
    address: str
    longitude: Decimal
    latitude: Decimal
    contact_person: str
    contact_phone: str
    is_active: bool

    class Config:
        from_attributes = True
