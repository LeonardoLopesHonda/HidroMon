import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.services import reports as report_service

router = APIRouter()


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
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
