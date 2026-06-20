from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User
from app.models.store import Store
from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse, StoreInList

router = APIRouter(prefix="/stores", tags=["门店管理"])


@router.get("", response_model=List[StoreInList])
def list_stores(
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Store)
    if is_active is not None:
        query = query.filter(Store.is_active == is_active)
    if current_user.role == "store" and current_user.id:
        query = query.filter(Store.user_id == current_user.id)
    return query.offset(skip).limit(limit).all()


@router.get("/{store_id}", response_model=StoreResponse)
def get_store(
    store_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="门店不存在")
    if current_user.role == "store" and store.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看")
    return store


@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(
    store_in: StoreCreate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    existing = db.query(Store).filter(Store.store_code == store_in.store_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="门店编码已存在")

    store = Store(**store_in.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.put("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    store_in: StoreUpdate,
    current_user: User = Depends(require_roles("admin", "inspector")),
    db: Session = Depends(get_db)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="门店不存在")

    update_data = store_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)
    db.commit()
    db.refresh(store)
    return store


@router.delete("/{store_id}")
def delete_store(
    store_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="门店不存在")
    store.is_active = False
    db.commit()
    return {"message": "门店已停用"}
