from decimal import Decimal
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.route import Route, RouteStatus
from app.models.vehicle_track import VehicleTrack
from app.models.exception import ExceptionItem, ExceptionType, ExceptionStatus
from app.services.geo_utils import point_to_path_distance
from app.services.exception_handler import create_route_deviation_exception
from app.core.config import settings


def record_track_point(
    db: Session,
    route: Route,
    longitude: Decimal,
    latitude: Decimal,
    speed_kmh: Decimal = None,
    heading: Decimal = None
) -> VehicleTrack:
    path = route.planned_path or []

    deviation = 0.0
    is_deviated = False
    if path and len(path) >= 2:
        deviation, _ = point_to_path_distance(longitude, latitude, path)
        is_deviated = deviation > settings.ROUTE_DEVIATION_THRESHOLD

    track = VehicleTrack(
        route_id=route.id,
        vehicle_id=route.vehicle_id,
        longitude=longitude,
        latitude=latitude,
        speed_kmh=speed_kmh,
        heading=heading,
        is_deviated=is_deviated,
        deviation_distance_meters=Decimal(str(deviation)) if deviation else None,
        recorded_at=datetime.utcnow()
    )
    db.add(track)

    if is_deviated:
        route.deviation_count = (route.deviation_count or 0) + 1
        if deviation > float(route.max_deviation_meters or 0):
            route.max_deviation_meters = Decimal(str(deviation))

        if route.status != RouteStatus.DEVIATED:
            route.status = RouteStatus.DEVIATED

            ex = db.query(ExceptionItem).filter(
                ExceptionItem.related_type == "route",
                ExceptionItem.related_id == route.id,
                ExceptionItem.type == ExceptionType.ROUTE_DEVIATION,
                ExceptionItem.status.in_([ExceptionStatus.OPEN, ExceptionStatus.PROCESSING])
            ).first()
            if not ex:
                create_route_deviation_exception(db, route, deviation)

    db.flush()
    return track


def get_route_tracks(
    db: Session,
    route_id: int
) -> List[VehicleTrack]:
    return db.query(VehicleTrack).filter(
        VehicleTrack.route_id == route_id
    ).order_by(VehicleTrack.recorded_at.asc()).all()
