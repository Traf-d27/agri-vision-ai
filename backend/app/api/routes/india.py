"""
India Agricultural Intelligence API Router
Endpoints for national-scale geospatial agricultural intelligence.
"""
import httpx
import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.agricultural_data import State, District, CropRecord, WeatherRecord, SoilRecord
from app.models.india_intelligence import (
    SoilType, CropType, SoilCropMapping, SatelliteMetric, YieldPrediction
)
from app.services.india_seed_data import (
    STATE_SOIL_DISTRIBUTION, STATE_SATELLITE_METRICS, INDIA_DISTRICTS
)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Simple in-memory weather cache (TTL: 1 hour)
# ─────────────────────────────────────────────────────────────
_weather_cache: dict = {}
WEATHER_CACHE_TTL = 3600  # seconds


def _get_state_centroid(state_name: str, db: Session):
    state = db.query(State).filter(State.name == state_name).first()
    if state and state.latitude and state.longitude:
        return state.latitude, state.longitude
    return None, None


async def fetch_live_weather(lat: float, lon: float):
    """Fetch current weather from Open-Meteo (free, no API key needed)."""
    cache_key = f"{round(lat, 1)}_{round(lon, 1)}"
    now = time.time()
    if cache_key in _weather_cache:
        cached_ts, cached_data = _weather_cache[cache_key]
        if now - cached_ts < WEATHER_CACHE_TTL:
            return cached_data

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
        f"&forecast_days=3"
        f"&timezone=Asia/Kolkata"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            _weather_cache[cache_key] = (now, data)
            return data
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/states")
def get_all_states(db: Session = Depends(get_db)):
    """Get all Indian states with geospatial info and satellite metrics."""
    states = db.query(State).order_by(State.name).all()
    result = []
    for s in states:
        metrics = db.query(SatelliteMetric).filter(
            SatelliteMetric.state_id == s.id,
            SatelliteMetric.district_id == None
        ).first()
        soil_names = STATE_SOIL_DISTRIBUTION.get(s.name, [])
        sat = STATE_SATELLITE_METRICS.get(s.name, {})
        result.append({
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "area_km2": s.area_km2,
            "region": s.region,
            "soil_types": soil_names,
            "ndvi": metrics.ndvi if metrics else sat.get("ndvi"),
            "evi": metrics.evi if metrics else sat.get("evi"),
            "ndwi": metrics.ndwi if metrics else sat.get("ndwi"),
            "crop_cover_pct": metrics.crop_cover_pct if metrics else sat.get("crop_cover_pct"),
            "rainfall_mm": metrics.rainfall_mm if metrics else sat.get("rainfall_mm"),
            "temp_avg_c": metrics.temp_avg_c if metrics else sat.get("temp_avg_c"),
        })
    return result


@router.get("/states/{state_id}")
def get_state_detail(state_id: int, db: Session = Depends(get_db)):
    """Get full detail for one state: soils, crops, districts, metrics."""
    state = db.query(State).filter(State.id == state_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="State not found")

    # Districts
    districts = db.query(District).filter(District.state_id == state.id).all()

    # Soil types
    soil_names = STATE_SOIL_DISTRIBUTION.get(state.name, [])
    soils_detail = []
    for sn in soil_names:
        st_obj = db.query(SoilType).filter(SoilType.name == sn).first()
        if st_obj:
            soils_detail.append({
                "id": st_obj.id,
                "name": st_obj.name,
                "description": st_obj.description,
                "texture": st_obj.texture,
                "fertility": st_obj.fertility,
                "color_hex": st_obj.color_hex,
            })

    # Major crops (from CropRecord data or top mapped crops for dominant soil)
    crop_records = db.query(CropRecord.crop_type, func.count(CropRecord.id).label("count"))\
        .filter(CropRecord.state_id == state.id)\
        .group_by(CropRecord.crop_type)\
        .order_by(func.count(CropRecord.id).desc())\
        .limit(8).all()

    major_crops = [{"name": r.crop_type, "count": r.count} for r in crop_records]

    # If no crop records exist, derive from soil-crop mappings
    if not major_crops and soil_names:
        primary_soil = db.query(SoilType).filter(SoilType.name == soil_names[0]).first()
        if primary_soil:
            mappings = db.query(SoilCropMapping)\
                .filter(SoilCropMapping.soil_type_id == primary_soil.id)\
                .order_by(SoilCropMapping.suitability_score.desc())\
                .limit(8).all()
            major_crops = [{
                "name": m.crop_type.name,
                "suitability": m.suitability_score,
                "season": m.crop_type.season,
                "icon": m.crop_type.icon,
            } for m in mappings]

    # Satellite metrics
    metrics = db.query(SatelliteMetric).filter(
        SatelliteMetric.state_id == state.id,
        SatelliteMetric.district_id == None
    ).first()
    sat_fallback = STATE_SATELLITE_METRICS.get(state.name, {})

    return {
        "id": state.id,
        "name": state.name,
        "latitude": state.latitude,
        "longitude": state.longitude,
        "area_km2": state.area_km2,
        "region": state.region,
        "districts": [{"id": d.id, "name": d.name, "latitude": d.latitude, "longitude": d.longitude} for d in districts],
        "soil_types": soils_detail,
        "major_crops": major_crops,
        "satellite_metrics": {
            "ndvi": metrics.ndvi if metrics else sat_fallback.get("ndvi"),
            "evi": metrics.evi if metrics else sat_fallback.get("evi"),
            "ndwi": metrics.ndwi if metrics else sat_fallback.get("ndwi"),
            "crop_cover_pct": metrics.crop_cover_pct if metrics else sat_fallback.get("crop_cover_pct"),
            "rainfall_mm": metrics.rainfall_mm if metrics else sat_fallback.get("rainfall_mm"),
            "temp_avg_c": metrics.temp_avg_c if metrics else sat_fallback.get("temp_avg_c"),
        },
    }


@router.get("/districts")
def get_districts(state_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get all districts, optionally filtered by state_id."""
    query = db.query(District)
    if state_id:
        query = query.filter(District.state_id == state_id)
    districts = query.order_by(District.name).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "state_id": d.state_id,
            "state_name": d.state.name if d.state else None,
            "latitude": d.latitude,
            "longitude": d.longitude,
        }
        for d in districts
    ]


@router.get("/districts/{district_id}")
def get_district_detail(district_id: int, db: Session = Depends(get_db)):
    """Get full detail for a district."""
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    crop_records = db.query(CropRecord.crop_type, func.count(CropRecord.id).label("count"),
                             func.avg(CropRecord.yield_tons).label("avg_yield"))\
        .filter(CropRecord.district_id == district.id)\
        .group_by(CropRecord.crop_type).all()

    state_name = district.state.name if district.state else ""
    soil_names = STATE_SOIL_DISTRIBUTION.get(state_name, [])
    sat = STATE_SATELLITE_METRICS.get(state_name, {})

    return {
        "id": district.id,
        "name": district.name,
        "state_id": district.state_id,
        "state_name": state_name,
        "latitude": district.latitude,
        "longitude": district.longitude,
        "soil_types": soil_names,
        "crops": [{"name": r.crop_type, "count": r.count, "avg_yield": round(r.avg_yield, 2) if r.avg_yield else None} for r in crop_records],
        "satellite_metrics": {
            "ndvi": sat.get("ndvi"),
            "evi": sat.get("evi"),
            "ndwi": sat.get("ndwi"),
            "rainfall_mm": sat.get("rainfall_mm"),
            "temp_avg_c": sat.get("temp_avg_c"),
        }
    }


@router.get("/soils")
def get_all_soils(db: Session = Depends(get_db)):
    """Get all soil types with summary data."""
    soils = db.query(SoilType).order_by(SoilType.name).all()
    result = []
    for soil in soils:
        # Count states that have this soil
        states_with_soil = [s for s, soils_list in STATE_SOIL_DISTRIBUTION.items() if soil.name in soils_list]
        # Count suitable crops
        suitable_crop_count = db.query(SoilCropMapping).filter(
            SoilCropMapping.soil_type_id == soil.id
        ).count()
        result.append({
            "id": soil.id,
            "name": soil.name,
            "description": soil.description,
            "texture": soil.texture,
            "ph_min": soil.ph_min,
            "ph_max": soil.ph_max,
            "water_retention": soil.water_retention,
            "organic_matter": soil.organic_matter,
            "fertility": soil.fertility,
            "color_hex": soil.color_hex,
            "area_million_ha": soil.area_million_ha,
            "states_count": len(states_with_soil),
            "states": states_with_soil,
            "suitable_crop_count": suitable_crop_count,
        })
    return result


@router.get("/soils/{soil_id}")
def get_soil_detail(soil_id: int, db: Session = Depends(get_db)):
    """Get full soil detail: suitable crops, states, districts, avg NDVI."""
    soil = db.query(SoilType).filter(SoilType.id == soil_id).first()
    if not soil:
        raise HTTPException(status_code=404, detail="Soil type not found")

    # Suitable crops with suitability scores
    mappings = db.query(SoilCropMapping)\
        .filter(SoilCropMapping.soil_type_id == soil.id)\
        .order_by(SoilCropMapping.suitability_score.desc()).all()

    suitable_crops = [{
        "id": m.crop_type.id,
        "name": m.crop_type.name,
        "category": m.crop_type.category,
        "season": m.crop_type.season,
        "suitability_score": m.suitability_score,
        "icon": m.crop_type.icon,
        "water_requirement": m.crop_type.water_requirement,
        "avg_yield_tons_ha": m.crop_type.avg_yield_tons_ha,
    } for m in mappings]

    # States and their NDVI averages
    states_with_soil = [s for s, soils_list in STATE_SOIL_DISTRIBUTION.items() if soil.name in soils_list]
    states_detail = []
    avg_ndvi_vals = []
    for state_name in states_with_soil:
        state_obj = db.query(State).filter(State.name == state_name).first()
        sat = STATE_SATELLITE_METRICS.get(state_name, {})
        ndvi_val = sat.get("ndvi", 0.0)
        avg_ndvi_vals.append(ndvi_val)
        if state_obj:
            districts_in_state = [d for d in INDIA_DISTRICTS.get(state_name, [])]
            states_detail.append({
                "id": state_obj.id,
                "name": state_name,
                "region": state_obj.region,
                "ndvi": ndvi_val,
                "districts": [d[0] for d in districts_in_state[:6]],
            })

    avg_ndvi = sum(avg_ndvi_vals) / len(avg_ndvi_vals) if avg_ndvi_vals else 0.0

    return {
        "id": soil.id,
        "name": soil.name,
        "description": soil.description,
        "texture": soil.texture,
        "ph_min": soil.ph_min,
        "ph_max": soil.ph_max,
        "water_retention": soil.water_retention,
        "organic_matter": soil.organic_matter,
        "fertility": soil.fertility,
        "color_hex": soil.color_hex,
        "area_million_ha": soil.area_million_ha,
        "suitable_crops": suitable_crops,
        "states": states_detail,
        "avg_ndvi": round(avg_ndvi, 3),
    }


@router.get("/crops")
def get_all_crops(db: Session = Depends(get_db)):
    """Get all crop types."""
    crops = db.query(CropType).order_by(CropType.name).all()
    return [{
        "id": c.id,
        "name": c.name,
        "category": c.category,
        "season": c.season,
        "water_requirement": c.water_requirement,
        "growing_period_days": c.growing_period_days,
        "avg_yield_tons_ha": c.avg_yield_tons_ha,
        "icon": c.icon,
        "description": c.description,
    } for c in crops]


@router.get("/crops/{crop_id}")
def get_crop_detail(crop_id: int, db: Session = Depends(get_db)):
    """Get crop detail: suitable soils, states, yield info."""
    crop = db.query(CropType).filter(CropType.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    mappings = db.query(SoilCropMapping)\
        .filter(SoilCropMapping.crop_type_id == crop.id)\
        .order_by(SoilCropMapping.suitability_score.desc()).all()

    suitable_soils = [{
        "id": m.soil_type.id,
        "name": m.soil_type.name,
        "suitability_score": m.suitability_score,
        "color_hex": m.soil_type.color_hex,
        "fertility": m.soil_type.fertility,
    } for m in mappings]

    # States that grow this crop (from CropRecord)
    state_records = db.query(State.name, func.count(CropRecord.id).label("count"),
                              func.avg(CropRecord.yield_tons).label("avg_yield"))\
        .join(CropRecord, CropRecord.state_id == State.id)\
        .filter(CropRecord.crop_type == crop.name)\
        .group_by(State.name)\
        .order_by(func.count(CropRecord.id).desc()).all()

    return {
        "id": crop.id,
        "name": crop.name,
        "category": crop.category,
        "season": crop.season,
        "water_requirement": crop.water_requirement,
        "growing_period_days": crop.growing_period_days,
        "avg_yield_tons_ha": crop.avg_yield_tons_ha,
        "icon": crop.icon,
        "description": crop.description,
        "suitable_soils": suitable_soils,
        "top_states": [{"name": r.name, "record_count": r.count, "avg_yield": round(r.avg_yield, 2) if r.avg_yield else None} for r in state_records[:10]],
    }


@router.get("/satellite-metrics")
def get_satellite_metrics(
    state_id: Optional[int] = Query(None),
    state_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get NDVI/EVI/NDWI for a state."""
    if state_name:
        state = db.query(State).filter(State.name == state_name).first()
        if state:
            state_id = state.id

    if state_id:
        metrics = db.query(SatelliteMetric).filter(
            SatelliteMetric.state_id == state_id,
            SatelliteMetric.district_id == None
        ).first()
        if metrics:
            return {
                "state_id": state_id,
                "ndvi": metrics.ndvi,
                "evi": metrics.evi,
                "ndwi": metrics.ndwi,
                "crop_cover_pct": metrics.crop_cover_pct,
                "rainfall_mm": metrics.rainfall_mm,
                "temp_avg_c": metrics.temp_avg_c,
                "source": metrics.source,
            }

    # Fallback: return all metrics
    all_metrics = db.query(SatelliteMetric).filter(SatelliteMetric.district_id == None).all()
    return [{
        "state_id": m.state_id,
        "ndvi": m.ndvi, "evi": m.evi, "ndwi": m.ndwi,
        "crop_cover_pct": m.crop_cover_pct,
        "rainfall_mm": m.rainfall_mm,
        "temp_avg_c": m.temp_avg_c,
    } for m in all_metrics]


@router.get("/weather")
async def get_live_weather(
    state: str = Query(..., description="State name"),
    db: Session = Depends(get_db)
):
    """Fetch live weather from Open-Meteo for a state's centroid coordinates."""
    lat, lon = _get_state_centroid(state, db)
    if lat is None:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found or has no coordinates")

    weather_data = await fetch_live_weather(lat, lon)
    weather_data["state"] = state
    weather_data["latitude"] = lat
    weather_data["longitude"] = lon
    return weather_data


@router.get("/heatmap/{layer}")
def get_heatmap_data(
    layer: str,
    db: Session = Depends(get_db)
):
    """
    Get aggregated heatmap values per state for map choropleth rendering.
    Layers: ndvi | evi | ndwi | rainfall | temperature | crop_cover | yield | soil_fertility
    """
    states = db.query(State).all()
    result = []

    layer_map = {
        "ndvi": "ndvi",
        "evi": "evi",
        "ndwi": "ndwi",
        "rainfall": "rainfall_mm",
        "temperature": "temp_avg_c",
        "crop_cover": "crop_cover_pct",
    }

    for s in states:
        sat = STATE_SATELLITE_METRICS.get(s.name, {})
        if not sat:
            continue

        if layer in layer_map:
            value = sat.get(layer_map[layer], 0.0)
        elif layer == "yield":
            # Average yield from crop records
            avg = db.query(func.avg(CropRecord.yield_tons))\
                .filter(CropRecord.state_id == s.id).scalar()
            value = round(avg, 2) if avg else 0.0
        elif layer == "soil_fertility":
            # Numeric fertility from primary soil
            soils = STATE_SOIL_DISTRIBUTION.get(s.name, [])
            fertility_map = {"High": 0.9, "Medium": 0.55, "Low": 0.25}
            fvals = []
            for sn in soils:
                so = db.query(SoilType).filter(SoilType.name == sn).first()
                if so:
                    fvals.append(fertility_map.get(so.fertility, 0.5))
            value = round(sum(fvals) / len(fvals), 3) if fvals else 0.5
        else:
            value = sat.get("ndvi", 0.0)

        result.append({
            "state_id": s.id,
            "state_name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "value": value,
        })

    return {"layer": layer, "data": result}


@router.get("/crop-classification")
def classify_crops(
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Simple rule-based crop classification based on NDVI, temp, soil, and season.
    Returns likely detected crop with confidence score.
    """
    state_obj = db.query(State).filter(State.name == state).first()
    if not state_obj:
        raise HTTPException(status_code=404, detail="State not found")

    sat = STATE_SATELLITE_METRICS.get(state, {})
    ndvi = sat.get("ndvi", 0.5)
    temp = sat.get("temp_avg_c", 25.0)
    rainfall = sat.get("rainfall_mm", 1000.0)
    soils = STATE_SOIL_DISTRIBUTION.get(state, [])
    primary_soil = soils[0] if soils else "Alluvial Soil"

    # Rule-based classification
    classifications = []

    if ndvi > 0.7 and rainfall > 2000:
        classifications.append({"crop": "Tea", "confidence": 0.88, "reason": "High NDVI + heavy rainfall"})
        classifications.append({"crop": "Rice", "confidence": 0.82, "reason": "High rainfall zone"})
    elif ndvi > 0.6 and temp < 22:
        classifications.append({"crop": "Wheat", "confidence": 0.91, "reason": "Moderate NDVI + cool temp"})
        classifications.append({"crop": "Potato", "confidence": 0.76, "reason": "Cool climate crop"})
    elif ndvi > 0.55 and primary_soil in ["Black Cotton Soil"]:
        classifications.append({"crop": "Cotton", "confidence": 0.94, "reason": "Black cotton soil + good NDVI"})
        classifications.append({"crop": "Soybean", "confidence": 0.79, "reason": "Black soil suitability"})
    elif ndvi > 0.5 and rainfall > 1000:
        classifications.append({"crop": "Rice", "confidence": 0.87, "reason": "Good NDVI + adequate rainfall"})
        classifications.append({"crop": "Sugarcane", "confidence": 0.73, "reason": "Warm humid conditions"})
    elif ndvi < 0.35 and rainfall < 500:
        classifications.append({"crop": "Pearl Millet", "confidence": 0.90, "reason": "Low rainfall dryland crop"})
        classifications.append({"crop": "Sorghum", "confidence": 0.84, "reason": "Drought resistant"})
    elif primary_soil in ["Laterite Soil"] and rainfall > 1500:
        classifications.append({"crop": "Coffee", "confidence": 0.89, "reason": "Laterite + high rainfall"})
        classifications.append({"crop": "Coconut", "confidence": 0.85, "reason": "Coastal laterite zone"})
    else:
        classifications.append({"crop": "Wheat", "confidence": 0.72, "reason": "Default Rabi crop"})
        classifications.append({"crop": "Maize", "confidence": 0.65, "reason": "Versatile cereal crop"})

    return {
        "state": state,
        "primary_soil": primary_soil,
        "ndvi": ndvi,
        "temperature_c": temp,
        "rainfall_mm": rainfall,
        "classifications": classifications,
    }
