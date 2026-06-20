from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


class DashboardStats(BaseModel):
    total_stores: int
    active_vehicles: int
    today_appointments: int
    today_weighings: int
    pending_exceptions: int
    pending_verifications: int
    total_weight_kg_today: Decimal
    total_amount_today: Decimal


class DailyStats(BaseModel):
    date: str
    weight_kg: Decimal
    count: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    weekly_trend: List[DailyStats]
    recent_exceptions: List[Any]
    recent_weighings: List[Any]
