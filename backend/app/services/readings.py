import uuid
from datetime import date as date_type
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.database import MonitoredItem, Reading
from app.models.reading import ReadingCreate, ReadingResponse, ReadingUpdate, ReadingValues

# Régua: sharp-crested rectangular weir. C=1.8, L=0.6 m -> 1.08
REGUA_COEFFICIENT = 1.8 * 0.6
# Tambor: 200 L bucket -> 0.2 m³
TAMBOR_BUCKET_M3 = 0.2


def get_readings(db: Session, since: datetime | None) -> list[ReadingResponse]:
    q = db.query(Reading)
    if since:
        q = q.filter(Reading.updated_at > since)
    return [_to_response(r) for r in q.all()]


def create_reading(db: Session, data: ReadingCreate, user_id: uuid.UUID) -> ReadingResponse:
    item = _fetch_item(db, data.item_id)
    valor, nivel, vazao, raw_values = _derive(item, data.values)
    _assert_odometer(db, item, valor, data.date, data.recorded_at, exclude_id=None)

    now = datetime.now(timezone.utc)
    stmt = (
        insert(Reading)
        .values(
            id=data.id,
            item_id=data.item_id,
            date=data.date,
            recorded_at=data.recorded_at,
            valor=valor,
            nivel=nivel,
            vazao=vazao,
            raw_values=raw_values,
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
    item = _fetch_item(db, reading.item_id)
    valor, nivel, vazao, raw_values = _derive(item, data.values)
    _assert_odometer(db, item, valor, reading.date, reading.recorded_at, exclude_id=reading.id)

    reading.valor = valor
    reading.nivel = nivel
    reading.vazao = vazao
    reading.raw_values = raw_values
    reading.observacoes = data.observacoes
    reading.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reading)
    return _to_response(reading)


def _fetch_item(db: Session, item_id: uuid.UUID) -> MonitoredItem:
    item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"MonitoredItem {item_id} not found")
    return item


def _derive(
    item: MonitoredItem, values: ReadingValues
) -> tuple[float | None, float | None, float | None, dict | None]:
    """Split + derive wire values into (valor, nivel, vazao, raw_values).

    `vazao` is always server-computed for córrego items; any client value is dropped.
    """
    if item.type == "corrego":
        if item.corrego_method == "regua":
            nivel = values.nivel
            vazao = REGUA_COEFFICIENT * (nivel**1.5) if nivel and nivel > 0 else None
            return None, nivel, vazao, None
        if item.corrego_method == "tambor":
            t1, t2, t3 = values.t1, values.t2, values.t3
            if not (t1 and t1 > 0 and t2 and t2 > 0 and t3 and t3 > 0):
                raise HTTPException(
                    status_code=422,
                    detail="Tambor requires all three fill-time samples (t1, t2, t3) > 0",
                )
            vazao = TAMBOR_BUCKET_M3 / ((t1 + t2 + t3) / 3)
            return None, None, vazao, {"t1": t1, "t2": t2, "t3": t3}
        raise HTTPException(
            status_code=422, detail=f"Córrego item missing corrego_method: {item.id}"
        )
    # hidrometro / pluviometro: pass valor straight through
    return values.valor, None, None, None


def _assert_odometer(
    db: Session,
    item: MonitoredItem,
    valor: float | None,
    new_date: date_type,
    new_recorded_at: datetime,
    exclude_id: uuid.UUID | None,
) -> None:
    if item.type != "hidrometro" or valor is None:
        return
    prior_q = (
        db.query(Reading)
        .filter(Reading.item_id == item.id)
        .filter(
            or_(
                Reading.date < new_date,
                and_(Reading.date == new_date, Reading.recorded_at < new_recorded_at),
            )
        )
    )
    if exclude_id is not None:
        prior_q = prior_q.filter(Reading.id != exclude_id)
    prior = prior_q.order_by(Reading.date.desc(), Reading.recorded_at.desc()).first()
    if prior and prior.valor is not None and valor < float(prior.valor):
        raise HTTPException(
            status_code=422,
            detail=f"Valor menor que leitura anterior: {prior.valor} m³",
        )


def _to_response(r: Reading) -> ReadingResponse:
    raw = r.raw_values or {}
    return ReadingResponse(
        id=r.id,
        item_id=r.item_id,
        date=r.date,
        recorded_at=r.recorded_at,
        values=ReadingValues(
            valor=r.valor,
            nivel=r.nivel,
            vazao=r.vazao,
            t1=raw.get("t1"),
            t2=raw.get("t2"),
            t3=raw.get("t3"),
        ),
        observacoes=r.observacoes,
        created_by=r.created_by,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )
