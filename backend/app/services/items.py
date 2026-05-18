import uuid
from datetime import datetime

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
