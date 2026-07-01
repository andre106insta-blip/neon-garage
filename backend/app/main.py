from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .api import cars, expenses, plans, stats
from .db import backfill_photos, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await backfill_photos()
    yield


app = FastAPI(title="Reseller MAT API", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cars.router)
app.include_router(expenses.router)
app.include_router(plans.router)
app.include_router(stats.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
