import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.db.database import Area, MonitoredItem, Reading
from app.models.reading import ReadingUpdate, ReadingValues
from app.services import readings as reading_service


def _area(**overrides):
    kwargs = dict(
        id=uuid.uuid4(),
        name="Área de teste",
        frequency="daily",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return Area(**kwargs)


def _item(area_id, **overrides):
    kwargs = dict(
        id=uuid.uuid4(),
        area_id=area_id,
        name="Poço 1",
        type="hidrometro",
        limite_outorgado=None,
        unit=None,
        horas_operacao=24,
        corrego_method=None,
        has_horimetro=True,
        disabled=False,
        durh_number=None,
        outorga_number=None,
        barramento_durh=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return MonitoredItem(**kwargs)


def _reading(item_id, *, day_offset: int, valor=None, horimetro=None, **overrides):
    base_date = date(2026, 7, 1) + timedelta(days=day_offset)
    kwargs = dict(
        id=uuid.uuid4(),
        item_id=item_id,
        date=base_date,
        recorded_at=datetime(base_date.year, base_date.month, base_date.day, 12, tzinfo=timezone.utc),
        valor=valor,
        horimetro=horimetro,
        nivel=None,
        vazao=None,
        raw_values=None,
        observacoes=None,
        created_by=uuid.uuid4(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return Reading(**kwargs)


@pytest.fixture
def item(db_session):
    area = _area()
    db_session.add(area)
    db_session.flush()
    item = _item(area.id)
    db_session.add(item)
    db_session.flush()
    return item


def _update(db_session, reading, *, valor=None, horimetro=None, observacoes=None):
    data = ReadingUpdate(
        values=ReadingValues(valor=valor, horimetro=horimetro),
        observacoes=observacoes,
    )
    return reading_service.update_reading(db_session, reading.id, data)


def test_blank_horimetro_keeps_stored_value(db_session, item):
    reading = _reading(item.id, day_offset=0, valor=100.0, horimetro=50.0)
    db_session.add(reading)
    db_session.flush()

    _update(db_session, reading, valor=105.0, horimetro=None)

    db_session.refresh(reading)
    assert float(reading.horimetro) == 50.0


def test_horimetro_below_earlier_neighbor_rejected(db_session, item):
    earlier = _reading(item.id, day_offset=0, valor=100.0, horimetro=50.0)
    target = _reading(item.id, day_offset=1, valor=105.0, horimetro=None)
    db_session.add_all([earlier, target])
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        _update(db_session, target, valor=105.0, horimetro=40.0)
    assert exc_info.value.status_code == 422


def test_horimetro_above_later_neighbor_rejected(db_session, item):
    target = _reading(item.id, day_offset=0, valor=100.0, horimetro=None)
    later = _reading(item.id, day_offset=1, valor=105.0, horimetro=60.0)
    db_session.add_all([target, later])
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        _update(db_session, target, valor=100.0, horimetro=70.0)
    assert exc_info.value.status_code == 422


def test_horimetro_within_bounds_saves(db_session, item):
    earlier = _reading(item.id, day_offset=0, valor=100.0, horimetro=50.0)
    target = _reading(item.id, day_offset=1, valor=105.0, horimetro=None)
    later = _reading(item.id, day_offset=2, valor=110.0, horimetro=60.0)
    db_session.add_all([earlier, target, later])
    db_session.flush()

    _update(db_session, target, valor=105.0, horimetro=55.0)

    db_session.refresh(target)
    assert float(target.horimetro) == 55.0


def test_neighbors_without_hours_are_skipped(db_session, item):
    earlier_with_hours = _reading(item.id, day_offset=0, valor=100.0, horimetro=50.0)
    gap = _reading(item.id, day_offset=1, valor=102.0, horimetro=None)
    target = _reading(item.id, day_offset=2, valor=105.0, horimetro=None)
    db_session.add_all([earlier_with_hours, gap, target])
    db_session.flush()

    # No later neighbor with hours, so no upper bound; only the day-0 lower bound applies.
    _update(db_session, target, valor=105.0, horimetro=999.0)

    db_session.refresh(target)
    assert float(target.horimetro) == 999.0

    with pytest.raises(HTTPException) as exc_info:
        _update(db_session, target, valor=105.0, horimetro=40.0)
    assert exc_info.value.status_code == 422


def test_non_horimetro_fields_remain_last_write_wins(db_session, item):
    reading = _reading(item.id, day_offset=0, valor=100.0, horimetro=50.0, observacoes="original")
    db_session.add(reading)
    db_session.flush()

    _update(db_session, reading, valor=101.0, horimetro=None, observacoes="editado")

    db_session.refresh(reading)
    assert float(reading.valor) == 101.0
    assert reading.observacoes == "editado"
