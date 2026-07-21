import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.database import MonitoredItem


def get_items(
    db: Session,
    since: datetime | None,
    area_id: uuid.UUID | None,
) -> list[MonitoredItem]:
    q = db.query(MonitoredItem)
    if since:
        q = q.filter(MonitoredItem.updated_at > since)
    if area_id:
        q = q.filter(MonitoredItem.area_id == area_id)
    return q.all()


def archive_item(db: Session, item_id: uuid.UUID, user_id: uuid.UUID, reason: str) -> MonitoredItem:
    item = _fetch_item(db, item_id)
    _validate_archive_reason(reason)

    item.disabled = True
    item.archived_at = datetime.now(timezone.utc)
    item.archived_reason = reason
    item.archived_by = user_id
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


def unarchive_item(db: Session, item_id: uuid.UUID) -> MonitoredItem:
    item = _fetch_item(db, item_id)

    item.disabled = False
    item.archived_at = None
    item.archived_reason = None
    item.archived_by = None
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


def _fetch_item(db: Session, item_id: uuid.UUID) -> MonitoredItem:
    item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"MonitoredItem {item_id} not found")
    return item


def _validate_archive_reason(reason: str) -> None:
    """Every item type requires the same non-empty reason — no stricter rule for
    outorga-bound items than for a pluviômetro/córrego (see PR #34 review)."""
    if not reason or not reason.strip():
        raise HTTPException(status_code=422, detail="Motivo do arquivamento é obrigatório.")
