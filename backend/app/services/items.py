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
    _validate_archive_reason(item, reason)

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


def _validate_archive_reason(item: MonitoredItem, reason: str) -> None:
    """Domain call, not a technical one: this system exists to satisfy DURH/outorga
    filings, so whether an item under an active water-right obligation deserves a
    stricter reason requirement than an unregulated one (e.g. pluviômetro) is a
    business rule you should decide, not one I should guess at.

    TODO(you): decide and implement the rule here. Some options to weigh:
      - Require a non-empty, minimum-length reason for every item.
      - Require a longer/more specific reason only when `item.durh_number` or
        `item.outorga_number` is set (i.e. it's under an active water-right).
      - Restrict to a fixed vocabulary (decommissioned / relocated / duplicate /
        broken / other) rather than free text.
    Raise `HTTPException(status_code=422, detail=...)` to reject; return None to allow.
    """
    raise NotImplementedError("Fill in the archive-reason business rule — see docstring above.")
