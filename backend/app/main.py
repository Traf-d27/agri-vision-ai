import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings, mask_database_url
from app.db.session import engine, Base, SessionLocal, get_db

print(f"INFO:     DATABASE_URL loaded: {mask_database_url(settings.DATABASE_URL)}")

# Register all models for create_all to find them
from app.models.agricultural_data import State, District, CropRecord, WeatherRecord, SoilRecord
from app.models.india_intelligence import SoilType, CropType, SoilCropMapping, SatelliteMetric, YieldPrediction, CropDetail
from app.models.prediction_log import PredictionLog
from app.models.report_log import ExportReportLog

from app.services.data_manager import seed_database
from app.api.routes import auth, farms, analytics, ml, reports, assistant, data
from app.api.routes import india as india_router

# Lightweight SQLite Schema Migration for Render/Production deployments
from sqlalchemy import inspect
try:
    with engine.connect() as conn:
        inspector = inspect(engine)
        if inspector.has_table("states"):
            existing_cols = [c["name"] for c in inspector.get_columns("states")]
            for col, col_type in [("latitude", "FLOAT"), ("longitude", "FLOAT"), ("area_km2", "FLOAT"), ("region", "VARCHAR")]:
                if col not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE states ADD COLUMN {col} {col_type}"))
                        conn.commit()
                        print(f"INFO:     Auto-migrated table states: added column {col}")
                    except Exception as ex:
                        print(f"WARNING:  Failed to add column {col} to states: {ex}")
        if inspector.has_table("districts"):
            existing_cols = [c["name"] for c in inspector.get_columns("districts")]
            for col, col_type in [("latitude", "FLOAT"), ("longitude", "FLOAT")]:
                if col not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE districts ADD COLUMN {col} {col_type}"))
                        conn.commit()
                        print(f"INFO:     Auto-migrated table districts: added column {col}")
                    except Exception as ex:
                        print(f"WARNING:  Failed to add column {col} to districts: {ex}")
except Exception as migration_err:
    print(f"WARNING:  Auto-migration check skipped/failed: {migration_err}")

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

    # Seed Enriched India Data (legacy)
    ENRICHED_CSV_PATH = BASE_DIR / "public" / "enriched_agriculture_dataset.csv"
    if ENRICHED_CSV_PATH.exists():
        from app.services.etl_manager import seed_india_data
        seed_india_data(db, str(ENRICHED_CSV_PATH))

    # Seed India Intelligence Data (national-scale platform)
    try:
        from app.services.india_seed_data import seed_india_intelligence, seed_crop_details
        seed_india_intelligence(db)
        
        # Seed Crop_details.csv dataset
        CROP_DETAILS_CSV_PATH = BASE_DIR / "public" / "Crop_details.csv"
        if not CROP_DETAILS_CSV_PATH.exists():
            CROP_DETAILS_CSV_PATH = BASE_DIR.parent / "public" / "Crop_details.csv"
        if CROP_DETAILS_CSV_PATH.exists():
            seed_crop_details(db, str(CROP_DETAILS_CSV_PATH))
    except Exception as e:
        print(f"WARNING: India intelligence seed failed: {e}")

    # Seed default system admin user
    try:
        from app.models.user import User
        from app.core import security
        if db.query(User).count() == 0:
            default_admin = User(
                email="admin@agri-vision.ai",
                hashed_password=security.get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            print("INFO:     Default admin user created: admin@agri-vision.ai")
    except Exception as user_err:
        print(f"WARNING:  Default user seed skipped/failed: {user_err}")

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
app.include_router(data.router, prefix=f"{settings.API_V1_STR}/data", tags=["data"])
# 🇮🇳 India National Intelligence Platform
app.include_router(india_router.router, prefix=f"{settings.API_V1_STR}/india", tags=["india"])


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

# Mount static frontend files & serve SPA index.html or root API status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_PROJECT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_PROJECT_DIR.parent / "dist"
if not DIST_DIR.exists():
    DIST_DIR = BASE_PROJECT_DIR / "dist"

if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/")
    def root_api():
        return {
            "message": "Welcome to Agri-Vision AI Platform Backend API",
            "docs": "/docs",
            "health": "/api/health",
            "status": "online"
        }
