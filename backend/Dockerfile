# Build from the repo root: docker build -f backend/Dockerfile -t telos-backend .
# The IMASUL report template lives at docs/templates/, outside backend/, so the
# build context must be the monorepo root rather than backend/ alone.
FROM python:3.11-slim

# libreoffice-calc (not the full libreoffice meta-package) is the minimal
# filter set that gives us a headless `soffice` binary able to convert the
# IMASUL xlsx template to PDF. Liberation/DejaVu fonts keep pt-BR accented
# characters from rendering as missing-glyph boxes in the PDF.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-calc \
      fonts-liberation \
      fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /srv/telos/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/app ./app
COPY docs/templates /srv/telos/docs/templates

ENV PATH="/srv/telos/backend/.venv/bin:${PATH}"

RUN useradd --create-home --home-dir /home/appuser appuser \
    && chown -R appuser:appuser /srv/telos
USER appuser
ENV HOME=/home/appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
