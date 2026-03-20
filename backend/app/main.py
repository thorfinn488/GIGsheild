from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import Base
from app.db import engine
from app.routes.auth import router as auth_router
from app.routes.policies import router as policies_router
from app.routes.triggers import router as triggers_router
from app.routes.claims import router as claims_router
from app.routes.payouts import router as payouts_router
from app.routes.admin import router as admin_router


def create_app() -> FastAPI:
    app = FastAPI(title="GigShield API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # For prototype: ensure schema exists immediately (also helps TestClient).
    Base.metadata.create_all(bind=engine)

    @app.get("/health")
    def health():
        return {"ok": True}

    app.include_router(auth_router)
    app.include_router(policies_router)
    app.include_router(triggers_router)
    app.include_router(claims_router)
    app.include_router(payouts_router)
    app.include_router(admin_router)
    return app


app = create_app()

