from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.exception import ExceptionItem, ExceptionType, ExceptionStatus
from app.models.settlement import Settlement, SettlementStatus
from app.models.weighing import Weighing, WeighingStatus
from app.models.route import Route, RouteStatus
from app.services.bill_no import generate_exception_no
from app.core.config import settings


def create_weight_exception(
    db: Session,
    weighing: Weighing,
    diff_percent: Decimal
) -> ExceptionItem:
    exception = ExceptionItem(
        exception_no=generate_exception_no(),
        type=ExceptionType.WEIGHT_DIFF,
        related_type="weighing",
        related_id=weighing.id,
        title=f"称重差异异常 - {weighing.weighing_no}",
        description=f"门店申报重量{weighing.declared_weight_kg}kg与实际称重{weighing.actual_weight_kg}kg差异达{diff_percent}%，超过阈值{settings.WEIGHT_DIFF_THRESHOLD}%",
        severity=2 if diff_percent > Decimal(str(settings.WEIGHT_DIFF_THRESHOLD * 2)) else 1,
        status=ExceptionStatus.OPEN
    )
    db.add(exception)
    db.flush()
    return exception


def create_route_deviation_exception(
    db: Session,
    route: Route,
    deviation_meters: float
) -> ExceptionItem:
    exception = ExceptionItem(
        exception_no=generate_exception_no(),
        type=ExceptionType.ROUTE_DEVIATION,
        related_type="route",
        related_id=route.id,
        title=f"路线偏离异常 - {route.route_no}",
        description=f"车辆偏离规划路线最大距离{deviation_meters:.2f}米，超过阈值{settings.ROUTE_DEVIATION_THRESHOLD}米",
        severity=1,
        status=ExceptionStatus.OPEN
    )
    db.add(exception)
    db.flush()
    return exception


def create_no_signature_exception(
    db: Session,
    weighing: Weighing
) -> ExceptionItem:
    exception = ExceptionItem(
        exception_no=generate_exception_no(),
        type=ExceptionType.NO_SIGNATURE,
        related_type="weighing",
        related_id=weighing.id,
        title=f"未签收异常 - {weighing.weighing_no}",
        description=f"称重记录{weighing.weighing_no}未进行电子签收，无法生成去向证明",
        severity=2,
        status=ExceptionStatus.OPEN
    )
    db.add(exception)
    db.flush()
    return exception


def create_timeout_exception(
    db: Session,
    route: Route
) -> ExceptionItem:
    exception = ExceptionItem(
        exception_no=generate_exception_no(),
        type=ExceptionType.TIMEOUT,
        related_type="route",
        related_id=route.id,
        title=f"运输超时异常 - {route.route_no}",
        description=f"运输路线{route.route_no}超过{settings.TRANSPORT_TIMEOUT_MINUTES}分钟未到达处置厂",
        severity=1,
        status=ExceptionStatus.OPEN
    )
    db.add(exception)
    db.flush()
    return exception


def freeze_settlement(
    db: Session,
    settlement: Settlement,
    reason: str
) -> Settlement:
    settlement.is_frozen = True
    settlement.frozen_reason = reason
    settlement.status = SettlementStatus.FROZEN
    db.flush()
    return settlement


def check_and_handle_weight_diff(
    db: Session,
    weighing: Weighing
) -> bool:
    diff_percent = Decimal("0")
    if weighing.declared_weight_kg > 0:
        diff = abs(weighing.actual_weight_kg - weighing.declared_weight_kg)
        diff_percent = (diff / weighing.declared_weight_kg) * Decimal("100")

    weighing.weight_diff_percent = diff_percent

    if diff_percent > Decimal(str(settings.WEIGHT_DIFF_THRESHOLD)):
        weighing.status = WeighingStatus.EXCEPTION
        create_weight_exception(db, weighing, diff_percent)

        existing = db.query(Settlement).filter(Settlement.weighing_id == weighing.id).first()
        if existing:
            freeze_settlement(db, existing, f"称重差异超过阈值：{diff_percent}%")
        return True

    return False
