import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.database import Area, MonitoredItem
from app.models.item import ItemCreateRequest, ItemUpdateRequest

VALID_TYPES = {"hidrometro", "pluviometro", "corrego"}
VALID_CORREGO_METHODS = {"regua", "tambor"}


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


def create_item(db: Session, data: ItemCreateRequest) -> MonitoredItem:
    if not db.query(Area).filter(Area.id == data.area_id).first():
        raise HTTPException(status_code=404, detail=f"Area {data.area_id} not found")
    if db.query(MonitoredItem).filter(MonitoredItem.id == data.id).first():
        raise HTTPException(status_code=409, detail=f"MonitoredItem {data.id} already exists")
    _validate_create(data)

    now = datetime.now(timezone.utc)
    item = MonitoredItem(
        id=data.id,
        area_id=data.area_id,
        name=data.name.strip(),
        type=data.type,
        limite_outorgado=data.limite_outorgado,
        unit=data.unit,
        horas_operacao=data.horas_operacao,
        corrego_method=data.corrego_method,
        has_horimetro=data.has_horimetro,
        disabled=False,
        durh_number=data.durh_number,
        outorga_number=data.outorga_number,
        barramento_durh=data.barramento_durh,
        last_tecnico_responsavel=None,
        last_crea=None,
        archived_at=None,
        archived_reason=None,
        archived_by=None,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: uuid.UUID, data: ItemUpdateRequest) -> MonitoredItem:
    item = _fetch_item(db, item_id)
    _validate_name(data.name)
    _validate_type_fields(item.type, data.corrego_method)

    item.name = data.name.strip()
    item.limite_outorgado = data.limite_outorgado
    item.unit = data.unit
    item.horas_operacao = data.horas_operacao
    item.corrego_method = data.corrego_method
    item.has_horimetro = data.has_horimetro
    item.durh_number = data.durh_number
    item.outorga_number = data.outorga_number
    item.barramento_durh = data.barramento_durh
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


def _validate_create(data: ItemCreateRequest) -> None:
    _validate_name(data.name)
    if data.type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"Tipo de item inválido: {data.type}")
    _validate_type_fields(data.type, data.corrego_method)


def _validate_name(name: str) -> None:
    if not name or not name.strip():
        raise HTTPException(status_code=422, detail="Nome do item é obrigatório.")


def _validate_type_fields(type_: str, corrego_method: str | None) -> None:
    if type_ == "corrego" and corrego_method not in VALID_CORREGO_METHODS:
        raise HTTPException(status_code=422, detail="Método de medição (régua/tambor) é obrigatório para córrego.")


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
