from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class DisposalFactoryBase(BaseModel):
    factory_code: str = Field(..., max_length=50)
    factory_name: str = Field(..., max_length=200)
    address: str = Field(..., max_length=500)
    longitude: Decimal = Field(..., max_digits=10, decimal_places=7)
    latitude: Decimal = Field(..., max_digits=10, decimal_places=7)
    contact_person: str = Field(..., max_length=100)
    contact_phone: str = Field(..., max_length=20)
    qualification_cert: Optional[str] = None
    user_id: Optional[int] = None
    is_active: bool = True


class DisposalFactoryCreate(DisposalFactoryBase):
    pass


class DisposalFactoryUpdate(BaseModel):
    factory_name: Optional[str] = None
    address: Optional[str] = None
    longitude: Optional[Decimal] = None
    latitude: Optional[Decimal] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    qualification_cert: Optional[str] = None
    user_id: Optional[int] = None
    is_active: Optional[bool] = None


class DisposalFactoryResponse(DisposalFactoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DisposalFactoryInList(BaseModel):
    id: int
    factory_code: str
    factory_name: str
    address: str
    longitude: Decimal
    latitude: Decimal
    contact_person: str
    contact_phone: str
    is_active: bool

    class Config:
        from_attributes = True
