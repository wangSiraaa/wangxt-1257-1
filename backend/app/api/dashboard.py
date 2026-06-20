from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.store import Store
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.appointment import Appointment
from app.models.weighing import Weighing
from app.models.exception import ExceptionItem, ExceptionStatus
from app.models.disposal_proof import DisposalProof, DisposalStatus
from app.models.settlement import Settlement
from app.schemas.dashboard import DashboardStats, DailyStats, DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["数据看板"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    total_stores = db.query(func.count(Store.id)).filter(Store.is_active == True).scalar()
    active_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.status.in_([VehicleStatus.IN_SERVICE, VehicleStatus.IDLE])
    ).scalar()
    today_appointments = db.query(func.count(Appointment.id)).filter(
        Appointment.created_at >= today_start,
        Appointment.created_at <= today_end
    ).scalar()
    today_weighings = db.query(func.count(Weighing.id)).filter(
        Weighing.created_at >= today_start,
        Weighing.created_at <= today_end
    ).scalar()
    pending_exceptions = db.query(func.count(ExceptionItem.id)).filter(
        ExceptionItem.status.in_([ExceptionStatus.OPEN, ExceptionStatus.PROCESSING])
    ).scalar()
    pending_verifications = db.query(func.count(DisposalProof.id)).filter(
        DisposalProof.status == DisposalStatus.PENDING
    ).scalar()

    today_weight = db.query(func.coalesce(func.sum(Weighing.net_weight_kg), 0)).filter(
        Weighing.created_at >= today_start,
        Weighing.created_at <= today_end
    ).scalar() or Decimal("0")

    today_amount = db.query(func.coalesce(func.sum(Settlement.total_amount), 0)).filter(
        Settlement.created_at >= today_start,
        Settlement.created_at <= today_end
    ).scalar() or Decimal("0")

    stats = DashboardStats(
        total_stores=total_stores,
        active_vehicles=active_vehicles,
        today_appointments=today_appointments,
        today_weighings=today_weighings,
        pending_exceptions=pending_exceptions,
        pending_verifications=pending_verifications,
        total_weight_kg_today=today_weight,
        total_amount_today=today_amount
    )

    weekly_trend: List[DailyStats] = []
    for i in range(6, -1, -1):
        day = datetime.now().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        day_weight = db.query(func.coalesce(func.sum(Weighing.net_weight_kg), 0)).filter(
            Weighing.created_at >= day_start,
            Weighing.created_at <= day_end
        ).scalar() or Decimal("0")
        day_count = db.query(func.count(Weighing.id)).filter(
            Weighing.created_at >= day_start,
            Weighing.created_at <= day_end
        ).scalar()

        weekly_trend.append(DailyStats(
            date=day.strftime("%Y-%m-%d"),
            weight_kg=day_weight,
            count=day_count
        ))

    recent_exceptions = db.query(ExceptionItem).order_by(
        ExceptionItem.created_at.desc()
    ).limit(5).all()

    recent_weighings = db.query(Weighing).order_by(
        Weighing.created_at.desc()
    ).limit(5).all()

    return DashboardResponse(
        stats=stats,
        weekly_trend=weekly_trend,
        recent_exceptions=[
            {"id": e.id, "exception_no": e.exception_no, "type": e.type.value,
             "title": e.title, "status": e.status.value, "severity": e.severity,
             "created_at": e.created_at}
            for e in recent_exceptions
        ],
        recent_weighings=[
            {"id": w.id, "weighing_no": w.weighing_no, "store_id": w.store_id,
             "net_weight_kg": w.net_weight_kg, "status": w.status.value,
             "created_at": w.created_at}
            for w in recent_weighings
        ]
    )


@router.get("/map-data")
def get_map_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stores = db.query(Store).filter(Store.is_active == True).all()
    vehicles = db.query(Vehicle).all()

    from app.models.disposal_factory import DisposalFactory
    factories = db.query(DisposalFactory).filter(DisposalFactory.is_active == True).all()

    in_transit_routes = db.query(Appointment).filter(
        Appointment.status.in_(["accepted", "pending"])
    ).all()

    return {
        "stores": [
            {"id": s.id, "code": s.store_code, "name": s.store_name,
             "longitude": s.longitude, "latitude": s.latitude,
             "address": s.address, "phone": s.contact_phone}
            for s in stores
        ],
        "vehicles": [
            {"id": v.id, "plate_number": v.plate_number, "status": v.status.value,
             "longitude": v.current_longitude, "latitude": v.current_latitude,
             "driver_id": v.driver_id, "capacity_kg": v.capacity_kg,
             "last_update": v.last_update_time}
            for v in vehicles
        ],
        "factories": [
            {"id": f.id, "code": f.factory_code, "name": f.factory_name,
             "longitude": f.longitude, "latitude": f.latitude,
             "address": f.address, "phone": f.contact_phone}
            for f in factories
        ],
        "active_appointments": len(in_transit_routes)
    }
