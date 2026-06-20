import math
from decimal import Decimal
from typing import List, Tuple, Any


def haversine_distance(
    lon1: Decimal, lat1: Decimal,
    lon2: Decimal, lat2: Decimal
) -> float:
    lon1_f, lat1_f = float(lon1), float(lat1)
    lon2_f, lat2_f = float(lon2), float(lat2)

    R = 6371000.0

    phi1 = math.radians(lat1_f)
    phi2 = math.radians(lat2_f)
    delta_phi = math.radians(lat2_f - lat1_f)
    delta_lambda = math.radians(lon2_f - lon1_f)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def point_to_segment_distance(
    px: Decimal, py: Decimal,
    ax: Decimal, ay: Decimal,
    bx: Decimal, by: Decimal
) -> float:
    px_f, py_f = float(px), float(py)
    ax_f, ay_f = float(ax), float(ay)
    bx_f, by_f = float(bx), float(by)

    dx = bx_f - ax_f
    dy = by_f - ay_f

    if dx == 0 and dy == 0:
        return haversine_distance(px, py, ax, ay)

    t = max(0, min(1, ((px_f - ax_f) * dx + (py_f - ay_f) * dy) / (dx * dx + dy * dy)))
    proj_x = ax_f + t * dx
    proj_y = ay_f + t * dy

    return haversine_distance(
        Decimal(str(px_f)), Decimal(str(py_f)),
        Decimal(str(proj_x)), Decimal(str(proj_y))
    )


def point_to_path_distance(
    px: Decimal, py: Decimal,
    path: List[Any]
) -> Tuple[float, int]:
    if not path or len(path) < 2:
        return 0.0, 0

    min_distance = float('inf')
    nearest_idx = 0

    for i in range(len(path) - 1):
        p1 = path[i]
        p2 = path[i + 1]

        if isinstance(p1, dict):
            lon1, lat1 = Decimal(str(p1.get('longitude', p1.get('lng', 0)))), Decimal(str(p1.get('latitude', p1.get('lat', 0))))
            lon2, lat2 = Decimal(str(p2.get('longitude', p2.get('lng', 0)))), Decimal(str(p2.get('latitude', p2.get('lat', 0))))
        elif isinstance(p1, (list, tuple)):
            lon1, lat1 = Decimal(str(p1[0])), Decimal(str(p1[1]))
            lon2, lat2 = Decimal(str(p2[0])), Decimal(str(p2[1]))
        else:
            continue

        dist = point_to_segment_distance(px, py, lon1, lat1, lon2, lat2)
        if dist < min_distance:
            min_distance = dist
            nearest_idx = i

    return min_distance, nearest_idx


def calculate_path_length(path: List[Any]) -> float:
    if not path or len(path) < 2:
        return 0.0

    total = 0.0
    for i in range(len(path) - 1):
        p1 = path[i]
        p2 = path[i + 1]

        if isinstance(p1, dict):
            lon1, lat1 = Decimal(str(p1.get('longitude', p1.get('lng', 0)))), Decimal(str(p1.get('latitude', p1.get('lat', 0))))
            lon2, lat2 = Decimal(str(p2.get('longitude', p2.get('lng', 0)))), Decimal(str(p2.get('latitude', p2.get('lat', 0))))
        elif isinstance(p1, (list, tuple)):
            lon1, lat1 = Decimal(str(p1[0])), Decimal(str(p1[1]))
            lon2, lat2 = Decimal(str(p2[0])), Decimal(str(p2[1]))
        else:
            continue

        total += haversine_distance(lon1, lat1, lon2, lat2)

    return total
