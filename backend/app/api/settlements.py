from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.settlement import Settlement, SettlementStatus
from app.models.store import Store
from app.models.exception import ExceptionItem, ExceptionType
from app.models.route import Route
from app.schemas.settlement import (
    SettlementUpdate, SettlementFreeze,
    SettlementResponse, SettlementInList,
    SettlementExceptionInfo
)

router = APIRouter(prefix="/settlements", tags=["结算管理"])


def _get_settlement_exceptions(db: Session, weighing_id: int) -> List[ExceptionItem]:
    route_ids = [r.id for r in db.query(Route).filter(Route.weighing_id == weighing_id).all()]
    exceptions = db.query(ExceptionItem).filter(
        (
            (ExceptionItem.related_type == "weighing") & (ExceptionItem.related_id == weighing_id)
        ) | (
            (ExceptionItem.related_type == "route") & (ExceptionItem.related_id.in_(route_ids))
        )
    ).order_by(ExceptionItem.created_at.desc()).all()
    return exceptions


def _build_settlement_response(db: Session, settlement: Settlement) -> SettlementResponse:
    excs = _get_settlement_exceptions(db, settlement.weighing_id)
    exc_infos = [
        SettlementExceptionInfo(
            id=e.id,
            exception_no=e.exception_no,
            type=e.type,
            title=e.title,
            status=e.status,
            verify_conclusion=e.verify_conclusion,
            affect_settlement=e.affect_settlement,
            handle_note=e.handle_note,
            created_at=e.created_at
        ) for e in excs
    ]
    return SettlementResponse(
        id=settlement.id,
        settlement_no=settlement.settlement_no,
        store_id=settlement.store_id,
        weighing_id=settlement.weighing_id,
        weight_kg=settlement.weight_kg,
        unit_price=settlement.unit_price,
        total_amount=settlement.total_amount,
        status=settlement.status,
        is_frozen=settlement.is_frozen,
        frozen_reason=settlement.frozen_reason,
        paid_at=settlement.paid_at,
        paid_by=settlement.paid_by,
        remark=settlement.remark,
        exceptions=exc_infos,
        created_at=settlement.created_at,
        updated_at=settlement.updated_at
    )


@router.get("", response_model=List[SettlementInList])
def list_settlements(
    status: Optional[SettlementStatus] = Query(None),
    store_id: Optional[int] = Query(None),
    is_frozen: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Settlement)
    if status:
        query = query.filter(Settlement.status == status)
    if store_id:
        query = query.filter(Settlement.store_id == store_id)
    if is_frozen is not None:
        query = query.filter(Settlement.is_frozen == is_frozen)

    if current_user.role == "store":
        user_store = db.query(Store).filter(Store.user_id == current_user.id).first()
        if user_store:
            query = query.filter(Settlement.store_id == user_store.id)

    settlements = query.order_by(Settlement.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for s in settlements:
        excs = _get_settlement_exceptions(db, s.weighing_id)
        s_dict = {
            "id": s.id,
            "settlement_no": s.settlement_no,
            "store_id": s.store_id,
            "weighing_id": s.weighing_id,
            "total_amount": s.total_amount,
            "status": s.status,
            "is_frozen": s.is_frozen,
            "has_exceptions": len(excs) > 0,
            "has_affect_settlement_exception": any(e.affect_settlement for e in excs if e.affect_settlement is not None),
            "created_at": s.created_at
        }
        result.append(s_dict)

    return result


@router.get("/{settlement_id}", response_model=SettlementResponse)
def get_settlement(
    settlement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    return _build_settlement_response(db, settlement)


@router.put("/{settlement_id}", response_model=SettlementResponse)
def update_settlement(
    settlement_id: int,
    s_in: SettlementUpdate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")

    update_data = s_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settlement, field, value)
    db.commit()
    db.refresh(settlement)
    return _build_settlement_response(db, settlement)


@router.post("/{settlement_id}/freeze", response_model=SettlementResponse)
def freeze_settlement(
    settlement_id: int,
    freeze_in: SettlementFreeze,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    if settlement.status == SettlementStatus.PAID:
        raise HTTPException(status_code=400, detail="已支付的结算不能冻结")

    settlement.is_frozen = True
    settlement.frozen_reason = freeze_in.frozen_reason
    settlement.status = SettlementStatus.FROZEN
    db.commit()
    db.refresh(settlement)
    return _build_settlement_response(db, settlement)


@router.post("/{settlement_id}/unfreeze", response_model=SettlementResponse)
def unfreeze_settlement(
    settlement_id: int,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")

    settlement.is_frozen = False
    settlement.frozen_reason = None
    settlement.status = SettlementStatus.PENDING
    db.commit()
    db.refresh(settlement)
    return _build_settlement_response(db, settlement)


@router.post("/{settlement_id}/pay", response_model=SettlementResponse)
def pay_settlement(
    settlement_id: int,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    if settlement.is_frozen:
        raise HTTPException(status_code=400, detail="冻结状态的结算不能支付")
    if settlement.status in [SettlementStatus.PAID, SettlementStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="结算状态不允许支付")

    settlement.status = SettlementStatus.PAID
    settlement.paid_at = datetime.utcnow()
    settlement.paid_by = current_user.id
    db.commit()
    db.refresh(settlement)
    return _build_settlement_response(db, settlement)
