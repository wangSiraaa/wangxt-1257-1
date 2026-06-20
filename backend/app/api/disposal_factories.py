from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.disposal_factory import DisposalFactory
from app.schemas.disposal_factory import (
    DisposalFactoryCreate, DisposalFactoryUpdate,
    DisposalFactoryResponse, DisposalFactoryInList
)

router = APIRouter(prefix="/disposal-factories", tags=["处置厂管理"])


@router.get("", response_model=List[DisposalFactoryInList])
def list_factories(
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DisposalFactory)
    if is_active is not None:
        query = query.filter(DisposalFactory.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@router.get("/{factory_id}", response_model=DisposalFactoryResponse)
def get_factory(
    factory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    factory = db.query(DisposalFactory).filter(DisposalFactory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="处置厂不存在")
    return factory


@router.post("", response_model=DisposalFactoryResponse, status_code=status.HTTP_201_CREATED)
def create_factory(
    factory_in: DisposalFactoryCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    existing = db.query(DisposalFactory).filter(
        DisposalFactory.factory_code == factory_in.factory_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="处置厂编码已存在")

    factory = DisposalFactory(**factory_in.model_dump())
    db.add(factory)
    db.commit()
    db.refresh(factory)
    return factory


@router.put("/{factory_id}", response_model=DisposalFactoryResponse)
def update_factory(
    factory_id: int,
    factory_in: DisposalFactoryUpdate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    factory = db.query(DisposalFactory).filter(DisposalFactory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="处置厂不存在")

    update_data = factory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(factory, field, value)
    db.commit()
    db.refresh(factory)
    return factory


@router.delete("/{factory_id}")
def delete_factory(
    factory_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    factory = db.query(DisposalFactory).filter(DisposalFactory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="处置厂不存在")
    factory.is_active = False
    db.commit()
    return {"message": "处置厂已停用"}
