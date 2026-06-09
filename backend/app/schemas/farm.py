from pydantic import BaseModel, Field
from typing import Optional

class FarmRecordBase(BaseModel):
    farm_id: str
    crop_type: str
    farm_area_acres: float
    irrigation_type: str
    fertilizer_used_tons: float
    pesticide_used_kg: float
    yield_tons: float
    soil_type: str
    season: str
    water_usage_cubic_meters: float

class FarmRecordCreate(FarmRecordBase):
    pass

class FarmRecordResponse(BaseModel):
    id: int
    farm_id: str
    crop_type: str
    farm_area_acres: float
    irrigation_type: str
    fertilizer_used_tons: float
    pesticide_used_kg: float
    yield_tons: float
    soil_type: str
    season: str
    water_usage_cubic_meters: float
    
    # Geo columns
    state: Optional[str] = None
    city: Optional[str] = None
    geo_confidence: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # RS indicators
    ndvi: Optional[float] = None
    vhi: Optional[float] = None
    crop_health: Optional[float] = None
    water_stress: Optional[float] = None
    
    # Efficiencies
    water_efficiency: Optional[float] = None
    input_efficiency: Optional[float] = None
    sustainability_score: Optional[float] = None
    yield_sustainability_score: Optional[float] = None
    irrigation_score: Optional[float] = None
    soil_score: Optional[float] = None

    class Config:
        from_attributes = True
