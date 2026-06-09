from sqlalchemy import Column, Integer, String, Float
from app.db.session import Base

class FarmRecord(Base):
    __tablename__ = "farm_records"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, unique=True, index=True, nullable=False)
    crop_type = Column(String, nullable=False)
    farm_area_acres = Column(Float, nullable=False)
    irrigation_type = Column(String, nullable=False)
    fertilizer_used_tons = Column(Float, nullable=False)
    pesticide_used_kg = Column(Float, nullable=False)
    yield_tons = Column(Float, nullable=False)
    soil_type = Column(String, nullable=False)
    season = Column(String, nullable=False)
    water_usage_cubic_meters = Column(Float, nullable=False)
    
    # Geographic metadata
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    geo_confidence = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Remote Sensing indicators
    ndvi = Column(Float, nullable=True)
    vhi = Column(Float, nullable=True)
    crop_health = Column(Float, nullable=True)
    water_stress = Column(Float, nullable=True)
    
    # Efficiency & Sustainability metrics
    water_efficiency = Column(Float, nullable=True)
    input_efficiency = Column(Float, nullable=True)
    sustainability_score = Column(Float, nullable=True)
    yield_sustainability_score = Column(Float, nullable=True)
    irrigation_score = Column(Float, nullable=True)
    soil_score = Column(Float, nullable=True)
