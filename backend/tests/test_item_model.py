import uuid
from datetime import datetime, timezone

from app.db.database import Area, MonitoredItem
from app.models.item import ItemResponse


def _base_kwargs(**overrides):
    kwargs = dict(
        id=uuid.uuid4(),
        area_id=uuid.uuid4(),
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
        last_tecnico_responsavel=None,
        last_crea=None,
        archived_at=None,
        archived_reason=None,
        archived_by=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return kwargs


def test_durh_fields_serialize_camel_case_when_set():
    item = ItemResponse(
        **_base_kwargs(
            durh_number="DURH-123",
            outorga_number="OUT-456",
            barramento_durh="DURH-789",
        )
    )

    payload = item.model_dump(by_alias=True)

    assert payload["durhNumber"] == "DURH-123"
    assert payload["outorgaNumber"] == "OUT-456"
    assert payload["barramentoDurh"] == "DURH-789"


def test_durh_fields_serialize_null_when_unset():
    item = ItemResponse(**_base_kwargs(type="pluviometro", has_horimetro=False))

    payload = item.model_dump(by_alias=True)

    assert payload["durhNumber"] is None
    assert payload["outorgaNumber"] is None
    assert payload["barramentoDurh"] is None


def test_durh_fields_round_trip_through_orm(db_session):
    area = Area(
        id=uuid.uuid4(),
        name="Área de teste",
        frequency="daily",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(area)
    db_session.flush()

    item = MonitoredItem(
        **_base_kwargs(
            area_id=area.id,
            durh_number="DURH-999",
            outorga_number="OUT-999",
        )
    )
    db_session.add(item)
    db_session.flush()

    fetched = db_session.query(MonitoredItem).filter(MonitoredItem.id == item.id).one()
    payload = ItemResponse.model_validate(fetched).model_dump(by_alias=True)

    assert payload["durhNumber"] == "DURH-999"
    assert payload["outorgaNumber"] == "OUT-999"
    assert payload["barramentoDurh"] is None
