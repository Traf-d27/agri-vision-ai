import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal, get_db
from app.services.data_manager import seed_database
from app.api.routes import auth, farms, analytics, ml, reports, assistant
from app.models.prediction_log import PredictionLog
from app.models.report_log import ExportReportLog

# Create DB Tables
Base.metadata.create_all(bind=engine)

# Seed database
db = SessionLocal()
try:
    BASE_DIR = Path(__file__).resolve().parent.parent
    CSV_PATH = BASE_DIR / "public" / "agriculture_dataset.csv"
    if not CSV_PATH.exists():
        CSV_PATH = Path("C:/Users/Ayham/.gemini/antigravity-ide/scratch/agri-intel-platform/public/agriculture_dataset.csv")
    
    if CSV_PATH.exists():
        seed_database(db, str(CSV_PATH))
finally:
    db.close()

app = FastAPI(title=settings.PROJECT_NAME)

# Set CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(farms.router, prefix=f"{settings.API_V1_STR}/farms", tags=["farms"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(ml.router, prefix=f"{settings.API_V1_STR}/ml", tags=["ml"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_STR}/assistant", tags=["assistant"])

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"offline: {str(e)}"}
