from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.store import Store
from app.schemas.appointment import (
    AppointmentCreate, AppointmentUpdate, AppointmentAccept,
    AppointmentResponse, AppointmentInList
)
from app.services.bill_no import generate_appointment_no

router = APIRouter(prefix="/appointments", tags=["回收预约"])


@router.get("", response_model=List[AppointmentInList])
def list_appointments(
    status: Optional[AppointmentStatus] = Query(None),
    store_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if status:
        query = query.filter(Appointment.status == status)
    if store_id:
        query = query.filter(Appointment.store_id == store_id)
    if driver_id:
        query = query.filter(Appointment.driver_id == driver_id)
    if date_from:
        query = query.filter(Appointment.appointment_time >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_time <= date_to)

    if current_user.role == "store":
        user_store = db.query(Store).filter(Store.user_id == current_user.id).first()
        if user_store:
            query = query.filter(Appointment.store_id == user_store.id)
    elif current_user.role == "driver":
        query = query.filter(Appointment.driver_id == current_user.id)

    return query.order_by(Appointment.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约不存在")
    return appointment


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(require_roles("admin", "store", "inspector")),
    db: Session = Depends(get_db)
):
    store = db.query(Store).filter(Store.id == appt_in.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="门店不存在")

    if current_user.role == "store":
        if store.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能为自己门店创建预约")

    appointment = Appointment(
        **appt_in.model_dump(),
        appointment_no=generate_appointment_no(),
        created_by=current_user.id
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post("/{appointment_id}/accept", response_model=AppointmentResponse)
def accept_appointment(
    appointment_id: int,
    accept_in: AppointmentAccept,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约不存在")
    if appointment.status != AppointmentStatus.PENDING:
        raise HTTPException(status_code=400, detail="预约状态不允许接单")

    from app.models.vehicle import Vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.id == accept_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="车辆不存在")

    appointment.vehicle_id = accept_in.vehicle_id
    appointment.driver_id = vehicle.driver_id or current_user.id
    appointment.status = AppointmentStatus.ACCEPTED
    appointment.actual_arrive_time = datetime.utcnow()
    db.commit()
    db.refresh(appointment)
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appt_in: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约不存在")

    update_data = appt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约不存在")
    if appointment.status in [AppointmentStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="已完成的预约不能取消")

    appointment.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appointment)
    return appointment
