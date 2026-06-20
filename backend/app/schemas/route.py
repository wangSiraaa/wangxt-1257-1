from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from app.models.route import RouteStatus


class RoutePoint(BaseModel):
    longitude: Decimal
    latitude: Decimal
    order: Optional[int] = None


class RouteBase(BaseModel):
    weighing_id: int
    vehicle_id: int
    disposal_factory_id: int
    planned_path: Any


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    distance_km: Optional[Decimal] = None
    status: Optional[RouteStatus] = None


class RouteResponse(BaseModel):
    id: int
    route_no: str
    weighing_id: int
    vehicle_id: int
    disposal_factory_id: int
    planned_path: Any
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    distance_km: Optional[Decimal] = None
    status: RouteStatus
    deviation_count: int
    max_deviation_meters: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RouteInList(BaseModel):
    id: int
    route_no: str
    weighing_id: int
    vehicle_id: int
    disposal_factory_id: int
    status: RouteStatus
    deviation_count: int
    max_deviation_meters: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class TrackPoint(BaseModel):
    longitude: Decimal
    latitude: Decimal
    speed_kmh: Optional[Decimal] = None
    heading: Optional[Decimal] = None
    recorded_at: Optional[datetime] = None
    is_deviated: bool = False
    deviation_distance_meters: Optional[Decimal] = None
