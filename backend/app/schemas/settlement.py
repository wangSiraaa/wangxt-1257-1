from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.settlement import SettlementStatus
from app.models.exception import ExceptionType, ExceptionStatus


class SettlementExceptionInfo(BaseModel):
    id: int
    exception_no: str
    type: ExceptionType
    title: str
    status: ExceptionStatus
    verify_conclusion: Optional[str] = None
    affect_settlement: Optional[bool] = None
    handle_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SettlementBase(BaseModel):
    store_id: int
    weighing_id: int
    weight_kg: Decimal = Field(..., max_digits=10, decimal_places=2)
    unit_price: Decimal = Field(..., max_digits=10, decimal_places=4)
    total_amount: Decimal = Field(..., max_digits=12, decimal_places=2)
    remark: Optional[str] = None


class SettlementCreate(SettlementBase):
    pass


class SettlementUpdate(BaseModel):
    status: Optional[SettlementStatus] = None
    is_frozen: Optional[bool] = None
    frozen_reason: Optional[str] = None
    remark: Optional[str] = None


class SettlementFreeze(BaseModel):
    frozen_reason: str


class SettlementResponse(BaseModel):
    id: int
    settlement_no: str
    store_id: int
    weighing_id: int
    weight_kg: Decimal
    unit_price: Decimal
    total_amount: Decimal
    status: SettlementStatus
    is_frozen: bool
    frozen_reason: Optional[str] = None
    paid_at: Optional[datetime] = None
    paid_by: Optional[int] = None
    remark: Optional[str] = None
    exceptions: Optional[List[SettlementExceptionInfo]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SettlementInList(BaseModel):
    id: int
    settlement_no: str
    store_id: int
    weighing_id: int
    total_amount: Decimal
    status: SettlementStatus
    is_frozen: bool
    has_exceptions: Optional[bool] = False
    has_affect_settlement_exception: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True
