from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.exception import ExceptionItem, ExceptionStatus, ExceptionType
from app.schemas.exception import (
    ExceptionCreate, ExceptionUpdate, ExceptionHandle,
    ExceptionResponse, ExceptionInList
)
from app.services.bill_no import generate_exception_no

router = APIRouter(prefix="/exceptions", tags=["异常清单"])


@router.get("", response_model=List[ExceptionInList])
def list_exceptions(
    status: Optional[ExceptionStatus] = Query(None),
    type: Optional[ExceptionType] = Query(None),
    severity: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionItem)
    if status:
        query = query.filter(ExceptionItem.status == status)
    if type:
        query = query.filter(ExceptionItem.type == type)
    if severity:
        query = query.filter(ExceptionItem.severity >= severity)
    return query.order_by(ExceptionItem.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{exception_id}", response_model=ExceptionResponse)
def get_exception(
    exception_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ex = db.query(ExceptionItem).filter(ExceptionItem.id == exception_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="异常记录不存在")
    return ex


@router.post("", response_model=ExceptionResponse, status_code=status.HTTP_201_CREATED)
def create_exception(
    ex_in: ExceptionCreate,
    current_user: User = Depends(require_roles("admin", "inspector", "driver", "store")),
    db: Session = Depends(get_db)
):
    ex = ExceptionItem(
        **ex_in.model_dump(),
        exception_no=generate_exception_no()
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.put("/{exception_id}", response_model=ExceptionResponse)
def update_exception(
    exception_id: int,
    ex_in: ExceptionUpdate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    ex = db.query(ExceptionItem).filter(ExceptionItem.id == exception_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="异常记录不存在")

    update_data = ex_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ex, field, value)
    db.commit()
    db.refresh(ex)
    return ex


@router.post("/{exception_id}/handle", response_model=ExceptionResponse)
def handle_exception(
    exception_id: int,
    handle_in: ExceptionHandle,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    ex = db.query(ExceptionItem).filter(ExceptionItem.id == exception_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="异常记录不存在")
    if ex.status in [ExceptionStatus.RESOLVED, ExceptionStatus.CLOSED]:
        raise HTTPException(status_code=400, detail="异常已处理完成，不能重复处理")

    ex.status = handle_in.new_status
    ex.handled_by = current_user.id
    ex.handled_at = datetime.utcnow()
    ex.handle_note = handle_in.handle_note
    ex.verify_conclusion = handle_in.verify_conclusion
    ex.affect_settlement = handle_in.affect_settlement

    if handle_in.new_status in [ExceptionStatus.RESOLVED, ExceptionStatus.CLOSED]:
        from app.models.weighing import Weighing, WeighingStatus
        from app.models.settlement import Settlement, SettlementStatus
        from app.models.route import Route

        weighing_id = None

        if ex.related_type == "weighing" and ex.related_id:
            weighing_id = ex.related_id
            weighing = db.query(Weighing).filter(Weighing.id == weighing_id).first()
            if weighing and weighing.status == WeighingStatus.EXCEPTION:
                weighing.status = WeighingStatus.SIGNED if weighing.signature_data else WeighingStatus.DRAFT

        if ex.related_type == "route" and ex.related_id:
            route = db.query(Route).filter(Route.id == ex.related_id).first()
            if route:
                weighing_id = route.weighing_id

        if weighing_id:
            settlements = db.query(Settlement).filter(Settlement.weighing_id == weighing_id).all()

            if ex.type == ExceptionType.WEIGHT_DIFF:
                for s in settlements:
                    if s.is_frozen:
                        s.is_frozen = False
                        s.status = SettlementStatus.PENDING
                        s.frozen_reason = None

            elif ex.type == ExceptionType.ROUTE_DEVIATION:
                for s in settlements:
                    if handle_in.affect_settlement:
                        if not s.is_frozen and s.status != SettlementStatus.PAID:
                            s.is_frozen = True
                            s.status = SettlementStatus.FROZEN
                            s.frozen_reason = f"路线偏离异常影响结算：{handle_in.verify_conclusion or '监管核实确认影响结算'}"
                    else:
                        if s.is_frozen and s.frozen_reason and "路线偏离" in s.frozen_reason:
                            s.is_frozen = False
                            s.status = SettlementStatus.PENDING
                            s.frozen_reason = None

    db.commit()
    db.refresh(ex)
    return ex
