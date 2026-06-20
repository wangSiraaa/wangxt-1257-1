from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.route import Route, RouteStatus
from app.models.weighing import Weighing, WeighingStatus
from app.models.vehicle_track import VehicleTrack
from app.schemas.route import (
    RouteCreate, RouteUpdate, RouteResponse,
    RouteInList, TrackPoint
)
from app.services.bill_no import generate_route_no
from app.services.tracking_service import record_track_point, get_route_tracks
from app.services.geo_utils import calculate_path_length

router = APIRouter(prefix="/routes", tags=["运输路线"])


@router.get("", response_model=List[RouteInList])
def list_routes(
    status: Optional[RouteStatus] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    weighing_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Route)
    if status:
        query = query.filter(Route.status == status)
    if vehicle_id:
        query = query.filter(Route.vehicle_id == vehicle_id)
    if weighing_id:
        query = query.filter(Route.weighing_id == weighing_id)

    if current_user.role == "driver":
        from app.models.vehicle import Vehicle
        vehicle_ids = [v.id for v in db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).all()]
        if vehicle_ids:
            query = query.filter(Route.vehicle_id.in_(vehicle_ids))

    return query.order_by(Route.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{route_id}", response_model=RouteResponse)
def get_route(
    route_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    return route


@router.get("/{route_id}/tracks")
def get_route_tracks_api(
    route_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    tracks = get_route_tracks(db, route_id)
    return [
        {
            "id": t.id,
            "longitude": t.longitude,
            "latitude": t.latitude,
            "speed_kmh": t.speed_kmh,
            "heading": t.heading,
            "is_deviated": t.is_deviated,
            "deviation_distance_meters": t.deviation_distance_meters,
            "recorded_at": t.recorded_at
        }
        for t in tracks
    ]


@router.post("", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
def create_route(
    route_in: RouteCreate,
    current_user: User = Depends(require_roles("admin", "driver", "inspector")),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == route_in.weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")
    if not weighing.signature_data:
        raise HTTPException(status_code=400, detail="称重记录未签收，不能创建运输路线")

    planned_path = route_in.planned_path or []
    distance = calculate_path_length(planned_path) / 1000.0

    route = Route(
        **route_in.model_dump(),
        route_no=generate_route_no(),
        distance_km=Decimal(str(round(distance, 2)))
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.post("/{route_id}/start", response_model=RouteResponse)
def start_route(
    route_id: int,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    if route.status not in [RouteStatus.PLANNING, RouteStatus.DEVIATED]:
        raise HTTPException(status_code=400, detail="路线状态不允许开始运输")

    route.status = RouteStatus.IN_TRANSIT
    route.actual_start_time = datetime.utcnow()
    db.commit()
    db.refresh(route)
    return route


@router.post("/{route_id}/track", status_code=status.HTTP_201_CREATED)
def add_track_point(
    route_id: int,
    track: TrackPoint,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")

    result = record_track_point(
        db, route,
        track.longitude, track.latitude,
        track.speed_kmh, track.heading
    )
    db.commit()
    return {
        "id": result.id,
        "is_deviated": result.is_deviated,
        "deviation_distance_meters": result.deviation_distance_meters,
        "recorded_at": result.recorded_at
    }


@router.post("/{route_id}/end", response_model=RouteResponse)
def end_route(
    route_id: int,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    if route.status not in [RouteStatus.IN_TRANSIT, RouteStatus.DEVIATED]:
        raise HTTPException(status_code=400, detail="路线状态不允许结束")

    route.status = RouteStatus.COMPLETED
    route.actual_end_time = datetime.utcnow()
    db.commit()
    db.refresh(route)
    return route


@router.put("/{route_id}", response_model=RouteResponse)
def update_route(
    route_id: int,
    route_in: RouteUpdate,
    current_user: User = Depends(require_roles("admin", "driver")),
    db: Session = Depends(get_db)
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")

    update_data = route_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(route, field, value)
    db.commit()
    db.refresh(route)
    return route
