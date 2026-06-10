import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings, mask_database_url
from app.db.session import engine, Base, SessionLocal, get_db

print(f"INFO:     DATABASE_URL loaded: {mask_database_url(settings.DATABASE_URL)}")
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
    allow_origin_regex=r"https://.*\.vercel\.app",
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
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    diagnostics = {}
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        diagnostics["error"] = str(e)
        diagnostics["error_type"] = type(e).__name__
        diagnostics["database_url_configured"] = settings.DATABASE_URL is not None
        diagnostics["database_url_masked"] = mask_database_url(settings.DATABASE_URL)
        
        try:
            pool = engine.pool
            diagnostics["pool_class"] = pool.__class__.__name__
            diagnostics["pool_size"] = pool.size()
            diagnostics["pool_checkedin"] = pool.checkedin()
            diagnostics["pool_checkedout"] = pool.checkedout()
            diagnostics["pool_overflow"] = pool.overflow()
        except Exception as pool_err:
            diagnostics["pool_error"] = str(pool_err)
            
        try:
            import psycopg2
            diagnostics["psycopg2_version"] = psycopg2.__version__
        except Exception as driver_err:
            diagnostics["psycopg2_error"] = str(driver_err)
            
        try:
            import sqlalchemy
            diagnostics["sqlalchemy_version"] = sqlalchemy.__version__
        except Exception as sa_err:
            diagnostics["sqlalchemy_version_error"] = str(sa_err)
            
        return {
            "status": "unhealthy",
            "database": f"offline: {str(e)}",
            "diagnostics": diagnostics
        }
