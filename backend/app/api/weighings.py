from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.config import settings
from app.models.user import User
from app.models.weighing import Weighing, WeighingStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.settlement import Settlement, SettlementStatus
from app.schemas.weighing import (
    WeighingCreate, WeighingUpdate, WeighingSign,
    WeighingResponse, WeighingInList
)
from app.services.bill_no import generate_weighing_no, generate_settlement_no
from app.services.exception_handler import check_and_handle_weight_diff, create_no_signature_exception

router = APIRouter(prefix="/weighings", tags=["称重记录"])


@router.get("", response_model=List[WeighingInList])
def list_weighings(
    status: Optional[WeighingStatus] = Query(None),
    store_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    appointment_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Weighing)
    if status:
        query = query.filter(Weighing.status == status)
    if store_id:
        query = query.filter(Weighing.store_id == store_id)
    if vehicle_id:
        query = query.filter(Weighing.vehicle_id == vehicle_id)
    if appointment_id:
        query = query.filter(Weighing.appointment_id == appointment_id)
    return query.order_by(Weighing.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{weighing_id}", response_model=WeighingResponse)
def get_weighing(
    weighing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")
    return weighing


@router.post("", response_model=WeighingResponse, status_code=status.HTTP_201_CREATED)
def create_weighing(
    weighing_in: WeighingCreate,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == weighing_in.appointment_id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约不存在")

    net_weight = weighing_in.actual_weight_kg - weighing_in.tare_weight_kg
    if net_weight <= 0:
        raise HTTPException(status_code=400, detail="净重必须大于0")

    weighing = Weighing(
        **weighing_in.model_dump(),
        weighing_no=generate_weighing_no(),
        net_weight_kg=net_weight,
        driver_id=current_user.id if current_user.role == "driver" else weighing_in.driver_id
    )
    db.add(weighing)
    db.flush()

    check_and_handle_weight_diff(db, weighing)

    appointment.status = AppointmentStatus.COMPLETED
    appointment.actual_complete_time = datetime.utcnow()

    db.commit()
    db.refresh(weighing)

    if weighing.status != WeighingStatus.EXCEPTION:
        try:
            total_amount = weighing.net_weight_kg * Decimal(str(settings.OIL_UNIT_PRICE))
            settlement = Settlement(
                settlement_no=generate_settlement_no(),
                store_id=weighing.store_id,
                weighing_id=weighing.id,
                weight_kg=weighing.net_weight_kg,
                unit_price=Decimal(str(settings.OIL_UNIT_PRICE)),
                total_amount=total_amount,
                status=SettlementStatus.PENDING
            )
            db.add(settlement)
            db.commit()
        except Exception:
            pass

    return weighing


@router.post("/{weighing_id}/sign", response_model=WeighingResponse)
def sign_weighing(
    weighing_id: int,
    sign_in: WeighingSign,
    current_user: User = Depends(require_roles("admin", "store", "driver", "inspector")),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")
    if weighing.status == WeighingStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="已审核的称重记录不能再签收")

    weighing.signature_data = sign_in.signature_data
    weighing.signed_at = datetime.utcnow()
    weighing.signed_by = current_user.id
    weighing.status = WeighingStatus.SIGNED
    db.commit()
    db.refresh(weighing)
    return weighing


@router.put("/{weighing_id}", response_model=WeighingResponse)
def update_weighing(
    weighing_id: int,
    weighing_in: WeighingUpdate,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")

    update_data = weighing_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(weighing, field, value)

    if "actual_weight_kg" in update_data or "tare_weight_kg" in update_data or "declared_weight_kg" in update_data:
        weighing.net_weight_kg = weighing.actual_weight_kg - weighing.tare_weight_kg
        check_and_handle_weight_diff(db, weighing)

    db.commit()
    db.refresh(weighing)
    return weighing


@router.post("/{weighing_id}/verify", response_model=WeighingResponse)
def verify_weighing(
    weighing_id: int,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")
    if not weighing.signature_data:
        create_no_signature_exception(db, weighing)
        db.commit()
        raise HTTPException(status_code=400, detail="称重记录未进行电子签收，无法审核，请先签收")
    if weighing.status == WeighingStatus.EXCEPTION:
        raise HTTPException(status_code=400, detail="异常称重记录需先处理异常后再审核")

    weighing.status = WeighingStatus.VERIFIED
    db.commit()
    db.refresh(weighing)
    return weighing
