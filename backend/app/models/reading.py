import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ReadingValues(BaseModel):
    valor: float | None = None
    nivel: float | None = None
    vazao: float | None = None


class ReadingCreate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: uuid.UUID
    item_id: uuid.UUID
    date: date
    recorded_at: datetime
    values: ReadingValues
    observacoes: str | None = None


class ReadingUpdate(BaseModel):
    values: ReadingValues
    observacoes: str | None = None


class ReadingResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: uuid.UUID
    item_id: uuid.UUID
    date: date
    recorded_at: datetime
    values: ReadingValues
    observacoes: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
