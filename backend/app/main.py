from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import checkins, admin, report


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In dev, create tables directly. In prod use alembic migrations.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="BFE Farm Health API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(checkins.router, prefix="/api/checkins", tags=["check-ins"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(report.router, prefix="/api/report", tags=["report"])


@app.get("/health")
async def health():
    return {"status": "ok"}
