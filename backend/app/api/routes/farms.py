import io
import tempfile
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.farm import FarmRecord
from app.schemas.farm import FarmRecordCreate, FarmRecordResponse
from app.api.routes.auth import get_current_user, User
from app.services.data_manager import enrich_and_calculate_metrics, load_and_impute_csv

router = APIRouter()

def check_role(user: User, allowed_roles: List[str]):
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions for this operation. Your role is '{user.role}', but this action requires one of: {', '.join(allowed_roles)}."
        )

def apply_farm_filters(
    query, 
    crop_type: Optional[str] = None, 
    soil_type: Optional[str] = None, 
    irrigation_type: Optional[str] = None, 
    season: Optional[str] = None, 
    yield_min: Optional[float] = None, 
    yield_max: Optional[float] = None, 
    area_min: Optional[float] = None, 
    area_max: Optional[float] = None, 
    water_min: Optional[float] = None, 
    water_max: Optional[float] = None, 
    fertilizer_min: Optional[float] = None, 
    fertilizer_max: Optional[float] = None, 
    pesticide_min: Optional[float] = None, 
    pesticide_max: Optional[float] = None
):
    if crop_type and crop_type != 'All':
        query = query.filter(FarmRecord.crop_type == crop_type)
    if soil_type and soil_type != 'All':
        query = query.filter(FarmRecord.soil_type == soil_type)
    if irrigation_type and irrigation_type != 'All':
        query = query.filter(FarmRecord.irrigation_type == irrigation_type)
    if season and season != 'All':
        query = query.filter(FarmRecord.season == season)
        
    if yield_min is not None:
        query = query.filter(FarmRecord.yield_tons >= yield_min)
    if yield_max is not None:
        query = query.filter(FarmRecord.yield_tons <= yield_max)
    if area_min is not None:
        query = query.filter(FarmRecord.farm_area_acres >= area_min)
    if area_max is not None:
        query = query.filter(FarmRecord.farm_area_acres <= area_max)
    if water_min is not None:
        query = query.filter(FarmRecord.water_usage_cubic_meters >= water_min)
    if water_max is not None:
        query = query.filter(FarmRecord.water_usage_cubic_meters <= water_max)
    if fertilizer_min is not None:
        query = query.filter(FarmRecord.fertilizer_used_tons >= fertilizer_min)
    if fertilizer_max is not None:
        query = query.filter(FarmRecord.fertilizer_used_tons <= fertilizer_max)
    if pesticide_min is not None:
        query = query.filter(FarmRecord.pesticide_used_kg >= pesticide_min)
    if pesticide_max is not None:
        query = query.filter(FarmRecord.pesticide_used_kg <= pesticide_max)
    return query

@router.get("/", response_model=List[FarmRecordResponse])
def get_farms(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 1500,
    crop_type: Optional[str] = None,
    soil_type: Optional[str] = None,
    irrigation_type: Optional[str] = None,
    season: Optional[str] = None,
    yield_min: Optional[float] = None,
    yield_max: Optional[float] = None,
    area_min: Optional[float] = None,
    area_max: Optional[float] = None,
    water_min: Optional[float] = None,
    water_max: Optional[float] = None,
    fertilizer_min: Optional[float] = None,
    fertilizer_max: Optional[float] = None,
    pesticide_min: Optional[float] = None,
    pesticide_max: Optional[float] = None,
):
    query = db.query(FarmRecord)
    query = apply_farm_filters(
        query, crop_type, soil_type, irrigation_type, season,
        yield_min, yield_max, area_min, area_max, water_min, water_max,
        fertilizer_min, fertilizer_max, pesticide_min, pesticide_max
    )
    return query.offset(skip).limit(limit).all()

@router.get("/{record_id}", response_model=FarmRecordResponse)
def get_farm_record(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(FarmRecord).filter(FarmRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Farm record not found.")
    return rec

@router.post("/", response_model=FarmRecordResponse)
def create_farm_record(
    record_in: FarmRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "analyst"])
    
    existing = db.query(FarmRecord).filter(FarmRecord.farm_id == record_in.farm_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Farm with this ID already exists.")
        
    try:
        rec_dict = record_in.model_dump()
        enriched_dict = enrich_and_calculate_metrics(rec_dict)
        
        new_rec = FarmRecord(**enriched_dict)
        db.add(new_rec)
        db.commit()
        db.refresh(new_rec)
        return new_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database insert error: {str(e)}")

@router.put("/{record_id}", response_model=FarmRecordResponse)
def update_farm_record(
    record_id: int,
    record_in: FarmRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "analyst"])
    
    rec = db.query(FarmRecord).filter(FarmRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Farm record not found.")
        
    try:
        rec_dict = record_in.model_dump()
        enriched_dict = enrich_and_calculate_metrics(rec_dict)
        
        for key, value in enriched_dict.items():
            setattr(rec, key, value)
            
        db.commit()
        db.refresh(rec)
        return rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin"])
    
    rec = db.query(FarmRecord).filter(FarmRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Farm record not found.")
        
    try:
        db.delete(rec)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database delete error: {str(e)}")

@router.post("/upload", response_model=List[FarmRecordResponse])
async def upload_csv_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "analyst"])
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV.")
        
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        enriched_records = load_and_impute_csv(temp_path)
        
        inserted_records = []
        for rec_dict in enriched_records:
            existing = db.query(FarmRecord).filter(FarmRecord.farm_id == rec_dict['farm_id']).first()
            if existing:
                # Update existing
                for k, v in rec_dict.items():
                    setattr(existing, k, v)
                inserted_records.append(existing)
            else:
                # Insert new
                new_rec = FarmRecord(**rec_dict)
                db.add(new_rec)
                inserted_records.append(new_rec)
                
        db.commit()
        for rec in inserted_records:
            db.refresh(rec)
            
        return inserted_records
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")
