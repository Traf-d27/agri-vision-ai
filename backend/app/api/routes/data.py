from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.agricultural_data import State, District, CropRecord, WeatherRecord, SoilRecord
from pydantic import BaseModel

router = APIRouter()

# Schemas
class StateResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class DistrictResponse(BaseModel):
    id: int
    name: str
    state_id: int

    class Config:
        from_attributes = True

class CropResponse(BaseModel):
    id: int
    crop_type: str
    state_id: int
    district_id: int
    farm_area_acres: float
    irrigation_type: str
    fertilizer_used_tons: float
    pesticide_used_kg: float
    yield_tons: float
    water_usage_cubic_meters: float
    soil_type: str
    season: str

    class Config:
        from_attributes = True

class WeatherResponse(BaseModel):
    id: int
    state_id: int
    district_id: int
    avg_temp: float
    annual_rainfall: float
    avg_humidity: float
    avg_windspeed: float
    drought_risk: str
    flood_risk: str

    class Config:
        from_attributes = True

class SoilResponse(BaseModel):
    id: int
    state_id: int
    district_id: int
    soil_type: str
    soil_index: float

    class Config:
        from_attributes = True

# Endpoints
@router.get("/states", response_model=List[StateResponse])
def get_states(db: Session = Depends(get_db)):
    return db.query(State).order_by(State.name).all()

@router.get("/districts", response_model=List[DistrictResponse])
def get_districts(state_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(District)
    if state_id is not None:
        query = query.filter(District.state_id == state_id)
    return query.order_by(District.name).all()

@router.get("/crops", response_model=List[CropResponse])
def get_crops(state_id: Optional[int] = None, district_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(CropRecord)
    if state_id is not None:
        query = query.filter(CropRecord.state_id == state_id)
    if district_id is not None:
        query = query.filter(CropRecord.district_id == district_id)
    return query.all()

@router.get("/weather", response_model=List[WeatherResponse])
def get_weather(state_id: Optional[int] = None, district_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(WeatherRecord)
    if state_id is not None:
        query = query.filter(WeatherRecord.state_id == state_id)
    if district_id is not None:
        query = query.filter(WeatherRecord.district_id == district_id)
    return query.all()

@router.get("/soil", response_model=List[SoilResponse])
def get_soil(state_id: Optional[int] = None, district_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(SoilRecord)
    if state_id is not None:
        query = query.filter(SoilRecord.state_id == state_id)
    if district_id is not None:
        query = query.filter(SoilRecord.district_id == district_id)
    return query.all()
