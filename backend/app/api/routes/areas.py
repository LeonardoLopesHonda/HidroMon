from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.area import AreaResponse
from app.services import areas as area_service

router = APIRouter()


@router.get("/areas", response_model=list[AreaResponse])
def list_areas(
    since: datetime | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    return area_service.get_areas(db, since)
