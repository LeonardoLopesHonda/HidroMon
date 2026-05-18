from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import router

app = FastAPI(title="Telos Environmental Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
