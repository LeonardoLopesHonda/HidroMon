import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.reading import ReadingCreate, ReadingResponse, ReadingUpdate
from app.services import readings as reading_service

router = APIRouter()


@router.get("/readings", response_model=list[ReadingResponse])
def list_readings(
    since: datetime | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    return reading_service.get_readings(db, since)


@router.post("/readings", response_model=ReadingResponse, status_code=201)
def create_reading(
    data: ReadingCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return reading_service.create_reading(db, data, uuid.UUID(user_id))


@router.put("/readings/{reading_id}", response_model=ReadingResponse)
def update_reading(
    reading_id: uuid.UUID,
    data: ReadingUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    reading = reading_service.update_reading(db, reading_id, data)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return reading
