import re
import pandas as pd
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.farm import FarmRecord

def map_record_to_geography(crop: str, soil: str, season: str, farm_id: str) -> Dict[str, Any]:
    crop_lower = str(crop).strip().lower()
    soil_lower = str(soil).strip().lower()
    season_lower = str(season).strip().lower()
    
    # Extract numerical index from Farm_ID to keep mapping deterministic
    match = re.search(r'\d+', str(farm_id))
    if match:
        idx = int(match.group())
    else:
        idx = sum(ord(char) for char in str(farm_id))
        
    candidates = []
    
    if 'rice' in crop_lower:
        candidates = [
            {'state': 'West Bengal', 'city': 'Bardhaman', 'baseConf': 95},
            {'state': 'Andhra Pradesh', 'city': 'Nellore', 'baseConf': 92},
            {'state': 'Punjab', 'city': 'Patiala', 'baseConf': 88},
            {'state': 'Tamil Nadu', 'city': 'Thanjavur', 'baseConf': 90},
            {'state': 'Odisha', 'city': 'Cuttack', 'baseConf': 86},
            {'state': 'Assam', 'city': 'Jorhat', 'baseConf': 87}
        ]
    elif 'wheat' in crop_lower:
        candidates = [
            {'state': 'Punjab', 'city': 'Ludhiana', 'baseConf': 96},
            {'state': 'Haryana', 'city': 'Karnal', 'baseConf': 94},
            {'state': 'Uttar Pradesh', 'city': 'Meerut', 'baseConf': 92},
            {'state': 'Madhya Pradesh', 'city': 'Indore', 'baseConf': 89},
            {'state': 'Rajasthan', 'city': 'Ganganagar', 'baseConf': 87}
        ]
    elif 'cotton' in crop_lower:
        candidates = [
            {'state': 'Gujarat', 'city': 'Rajkot', 'baseConf': 95},
            {'state': 'Maharashtra', 'city': 'Nagpur', 'baseConf': 93},
            {'state': 'Telangana', 'city': 'Warangal', 'baseConf': 88},
            {'state': 'Rajasthan', 'city': 'Hanumangarh', 'baseConf': 83}
        ]
    elif 'sugarcane' in crop_lower:
        candidates = [
            {'state': 'Uttar Pradesh', 'city': 'Muzaffarnagar', 'baseConf': 95},
            {'state': 'Maharashtra', 'city': 'Kolhapur', 'baseConf': 92},
            {'state': 'Karnataka', 'city': 'Belagavi', 'baseConf': 90},
            {'state': 'Tamil Nadu', 'city': 'Coimbatore', 'baseConf': 88}
        ]
    elif 'maize' in crop_lower:
        candidates = [
            {'state': 'Karnataka', 'city': 'Haveri', 'baseConf': 92},
            {'state': 'Madhya Pradesh', 'city': 'Chhindwara', 'baseConf': 88},
            {'state': 'Maharashtra', 'city': 'Jalgaon', 'baseConf': 89},
            {'state': 'Bihar', 'city': 'Begusarai', 'baseConf': 86}
        ]
    elif 'soybean' in crop_lower:
        candidates = [
            {'state': 'Madhya Pradesh', 'city': 'Ujjain', 'baseConf': 95},
            {'state': 'Maharashtra', 'city': 'Latur', 'baseConf': 91},
            {'state': 'Rajasthan', 'city': 'Baran', 'baseConf': 86}
        ]
    elif 'potato' in crop_lower:
        candidates = [
            {'state': 'Uttar Pradesh', 'city': 'Agra', 'baseConf': 94},
            {'state': 'West Bengal', 'city': 'Hooghly', 'baseConf': 92},
            {'state': 'Bihar', 'city': 'Patna', 'baseConf': 88}
        ]
    elif 'tomato' in crop_lower:
        candidates = [
            {'state': 'Andhra Pradesh', 'city': 'Chittoor', 'baseConf': 92},
            {'state': 'Karnataka', 'city': 'Kolar', 'baseConf': 90},
            {'state': 'Maharashtra', 'city': 'Nashik', 'baseConf': 89}
        ]
    elif 'carrot' in crop_lower:
        candidates = [
            {'state': 'Haryana', 'city': 'Kurukshetra', 'baseConf': 91},
            {'state': 'Punjab', 'city': 'Hoshiarpur', 'baseConf': 88}
        ]
    elif 'barley' in crop_lower:
        candidates = [
            {'state': 'Rajasthan', 'city': 'Jaipur', 'baseConf': 90},
            {'state': 'Uttar Pradesh', 'city': 'Aligarh', 'baseConf': 88}
        ]
    else:
        candidates = [
            {'state': 'Madhya Pradesh', 'city': 'Bhopal', 'baseConf': 80},
            {'state': 'Maharashtra', 'city': 'Pune', 'baseConf': 80},
            {'state': 'Uttar Pradesh', 'city': 'Lucknow', 'baseConf': 80},
            {'state': 'Karnataka', 'city': 'Bangalore', 'baseConf': 80},
            {'state': 'Gujarat', 'city': 'Ahmedabad', 'baseConf': 80}
        ]
        
    choice = candidates[idx % len(candidates)]
    
    score_adjustment = 0
    if choice['state'] == 'West Bengal' and ('loamy' in soil_lower or 'clay' in soil_lower):
        score_adjustment += 4
    if choice['state'] == 'Punjab' and 'loamy' in soil_lower:
        score_adjustment += 3
    if choice['state'] == 'Maharashtra' and 'clay' in soil_lower:
        score_adjustment += 5
    if choice['state'] == 'Gujarat' and 'clay' in soil_lower:
        score_adjustment += 4
    if choice['state'] == 'Rajasthan' and 'sandy' in soil_lower:
        score_adjustment += 5
    if choice['state'] == 'Karnataka' and 'loamy' in soil_lower:
        score_adjustment += 3
        
    if 'wheat' in crop_lower and 'rabi' in season_lower:
        score_adjustment += 4
    if 'rice' in crop_lower and 'kharif' in season_lower:
        score_adjustment += 4
    if 'cotton' in crop_lower and 'kharif' in season_lower:
        score_adjustment += 3
        
    city_coords = {
        'Bardhaman': [23.23, 87.86],
        'Nellore': [14.44, 79.98],
        'Patiala': [30.34, 76.38],
        'Thanjavur': [10.78, 79.13],
        'Cuttack': [20.46, 85.88],
        'Jorhat': [26.75, 94.20],
        'Ludhiana': [30.90, 75.85],
        'Karnal': [29.68, 76.99],
        'Meerut': [28.98, 77.70],
        'Indore': [22.71, 75.85],
        'Ganganagar': [29.91, 73.87],
        'Rajkot': [22.30, 70.80],
        'Nagpur': [21.14, 79.08],
        'Warangal': [17.96, 79.59],
        'Hanumangarh': [29.58, 74.32],
        'Muzaffarnagar': [29.47, 77.70],
        'Kolhapur': [16.70, 74.24],
        'Belagavi': [15.84, 74.49],
        'Coimbatore': [11.01, 76.95],
        'Haveri': [14.79, 75.40],
        'Chhindwara': [22.05, 78.93],
        'Jalgaon': [21.00, 75.56],
        'Begusarai': [25.41, 86.12],
        'Ujjain': [23.17, 75.78],
        'Latur': [18.40, 76.56],
        'Baran': [25.10, 76.51],
        'Agra': [27.17, 78.00],
        'Hooghly': [22.90, 88.39],
        'Patna': [25.59, 85.13],
        'Chittoor': [13.21, 79.10],
        'Kolar': [13.13, 78.13],
        'Nashik': [19.99, 73.78],
        'Kurukshetra': [29.96, 76.83],
        'Hoshiarpur': [31.51, 75.91],
        'Jaipur': [26.91, 75.78],
        'Aligarh': [27.89, 78.08],
        'Bhopal': [23.25, 77.41],
        'Pune': [18.52, 73.85],
        'Lucknow': [26.84, 80.94],
        'Bangalore': [12.97, 77.59],
        'Ahmedabad': [23.02, 72.57]
    }
    
    base_coord = city_coords.get(choice['city'], [20.59, 78.96])
    
    # Jitter
    jitter_lat = (((idx * 7) % 100) / 100.0) * 0.12 - 0.06
    jitter_lng = (((idx * 13) % 100) / 100.0) * 0.12 - 0.06
    
    latitude = round(base_coord[0] + jitter_lat, 5)
    longitude = round(base_coord[1] + jitter_lng, 5)
    
    geo_confidence = min(99.0, max(50.0, float(choice['baseConf'] + score_adjustment)))
    
    return {
        'state': choice['state'],
        'city': choice['city'],
        'geo_confidence': geo_confidence,
        'latitude': latitude,
        'longitude': longitude
    }

def enrich_and_calculate_metrics(rec: Dict[str, Any]) -> Dict[str, Any]:
    crop = rec['crop_type']
    soil = rec['soil_type']
    season = rec['season']
    farm_id = rec['farm_id']
    area = rec['farm_area_acres']
    fertilizer = rec['fertilizer_used_tons']
    pesticide = rec['pesticide_used_kg']
    yield_val = rec['yield_tons']
    water = rec['water_usage_cubic_meters']
    irrigation = rec['irrigation_type']
    
    # Geocoding
    geo = map_record_to_geography(crop, soil, season, farm_id)
    rec.update(geo)
    
    # Efficiencies
    water_efficiency = yield_val / water if water > 0 else 0.0
    total_chemical_inputs_tons = fertilizer + (pesticide / 1000.0)
    input_efficiency = yield_val / total_chemical_inputs_tons if total_chemical_inputs_tons > 0 else 0.0
    
    # Scores
    irrigation_score = 50.0
    irr_lower = irrigation.lower()
    if irr_lower == 'drip':
        irrigation_score = 100.0
    elif irr_lower == 'sprinkler':
        irrigation_score = 80.0
    elif irr_lower == 'rain-fed':
        irrigation_score = 70.0
    elif irr_lower == 'manual':
        irrigation_score = 40.0
    elif irr_lower == 'flood':
        irrigation_score = 20.0
        
    soil_score = 60.0
    soil_lower = soil.lower()
    if soil_lower == 'loamy':
        soil_score = 100.0
    elif soil_lower == 'clay':
        soil_score = 90.0
    elif soil_lower == 'silty':
        soil_score = 80.0
    elif soil_lower == 'peaty':
        soil_score = 70.0
    elif soil_lower == 'sandy':
        soil_score = 30.0
        
    normalized_we = min(100.0, (water_efficiency / 0.001) * 100.0)
    chem_density = (fertilizer * 1000.0 + pesticide) / area if area > 0 else 0.0
    normalized_chem = max(0.0, 100.0 - (chem_density / 100.0))
    
    sustainability_score = round(
        (normalized_we * 0.3) +
        (normalized_chem * 0.25) +
        (irrigation_score * 0.25) +
        (soil_score * 0.2),
        1
    )
    
    yield_sustainability_score = yield_val * (sustainability_score / 100.0)
    
    # Remote Sensing Simulation
    yield_per_acre = yield_val / area if area > 0 else 0.0
    water_per_acre = water / area if area > 0 else 0.0
    
    ndvi = 0.3 + (yield_per_acre * 1.5) - (water_per_acre / 4000.0) * 0.1 + (sustainability_score / 100.0) * 0.15
    ndvi = round(min(0.88, max(0.12, ndvi)), 3)
    vhi = round(ndvi * 100.0, 1)
    crop_health = round((sustainability_score * 0.4) + (vhi * 0.6), 1)
    
    water_stress = round((water_per_acre / 1000.0) * 45.0 - (yield_per_acre * 15.0) + 30.0, 1)
    water_stress = min(95.0, max(5.0, water_stress))
    
    rec.update({
        'water_efficiency': water_efficiency,
        'input_efficiency': input_efficiency,
        'sustainability_score': sustainability_score,
        'yield_sustainability_score': yield_sustainability_score,
        'irrigation_score': irrigation_score,
        'soil_score': soil_score,
        'ndvi': ndvi,
        'vhi': vhi,
        'crop_health': crop_health,
        'water_stress': water_stress
    })
    
    return rec

def load_and_impute_csv(csv_path: str) -> List[Dict[str, Any]]:
    df = pd.read_csv(csv_path)
    
    col_mapping = {
        'Farm_ID': 'farm_id',
        'Crop_Type': 'crop_type',
        'Farm_Area(acres)': 'farm_area_acres',
        'Irrigation_Type': 'irrigation_type',
        'Fertilizer_Used(tons)': 'fertilizer_used_tons',
        'Pesticide_Used(kg)': 'pesticide_used_kg',
        'Yield(tons)': 'yield_tons',
        'Soil_Type': 'soil_type',
        'Season': 'season',
        'Water_Usage(cubic meters)': 'water_usage_cubic_meters'
    }
    
    df = df.rename(columns=col_mapping)
    
    numerical_cols = ['farm_area_acres', 'fertilizer_used_tons', 'pesticide_used_kg', 'yield_tons', 'water_usage_cubic_meters']
    categorical_cols = ['crop_type', 'irrigation_type', 'soil_type', 'season']
    
    for col in numerical_cols:
        if col in df.columns:
            mean_val = df[col].mean()
            df[col] = df[col].fillna(mean_val if not pd.isna(mean_val) else 0.0)
            
    for col in categorical_cols:
        if col in df.columns:
            mode_series = df[col].mode()
            mode_val = mode_series[0] if not mode_series.empty else 'Unknown'
            df[col] = df[col].fillna(mode_val)
            
    records = df.to_dict(orient='records')
    enriched_records = []
    
    for rec in records:
        enriched = enrich_and_calculate_metrics(rec)
        enriched_records.append(enriched)
        
    return enriched_records

def seed_database(db: Session, csv_path: str):
    if db.query(FarmRecord).count() > 0:
        return
        
    try:
        enriched_records = load_and_impute_csv(csv_path)
        for rec in enriched_records:
            farm = FarmRecord(**rec)
            db.add(farm)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
