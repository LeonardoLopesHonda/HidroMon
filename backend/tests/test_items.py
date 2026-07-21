import uuid
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.db.database import Area, MonitoredItem
from app.services import items as item_service


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
        archived_at=None,
        archived_reason=None,
        archived_by=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return MonitoredItem(**kwargs)


@pytest.fixture
def item(db_session):
    area = _area()
    db_session.add(area)
    db_session.flush()
    item = _item(area.id)
    db_session.add(item)
    db_session.flush()
    yield item
    db_session.rollback()
    db_session.query(MonitoredItem).filter(MonitoredItem.id == item.id).delete()
    db_session.query(Area).filter(Area.id == area.id).delete()
    db_session.commit()


def test_archive_item_sets_fields_and_disables(db_session, item):
    user_id = uuid.uuid4()

    archived = item_service.archive_item(db_session, item.id, user_id, "Poço desativado: substituído por novo hidrômetro")

    assert archived.disabled is True
    assert archived.archived_by == user_id
    assert archived.archived_reason == "Poço desativado: substituído por novo hidrômetro"
    assert archived.archived_at is not None


@pytest.mark.parametrize("reason", ["", "   "])
def test_archive_item_rejects_blank_reason(db_session, item, reason):
    with pytest.raises(HTTPException) as exc_info:
        item_service.archive_item(db_session, item.id, uuid.uuid4(), reason)
    assert exc_info.value.status_code == 422


def test_archive_item_missing_raises_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        item_service.archive_item(db_session, uuid.uuid4(), uuid.uuid4(), "motivo qualquer")
    assert exc_info.value.status_code == 404


def test_unarchive_item_clears_fields(db_session, item):
    item.disabled = True
    item.archived_at = datetime.now(timezone.utc)
    item.archived_reason = "motivo anterior"
    item.archived_by = uuid.uuid4()
    db_session.commit()

    unarchived = item_service.unarchive_item(db_session, item.id)

    assert unarchived.disabled is False
    assert unarchived.archived_at is None
    assert unarchived.archived_reason is None
    assert unarchived.archived_by is None


def test_unarchive_item_missing_raises_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        item_service.unarchive_item(db_session, uuid.uuid4())
    assert exc_info.value.status_code == 404
