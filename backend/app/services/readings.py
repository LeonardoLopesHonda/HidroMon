import uuid
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.database import Reading
from app.models.reading import ReadingCreate, ReadingResponse, ReadingUpdate, ReadingValues


def get_readings(db: Session, since: datetime | None) -> list[ReadingResponse]:
    q = db.query(Reading)
    if since:
        q = q.filter(Reading.updated_at > since)
    return [_to_response(r) for r in q.all()]


def create_reading(db: Session, data: ReadingCreate, user_id: uuid.UUID) -> ReadingResponse:
    now = datetime.now(timezone.utc)
    stmt = (
        insert(Reading)
        .values(
            id=data.id,
            item_id=data.item_id,
            date=data.date,
            recorded_at=data.recorded_at,
            valor=data.values.valor,
            nivel=data.values.nivel,
            vazao=data.values.vazao,
            observacoes=data.observacoes,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    db.execute(stmt)
    db.commit()
    reading = db.query(Reading).filter(Reading.id == data.id).one()
    return _to_response(reading)


def update_reading(
    db: Session, reading_id: uuid.UUID, data: ReadingUpdate
) -> ReadingResponse | None:
    reading = db.query(Reading).filter(Reading.id == reading_id).first()
    if not reading:
        return None
    reading.valor = data.values.valor
    reading.nivel = data.values.nivel
    reading.vazao = data.values.vazao
    reading.observacoes = data.observacoes
    reading.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reading)
    return _to_response(reading)


def _to_response(r: Reading) -> ReadingResponse:
    return ReadingResponse(
        id=r.id,
        item_id=r.item_id,
        date=r.date,
        recorded_at=r.recorded_at,
        values=ReadingValues(valor=r.valor, nivel=r.nivel, vazao=r.vazao),
        observacoes=r.observacoes,
        created_by=r.created_by,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )
