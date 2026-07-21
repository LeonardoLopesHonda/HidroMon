import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.services import reports as report_service

router = APIRouter()

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/reports/imasul")
def get_imasul_report(
    item_id: uuid.UUID,
    year: int,
    tecnico: str,
    crea: str,
    data: date,
    observacoes: str | None = None,
    barramento_durh: str | None = None,
    format: str = "xlsx",
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if format != "xlsx":
        raise HTTPException(status_code=400, detail="Formato não suportado")

    content = report_service.generate_imasul_report(
        db, item_id, year, tecnico, crea, data, observacoes, barramento_durh
    )
    filename = f"formulario-monitoramento-{item_id}-{year}.xlsx"
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/readings")
def get_readings_export(
    item_id: uuid.UUID,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if date_to < date_from:
        raise HTTPException(status_code=400, detail="'to' não pode ser anterior a 'from'")

    content, item_name = report_service.generate_readings_export(db, item_id, date_from, date_to)
    filename = report_service.export_filename(item_name, date_from, date_to)
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
