import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.item import ItemArchiveRequest, ItemResponse
from app.services import items as item_service

router = APIRouter()


@router.get("/items", response_model=list[ItemResponse])
def list_items(
    since: datetime | None = None,
    area_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    return item_service.get_items(db, since, area_id)


@router.post("/items/{item_id}/archive", response_model=ItemResponse)
def archive_item(
    item_id: uuid.UUID,
    data: ItemArchiveRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return item_service.archive_item(db, item_id, uuid.UUID(user_id), data.reason)


@router.post("/items/{item_id}/unarchive", response_model=ItemResponse)
def unarchive_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    return item_service.unarchive_item(db, item_id)
