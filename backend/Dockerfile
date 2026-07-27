FROM ghcr.io/astral-sh/uv:latest AS uv_setup
FROM python:3.13.14-slim-bookworm AS builder

COPY --from=uv_setup /uv /uvx /bin/

WORKDIR /backend
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

FROM python:3.13.14-slim-bookworm

WORKDIR /backend

RUN groupadd --system app && useradd --system --gid app app

COPY --from=builder --chown=app:app /backend/.venv /backend/.venv
COPY --from=builder --chown=app:app /backend/app ./app

ENV PATH="/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER app

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]