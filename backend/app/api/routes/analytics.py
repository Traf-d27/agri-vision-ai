import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.db.session import get_db
from app.models.farm import FarmRecord
from app.api.routes.farms import apply_farm_filters

router = APIRouter()

def fit_ols(x: np.ndarray, y: np.ndarray):
    n = len(x)
    if n < 3:
        return None
    mean_x = np.mean(x)
    mean_y = np.mean(y)
    
    dx = x - mean_x
    dy = y - mean_y
    
    num = np.sum(dx * dy)
    den = np.sum(dx ** 2)
    
    slope = num / den if den != 0 else 0.0
    intercept = mean_y - slope * mean_x
    
    preds = slope * x + intercept
    residuals = y - preds
    sum_sq_res = np.sum(residuals ** 2)
    sum_sq_total = np.sum((y - mean_y) ** 2)
    r2 = 1.0 - (sum_sq_res / sum_sq_total) if sum_sq_total > 0 else 0.0
    
    se = np.sqrt(sum_sq_res / (n - 2)) if n > 2 else 1e-4
    correlation = np.sign(slope) * np.sqrt(max(0.0, r2))
    
    sum_dx2 = np.sum(dx ** 2) or 1.0
    ci_bands = []
    for xi, yi, y_pred in zip(x, y, preds):
        margin = 2.0 * se * np.sqrt(1.0/n + (xi - mean_x)**2 / sum_dx2)
        ci_bands.append({
            "x": float(xi),
            "y": float(yi),
            "yPred": float(y_pred),
            "residual": float(yi - y_pred),
            "lower": float(y_pred - margin),
            "upper": float(y_pred + margin)
        })
        
    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "r2": float(r2),
        "correlation": float(correlation),
        "se": float(se),
        "confidenceBands": ci_bands,
        "equation": f"Yield = {slope:.4f} * X + {intercept:.2f}"
    }

def get_filtered_df(db: Session, filters: Dict[str, Any]) -> pd.DataFrame:
    query = db.query(FarmRecord)
    query = apply_farm_filters(query, **filters)
    records = [r.__dict__ for r in query.all()]
    for r in records:
        r.pop('_sa_instance_state', None)
    return pd.DataFrame(records)

def get_filter_params(
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
) -> Dict[str, Any]:
    return {
        "crop_type": crop_type,
        "soil_type": soil_type,
        "irrigation_type": irrigation_type,
        "season": season,
        "yield_min": yield_min,
        "yield_max": yield_max,
        "area_min": area_min,
        "area_max": area_max,
        "water_min": water_min,
        "water_max": water_max,
        "fertilizer_min": fertilizer_min,
        "fertilizer_max": fertilizer_max,
        "pesticide_min": pesticide_min,
        "pesticide_max": pesticide_max,
    }

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty:
        return {}
        
    n = len(df)
    total_yield = df['yield_tons'].sum()
    total_water = df['water_usage_cubic_meters'].sum()
    total_area = df['farm_area_acres'].sum()
    
    avg_yield = total_yield / n
    avg_water = total_water / n
    avg_area = total_area / n
    
    # Modes
    most_common_crop = df['crop_type'].mode().iloc[0] if not df['crop_type'].mode().empty else 'N/A'
    most_common_soil = df['soil_type'].mode().iloc[0] if not df['soil_type'].mode().empty else 'N/A'
    most_common_irrigation = df['irrigation_type'].mode().iloc[0] if not df['irrigation_type'].mode().empty else 'N/A'
    
    # Best average yields
    best_crop = df.groupby('crop_type')['yield_tons'].mean().idxmax() if 'crop_type' in df.columns and n > 0 else 'N/A'
    best_soil = df.groupby('soil_type')['yield_tons'].mean().idxmax() if 'soil_type' in df.columns and n > 0 else 'N/A'
    best_season = df.groupby('season')['yield_tons'].mean().idxmax() if 'season' in df.columns and n > 0 else 'N/A'
    
    avg_sust_score = df['sustainability_score'].mean()
    
    # Most efficient irrigation (yield/water ratio)
    irr_eff = df.groupby('irrigation_type').apply(lambda x: x['yield_tons'].sum() / x['water_usage_cubic_meters'].sum() if x['water_usage_cubic_meters'].sum() > 0 else 0)
    best_irrigation = irr_eff.idxmax() if not irr_eff.empty else 'N/A'
    
    return {
        "totalFarms": n,
        "avgYield": float(avg_yield),
        "avgWater": float(avg_water),
        "avgArea": float(avg_area),
        "mostCommonCrop": most_common_crop,
        "mostCommonSoil": most_common_soil,
        "mostCommonIrrigation": most_common_irrigation,
        "bestCrop": best_crop,
        "bestSoil": best_soil,
        "bestSeason": best_season,
        "bestIrrigation": best_irrigation,
        "avgSustScore": float(avg_sust_score)
    }

@router.get("/rankings")
def get_rankings(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty:
        return {"crops": [], "soils": [], "irrigations": [], "farms": [], "states": [], "cities": []}
        
    def rank_category(col):
        grouped = df.groupby(col).agg(
            avgYield=('yield_tons', 'mean'),
            waterUsage=('water_usage_cubic_meters', 'mean'),
            fertilizer=('fertilizer_used_tons', 'mean'),
            pesticide=('pesticide_used_kg', 'mean'),
            sustScore=('sustainability_score', 'mean')
        ).reset_index()
        
        ranks = []
        for _, r in grouped.iterrows():
            total_inputs = r['fertilizer'] + (r['pesticide'] / 1000.0)
            we = r['avgYield'] / r['waterUsage'] if r['waterUsage'] > 0 else 0
            ie = r['avgYield'] / total_inputs if total_inputs > 0 else 0
            
            ranks.append({
                "name": r[col],
                "avgYield": float(r['avgYield']),
                "waterEfficiency": float(we),
                "inputEfficiency": float(ie),
                "sustainabilityScore": float(r['sustScore'])
            })
        return sorted(ranks, key=lambda x: x['avgYield'], reverse=True)
        
    crop_ranks = rank_category('crop_type')
    soil_ranks = rank_category('soil_type')
    irr_ranks = rank_category('irrigation_type')
    
    farm_ranks = []
    for _, r in df.iterrows():
        total_inputs = r['fertilizer_used_tons'] + (r['pesticide_used_kg'] / 1000.0)
        we = r['yield_tons'] / r['water_usage_cubic_meters'] if r['water_usage_cubic_meters'] > 0 else 0
        ie = r['yield_tons'] / total_inputs if total_inputs > 0 else 0
        farm_ranks.append({
            "name": r['farm_id'],
            "yieldVal": float(r['yield_tons']),
            "waterEfficiency": float(we),
            "inputEfficiency": float(ie),
            "sustainabilityScore": float(r['sustainability_score'])
        })
    farm_ranks = sorted(farm_ranks, key=lambda x: x['yieldVal'], reverse=True)[:100]
    
    # State and City Growth Rankings
    state_ranks = []
    if 'state' in df.columns and not df['state'].isnull().all():
        grouped_state = df.groupby('state').agg(
            avgYield=('yield_tons', 'mean'),
            waterUsage=('water_usage_cubic_meters', 'mean'),
            sustScore=('sustainability_score', 'mean'),
            count=('farm_id', 'count')
        ).reset_index()
        
        min_y, max_y = grouped_state['avgYield'].min(), grouped_state['avgYield'].max()
        
        for _, r in grouped_state.iterrows():
            we = r['avgYield'] / r['waterUsage'] if r['waterUsage'] > 0 else 0
            yield_perf = 100 if min_y == max_y else 40 + ((r['avgYield'] - min_y) / (max_y - min_y)) * 60
            
            # Composite growth score
            growth_score = 0.35 * yield_perf + 0.25 * min(100, we * 1000) + 0.2 * 80 + 0.1 * r['sustScore'] + 0.1 * 85
            
            state_ranks.append({
                "name": r['state'],
                "count": int(r['count']),
                "avgYield": float(r['avgYield']),
                "waterEfficiency": float(we),
                "sustainabilityScore": float(r['sustScore']),
                "growthScore": float(round(growth_score, 2))
            })
        state_ranks = sorted(state_ranks, key=lambda x: x['growthScore'], reverse=True)
        
    city_ranks = []
    if 'city' in df.columns and not df['city'].isnull().all():
        grouped_city = df.groupby('city').agg(
            state=('state', 'first'),
            avgYield=('yield_tons', 'mean'),
            waterUsage=('water_usage_cubic_meters', 'mean'),
            sustScore=('sustainability_score', 'mean'),
            count=('farm_id', 'count')
        ).reset_index()
        
        min_y, max_y = grouped_city['avgYield'].min(), grouped_city['avgYield'].max()
        for _, r in grouped_city.iterrows():
            we = r['avgYield'] / r['waterUsage'] if r['waterUsage'] > 0 else 0
            yield_perf = 100 if min_y == max_y else 40 + ((r['avgYield'] - min_y) / (max_y - min_y)) * 60
            growth_score = 0.40 * yield_perf + 0.30 * min(100, we * 1000) + 0.3 * r['sustScore']
            
            city_ranks.append({
                "name": r['city'],
                "state": r['state'],
                "count": int(r['count']),
                "avgYield": float(r['avgYield']),
                "waterEfficiency": float(we),
                "sustainabilityScore": float(r['sustScore']),
                "growthScore": float(round(growth_score, 2))
            })
        city_ranks = sorted(city_ranks, key=lambda x: x['growthScore'], reverse=True)
        
    return {
        "crops": crop_ranks,
        "soils": soil_ranks,
        "irrigations": irr_ranks,
        "farms": farm_ranks,
        "states": state_ranks,
        "cities": city_ranks
    }

@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty:
        return []
        
    recs = []
    # Optimal crop
    crop_avg = df.groupby('crop_type')['yield_tons'].mean()
    if not crop_avg.empty:
        best_c = crop_avg.idxmax()
        best_val = crop_avg.max()
        recs.append({
            "id": "rec-1",
            "title": "Optimal Crop Selection",
            "type": "crop",
            "metric": f"Average Yield: {best_val:.2f} tons",
            "description": f"Under current filters, **{best_c}** yields the highest average production. Consider prioritizing this crop to maximize agricultural output.",
            "urgency": "high"
        })
        
    # Water optimization
    df['we'] = df['yield_tons'] / df['water_usage_cubic_meters']
    irr_avg = df.groupby('irrigation_type')['we'].mean()
    if not irr_avg.empty:
        best_irr = irr_avg.idxmax()
        best_val = irr_avg.max()
        recs.append({
            "id": "rec-2",
            "title": "Water Efficiency Directive",
            "type": "water",
            "metric": f"Water Efficiency: {best_val*1000:.4f} tons/k-m³",
            "description": f"**{best_irr}** is the most water-efficient irrigation scheme in the active dataset. Shifting practices to this method could reduce resource overhead substantially.",
            "urgency": "medium"
        })
        
    # Input reduction
    df['input_density'] = (df['fertilizer_used_tons'] * 1000.0 + df['pesticide_used_kg']) / df['farm_area_acres']
    high_chems = df[df['input_density'] > 50.0]
    if len(high_chems) > 0:
        recs.append({
            "id": "rec-3",
            "title": "Chemical Optimization Alert",
            "type": "input",
            "metric": f"{len(high_chems)} farms flagged",
            "description": f"{len(high_chems)} farms are using highly dense chemical applications (>50kg per acre). We recommend reducing inputs by 10-15% and moving to organic bio-fertilizers to improve sustainability scores.",
            "urgency": "high"
        })
        
    return recs

@router.get("/insights")
def get_insights(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty or len(df) < 3:
        return []
        
    insights = []
    
    # 1. Yield vs Water regression
    ols = fit_ols(df['water_usage_cubic_meters'].values, df['yield_tons'].values)
    if ols:
        insights.append({
            "id": "ins-1",
            "title": "Yield Variance & Water Connection",
            "icon": "water",
            "description": f"Water usage explains **{ols['r2'] * 100:.1f}%** of the crop yield variation. This represents a {'positive' if ols['correlation'] >= 0 else 'negative'} correlation of **{ols['correlation']:.2f}** across active farms.",
            "color": "var(--secondary)"
        })
        
    # 2. Scale Inefficiency
    small = df[df['farm_area_acres'] < 250.0]
    large = df[df['farm_area_acres'] >= 250.0]
    if not small.empty and not large.empty:
        small_yield = (small['yield_tons'] / small['farm_area_acres']).mean()
        large_yield = (large['yield_tons'] / large['farm_area_acres']).mean()
        
        if large_yield < small_yield:
            drop = ((small_yield - large_yield) / small_yield) * 100.0
            insights.append({
                "id": "ins-2",
                "title": "Farm Scale Productivity Inefficiencies",
                "icon": "area",
                "description": f"Average yield per acre decreases by **{drop:.1f}%** on farms larger than **250 acres**, indicating potential logistics or resource distribution constraints at scale.",
                "color": "var(--warning)"
            })
        else:
            gain = ((large_yield - small_yield) / small_yield) * 100.0
            insights.append({
                "id": "ins-2",
                "title": "Economies of Scale Benefits",
                "icon": "area",
                "description": f"Farms larger than **250 acres** show a **{gain:.1f}%** increase in yield per acre, indicating successful resource integration on larger acreage.",
                "color": "var(--primary)"
            })
            
    # 3. Geographic AI insight
    if 'state' in df.columns:
        state_wheat = df[df['crop_type'].str.contains('Wheat', case=False, na=False)]
        if not state_wheat.empty:
            top_state = state_wheat.groupby('state')['yield_tons'].mean().idxmax()
            top_val = state_wheat.groupby('state')['yield_tons'].mean().max()
            insights.append({
                "id": "ins-3",
                "title": "Wheat Production Leader",
                "icon": "crop",
                "description": f"**{top_state}** ranks #1 for wheat productivity, achieving a top average yield of **{top_val:.2f} tons** per farm.",
                "color": "var(--accent)"
            })
            
    return insights

@router.get("/regression")
def get_regression(
    x_metric: str = "water",
    db: Session = Depends(get_db),
    filters: Dict[str, Any] = Depends(get_filter_params)
):
    df = get_filtered_df(db, filters)
    if df.empty or len(df) < 3:
        return {}
        
    y = df['yield_tons'].values
    
    if x_metric == "water":
        x = df['water_usage_cubic_meters'].values
    elif x_metric == "fertilizer":
        x = df['fertilizer_used_tons'].values
    else:
        x = df['farm_area_acres'].values
        
    ols = fit_ols(x, y)
    return ols

@router.get("/correlation")
def get_correlation(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty:
        return {}
    cols = ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg', 'yield_tons', 'sustainability_score']
    corr = df[cols].corr().fillna(0.0).to_dict()
    return corr
