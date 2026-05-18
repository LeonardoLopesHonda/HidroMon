from fastapi import APIRouter

from app.api.routes import areas, items, readings

router = APIRouter()
router.include_router(areas.router)
router.include_router(items.router)
router.include_router(readings.router)
