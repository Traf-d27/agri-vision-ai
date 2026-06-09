from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from app.db.session import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user_email = Column(String, nullable=True)
    crop_type = Column(String, nullable=False)
    soil_type = Column(String, nullable=False)
    irrigation_type = Column(String, nullable=False)
    season = Column(String, nullable=False)
    farm_area_acres = Column(Float, nullable=False)
    water_usage_cubic_meters = Column(Float, nullable=False)
    fertilizer_used_tons = Column(Float, nullable=False)
    pesticide_used_kg = Column(Float, nullable=False)
    predicted_yield = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
