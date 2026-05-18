from datetime import datetime

from sqlalchemy.orm import Session

from app.db.database import Area


def get_areas(db: Session, since: datetime | None) -> list[Area]:
    q = db.query(Area)
    if since:
        q = q.filter(Area.updated_at > since)
    return q.all()
