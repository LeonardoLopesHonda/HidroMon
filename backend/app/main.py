import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.api import router

logger = logging.getLogger(__name__)

app = FastAPI(title="Telos Environmental Monitoring API")


class UnhandledExceptionMiddleware(BaseHTTPMiddleware):
    """Catches exceptions before they reach Starlette's outer ServerErrorMiddleware.

    ServerErrorMiddleware sits outside every middleware added via add_middleware()
    (including CORSMiddleware) — a bare `@app.exception_handler(Exception)` doesn't
    help either, since Starlette special-cases handlers for `Exception`/500 and
    routes them to that same outer middleware. Either way, an unhandled exception's
    500 response never passes back through CORSMiddleware, so the browser reports
    a misleading "blocked by CORS policy" error instead of the real failure.
    Catching it here — inside CORSMiddleware — lets the resulting response flow
    back out through it normally. Must be added to the app *before* CORSMiddleware
    (Starlette prepends on each add_middleware() call, so the middleware added
    last ends up outermost among user middleware, i.e. wrapping this one).
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.add_middleware(UnhandledExceptionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    # Content-Disposition isn't a CORS-safelisted response header by default, so
    # without this the browser can't read the report's server-provided filename.
    expose_headers=["Content-Disposition"],
)

app.include_router(router)
