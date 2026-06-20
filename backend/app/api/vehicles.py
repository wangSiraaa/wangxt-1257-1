from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.vehicle import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    VehicleInList, VehicleLocationUpdate
)

router = APIRouter(prefix="/vehicles", tags=["车辆管理"])


@router.get("", response_model=List[VehicleInList])
def list_vehicles(
    status: Optional[VehicleStatus] = Query(None),
    driver_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    if driver_id:
        query = query.filter(Vehicle.driver_id == driver_id)
    if current_user.role == "driver":
        query = query.filter(Vehicle.driver_id == current_user.id)
    return query.offset(skip).limit(limit).all()


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="车辆不存在")
    return vehicle


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    existing = db.query(Vehicle).filter(Vehicle.plate_number == vehicle_in.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="车牌号已存在")

    vehicle = Vehicle(**vehicle_in.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="车辆不存在")

    if current_user.role == "driver" and vehicle.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此车辆")

    update_data = vehicle_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/{vehicle_id}/location", response_model=VehicleResponse)
def update_vehicle_location(
    vehicle_id: int,
    location: VehicleLocationUpdate,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="车辆不存在")

    vehicle.current_longitude = location.longitude
    vehicle.current_latitude = location.latitude
    vehicle.last_update_time = datetime.utcnow()
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="车辆不存在")
    vehicle.status = VehicleStatus.DISABLED
    db.commit()
    return {"message": "车辆已停用"}
