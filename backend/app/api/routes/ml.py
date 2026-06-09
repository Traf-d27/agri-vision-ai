from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.db.session import get_db
from app.api.routes.analytics import get_filtered_df, get_filter_params
from app.services.ml_service import train_regression_models, train_classification_models, run_clustering_lab, predict_yield_on_fly
from pydantic import BaseModel

router = APIRouter()

class PredictionRequest(BaseModel):
    crop_type: str
    soil_type: str
    irrigation_type: str
    season: str
    farm_area_acres: float
    water_usage_cubic_meters: float
    fertilizer_used_tons: float
    pesticide_used_kg: float
    model_name: Optional[str] = "forest"

@router.post("/train")
def train_regression(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty or len(df) < 5:
        raise HTTPException(status_code=400, detail="Insufficient records to train regression models.")
        
    records = df.to_dict(orient='records')
    return train_regression_models(records)

@router.post("/train-classifier")
def train_classifier(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty or len(df) < 5:
        raise HTTPException(status_code=400, detail="Insufficient records to train classification models.")
        
    records = df.to_dict(orient='records')
    return train_classification_models(records)

@router.post("/clustering")
def run_clustering(
    selected_features: List[str] = Body(...),
    algo: str = Body("kmeans"),
    k: int = Body(3),
    eps: float = Body(1.2),
    min_pts: int = Body(3),
    num_clusters: int = Body(3),
    db: Session = Depends(get_db),
    filters: Dict[str, Any] = Depends(get_filter_params)
):
    df = get_filtered_df(db, filters)
    if df.empty or len(df) < 3:
        raise HTTPException(status_code=400, detail="Insufficient records to perform clustering.")
        
    records = df.to_dict(orient='records')
    return run_clustering_lab(records, selected_features, algo, k, eps, min_pts, num_clusters)

@router.post("/predict")
def predict_yield(
    payload: PredictionRequest,
    db: Session = Depends(get_db),
    filters: Dict[str, Any] = Depends(get_filter_params)
):
    df = get_filtered_df(db, filters)
    if df.empty:
        raise HTTPException(status_code=400, detail="No farm records found in database to fit predictor.")
        
    records = df.to_dict(orient='records')
    input_data = payload.model_dump()
    model_name = input_data.pop("model_name", "forest")
    
    return predict_yield_on_fly(records, input_data, model_name)
