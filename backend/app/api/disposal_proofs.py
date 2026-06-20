from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.disposal_proof import DisposalProof, DisposalStatus
from app.models.weighing import Weighing, WeighingStatus
from app.models.route import Route
from app.schemas.disposal_proof import (
    DisposalProofCreate, DisposalProofUpdate, DisposalProofVerify,
    DisposalProofResponse, DisposalProofInList
)
from app.services.bill_no import generate_proof_no

router = APIRouter(prefix="/disposal-proofs", tags=["去向证明"])


@router.get("", response_model=List[DisposalProofInList])
def list_disposal_proofs(
    status: Optional[DisposalStatus] = Query(None),
    disposal_factory_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    weighing_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DisposalProof)
    if status:
        query = query.filter(DisposalProof.status == status)
    if disposal_factory_id:
        query = query.filter(DisposalProof.disposal_factory_id == disposal_factory_id)
    if vehicle_id:
        query = query.filter(DisposalProof.vehicle_id == vehicle_id)
    if weighing_id:
        query = query.filter(DisposalProof.weighing_id == weighing_id)
    return query.order_by(DisposalProof.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{proof_id}", response_model=DisposalProofResponse)
def get_disposal_proof(
    proof_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proof = db.query(DisposalProof).filter(DisposalProof.id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="去向证明不存在")
    return proof


@router.post("", response_model=DisposalProofResponse, status_code=status.HTTP_201_CREATED)
def create_disposal_proof(
    proof_in: DisposalProofCreate,
    current_user: User = Depends(require_roles("admin", "driver", "inspector")),
    db: Session = Depends(get_db)
):
    weighing = db.query(Weighing).filter(Weighing.id == proof_in.weighing_id).first()
    if not weighing:
        raise HTTPException(status_code=404, detail="称重记录不存在")

    if not weighing.signature_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="称重记录未进行电子签收，不能生成去向证明"
        )

    route = db.query(Route).filter(Route.id == proof_in.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="运输路线不存在")

    weight_diff = weighing.net_weight_kg - proof_in.received_weight_kg
    weight_diff_percent = Decimal("0")
    if weighing.net_weight_kg > 0:
        weight_diff_percent = (abs(weight_diff) / weighing.net_weight_kg) * Decimal("100")

    proof = DisposalProof(
        **proof_in.model_dump(),
        proof_no=generate_proof_no(),
        weight_diff_kg=weight_diff,
        weight_diff_percent=weight_diff_percent,
        received_by=current_user.id if current_user.role in ["driver", "inspector"] else proof_in.received_by
    )
    db.add(proof)
    db.commit()
    db.refresh(proof)
    return proof


@router.put("/{proof_id}", response_model=DisposalProofResponse)
def update_disposal_proof(
    proof_id: int,
    proof_in: DisposalProofUpdate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    proof = db.query(DisposalProof).filter(DisposalProof.id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="去向证明不存在")

    update_data = proof_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proof, field, value)
    db.commit()
    db.refresh(proof)
    return proof


@router.post("/{proof_id}/verify", response_model=DisposalProofResponse)
def verify_disposal_proof(
    proof_id: int,
    verify_in: DisposalProofVerify,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    proof = db.query(DisposalProof).filter(DisposalProof.id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="去向证明不存在")
    if proof.status not in [DisposalStatus.PENDING, DisposalStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="证明状态不允许审核")

    proof.status = verify_in.status
    proof.verified_by = current_user.id
    proof.verified_at = datetime.utcnow()
    if verify_in.verified_note:
        proof.remark = (proof.remark or "") + "\n" + verify_in.verified_note

    if verify_in.status == DisposalStatus.VERIFIED:
        weighing = db.query(Weighing).filter(Weighing.id == proof.weighing_id).first()
        if weighing and weighing.status != WeighingStatus.VERIFIED:
            weighing.status = WeighingStatus.VERIFIED

    db.commit()
    db.refresh(proof)
    return proof
