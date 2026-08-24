from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.db.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # additive create_all; never drops data
    yield


app = FastAPI(title="Nexus API", lifespan=lifespan)

# LAN demo: jury laptops open the frontend via this laptop's Wi-Fi IP, so the
# browser Origin is http://<LAN_IP>:3000. The regex admits only private
# 192.168.x.x / 10.x.x.x subnets on port 3000 — never "*" with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.8.202:3000",
    ],
    allow_origin_regex=r"^http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
