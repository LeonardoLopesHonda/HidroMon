import io
import uuid
from datetime import date, datetime, timezone

import openpyxl
import pytest
from fastapi import HTTPException

from app.db.database import Area, MonitoredItem, Reading
from app.services import reports as report_service


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
        name="Captação Serraria",
        type="hidrometro",
        limite_outorgado=None,
        unit=None,
        horas_operacao=24,
        corrego_method=None,
        has_horimetro=False,
        disabled=False,
        durh_number="002450",
        outorga_number="3891",
        barramento_durh=None,
        last_tecnico_responsavel=None,
        last_crea=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    kwargs.update(overrides)
    return MonitoredItem(**kwargs)


def _reading(item_id, *, d: date, valor: float, **overrides):
    kwargs = dict(
        id=uuid.uuid4(),
        item_id=item_id,
        date=d,
        recorded_at=datetime(d.year, d.month, d.day, 12, tzinfo=timezone.utc),
        valor=valor,
        horimetro=None,
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
    yield item
    db_session.rollback()
    db_session.query(Reading).filter(Reading.item_id == item.id).delete()
    db_session.query(MonitoredItem).filter(MonitoredItem.id == item.id).delete()
    db_session.query(Area).filter(Area.id == area.id).delete()
    db_session.commit()


# --- pure function: monthly_consumption_by_month -------------------------------------


def test_monthly_consumption_basic_delta():
    item_id = uuid.uuid4()
    readings = [
        _reading(item_id, d=date(2024, 1, 5), valor=100.0),
        _reading(item_id, d=date(2024, 1, 20), valor=150.0),
        _reading(item_id, d=date(2024, 2, 10), valor=200.0),
    ]
    result = report_service.monthly_consumption_by_month(readings, 2024)
    assert result[1] == pytest.approx(150.0 - 100.0)
    assert result[2] == pytest.approx(200.0 - 150.0)


def test_monthly_consumption_zero_fills_empty_month():
    item_id = uuid.uuid4()
    readings = [
        _reading(item_id, d=date(2024, 1, 31), valor=100.0),
        _reading(item_id, d=date(2024, 3, 1), valor=140.0),
    ]
    result = report_service.monthly_consumption_by_month(readings, 2024)
    assert 2 not in result  # no readings in February at all
    assert result[3] == pytest.approx(140.0 - 100.0)


def test_monthly_consumption_start_of_history_has_no_baseline():
    item_id = uuid.uuid4()
    readings = [
        _reading(item_id, d=date(2024, 5, 10), valor=100.0),
        _reading(item_id, d=date(2024, 5, 25), valor=130.0),
    ]
    result = report_service.monthly_consumption_by_month(readings, 2024)
    assert result[5] == pytest.approx(130.0 - 100.0)


def test_monthly_consumption_january_baseline_crosses_year_boundary():
    item_id = uuid.uuid4()
    readings = [
        _reading(item_id, d=date(2023, 12, 28), valor=90.0),
        _reading(item_id, d=date(2024, 1, 15), valor=110.0),
    ]
    result = report_service.monthly_consumption_by_month(readings, 2024)
    assert result[1] == pytest.approx(110.0 - 90.0)


# --- full report generation ------------------------------------------------------------


def test_report_requires_auth(client, item):
    response = client.get(
        "/reports/imasul",
        params={"item_id": str(item.id), "year": 2024, "tecnico": "Fulano", "crea": "123", "data": "2024-01-01"},
    )
    assert response.status_code in (401, 403)


def test_report_rejects_item_without_durh_outorga(db_session):
    area = _area()
    db_session.add(area)
    db_session.flush()
    ineligible = _item(area.id, durh_number=None, outorga_number=None)
    db_session.add(ineligible)
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        report_service.generate_imasul_report(
            db_session, ineligible.id, 2024, "Fulano", "123", date(2024, 1, 1), None, None
        )
    assert exc_info.value.status_code == 422


def test_report_fills_header_and_vazao_leap_year(db_session, item):
    db_session.add_all(
        [
            _reading(item.id, d=date(2024, 1, 5), valor=100.0),
            _reading(item.id, d=date(2024, 1, 31), valor=224.0),  # +124 m3 in January
        ]
    )
    db_session.flush()

    content = report_service.generate_imasul_report(
        db_session,
        item.id,
        2024,
        "Ana Souza",
        "MS-12345",
        date(2024, 12, 20),
        "Sem intercorrências",
        "DURH-BAR-1",
    )

    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active

    # Header fields
    assert ws["D1"].value == 2024
    assert ws["H5"].value == 2024
    assert ws["B4"].value == f"CAPITAÇÃO\n{item.name}"
    assert ws["B5"].value == "002450"
    assert ws["F5"].value == "3891"

    # January: row 7, cols B/C/D (consumption 124 m3 over 31 days, 24h/dia)
    assert ws["B7"].value == pytest.approx(124.0 / (31 * 24))
    assert ws["C7"].value == 24
    assert ws["D7"].value == 31

    # February 2024 is a leap year: 29 calendar days, zero readings -> 0,00
    assert ws["B8"].value == pytest.approx(0.0)
    assert ws["C8"].value == 24
    assert ws["D8"].value == 29

    # Filing fields
    assert ws["A14"].value == "Sem intercorrências"
    assert ws["D24"].value == "DURH-BAR-1"
    assert ws["C26"].value == "Ana Souza"
    assert ws["H26"].value == "MS-12345"
    assert ws["H28"].value == datetime(2024, 12, 20)


def test_report_persists_tecnico_crea_for_next_prefill(db_session, item):
    report_service.generate_imasul_report(
        db_session, item.id, 2025, "Beatriz Lima", "MS-98765", date(2025, 1, 10), None, None
    )

    db_session.refresh(item)
    assert item.last_tecnico_responsavel == "Beatriz Lima"
    assert item.last_crea == "MS-98765"


def test_report_neutralizes_formula_injection_in_free_text_fields(db_session, item):
    content = report_service.generate_imasul_report(
        db_session,
        item.id,
        2025,
        "=cmd|'/c calc'!A1",
        "+123",
        date(2025, 1, 10),
        "-2+3",
        "@evil",
    )

    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active

    assert ws["C26"].value == "'=cmd|'/c calc'!A1"
    assert ws["H26"].value == "'+123"
    assert ws["A14"].value == "'-2+3"
    assert ws["D24"].value == "'@evil"
