import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    pass


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String)
    frequency: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MonitoredItem(Base):
    __tablename__ = "monitored_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id"))
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    limite_outorgado: Mapped[float | None] = mapped_column(Numeric(12, 3))
    unit: Mapped[str | None] = mapped_column(String)
    horas_operacao: Mapped[int] = mapped_column(Integer)
    corrego_method: Mapped[str | None] = mapped_column(String)
    has_horimetro: Mapped[bool] = mapped_column(Boolean)
    disabled: Mapped[bool] = mapped_column(Boolean)
    durh_number: Mapped[str | None] = mapped_column(String)
    outorga_number: Mapped[str | None] = mapped_column(String)
    barramento_durh: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("monitored_items.id"))
    date: Mapped[date] = mapped_column(Date)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valor: Mapped[float | None] = mapped_column(Numeric(12, 3))
    horimetro: Mapped[float | None] = mapped_column(Numeric(12, 3))
    nivel: Mapped[float | None] = mapped_column(Numeric(6, 3))
    vazao: Mapped[float | None] = mapped_column(Numeric(10, 4))
    raw_values: Mapped[dict | None] = mapped_column(JSONB)
    observacoes: Mapped[str | None] = mapped_column(String)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
