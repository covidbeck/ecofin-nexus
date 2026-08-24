from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.db.database import init_db
from app.schemas.common import HealthResponseSchema


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # additive create_all; never drops data
    yield


app = FastAPI(title="Nexus API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponseSchema)
async def root_health() -> HealthResponseSchema:
    return HealthResponseSchema(status="ok", message="Nexus API is running")


app.include_router(router)
