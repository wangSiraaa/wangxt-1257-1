from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.exception import ExceptionType, ExceptionStatus


class ExceptionBase(BaseModel):
    type: ExceptionType
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    severity: int = 1


class ExceptionCreate(ExceptionBase):
    pass


class ExceptionUpdate(BaseModel):
    status: Optional[ExceptionStatus] = None
    handle_note: Optional[str] = None
    verify_conclusion: Optional[str] = None
    affect_settlement: Optional[bool] = None


class ExceptionHandle(BaseModel):
    handle_note: str
    verify_conclusion: Optional[str] = None
    affect_settlement: bool = False
    new_status: ExceptionStatus = ExceptionStatus.RESOLVED


class ExceptionResponse(BaseModel):
    id: int
    exception_no: str
    type: ExceptionType
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: int
    status: ExceptionStatus
    handled_by: Optional[int] = None
    handled_at: Optional[datetime] = None
    handle_note: Optional[str] = None
    verify_conclusion: Optional[str] = None
    affect_settlement: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExceptionInList(BaseModel):
    id: int
    exception_no: str
    type: ExceptionType
    title: str
    severity: int
    status: ExceptionStatus
    verify_conclusion: Optional[str] = None
    affect_settlement: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True
