import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ItemResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: uuid.UUID
    area_id: uuid.UUID
    name: str
    type: str
    limite_outorgado: float | None
    unit: str | None
    horas_operacao: int
    corrego_method: str | None
    has_horimetro: bool
    disabled: bool
    durh_number: str | None
    outorga_number: str | None
    barramento_durh: str | None
    last_tecnico_responsavel: str | None
    last_crea: str | None
    archived_at: datetime | None
    archived_reason: str | None
    archived_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ItemArchiveRequest(BaseModel):
    reason: str


class ItemCreateRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: uuid.UUID
    area_id: uuid.UUID
    name: str
    type: str
    limite_outorgado: float | None = None
    unit: str | None = None
    horas_operacao: int = 24
    corrego_method: str | None = None
    has_horimetro: bool = False
    durh_number: str | None = None
    outorga_number: str | None = None
    barramento_durh: str | None = None
