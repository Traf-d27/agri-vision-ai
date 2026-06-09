from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
import numpy as np
import pandas as pd
from app.db.session import get_db
from app.models.farm import FarmRecord

router = APIRouter()

@router.post("/ask")
def ask_assistant(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    message = payload.get("message", "").lower()
    
    records = [r.__dict__ for r in db.query(FarmRecord).all()]
    if not records:
        return {"response": "The database is currently empty. Please upload or seed a dataset first."}
        
    df = pd.DataFrame(records)
    
    if ("best" in message and "crop" in message) or ("perform" in message and "crop" in message):
        crop_avgs = df.groupby('crop_type')['yield_tons'].mean().sort_values(ascending=False)
        crop_list = [f"{crop}: {avg:.2f} tons" for crop, avg in crop_avgs.items()]
        reply = (
            f"Based on real database analytics, the best performing crop is **{crop_avgs.index[0]}** "
            f"achieving an average yield of **{crop_avgs.iloc[0]:.2f} tons**. "
            f"Here is the rank of crops by average productivity:\n\n" + "\n".join([f"- {c}" for c in crop_list])
        )
        return {"response": reply}
        
    elif "water" in message and "efficient" in message or "irrigation" in message and "efficient" in message:
        df['we'] = df['yield_tons'] / df['water_usage_cubic_meters']
        irr_avgs = df.groupby('irrigation_type')['we'].mean().sort_values(ascending=False)
        irr_list = [f"{irr}: {(avg * 1000):.4f} tons per 1,000 m³" for irr, avg in irr_avgs.items()]
        reply = (
            f"In our dataset, the most efficient irrigation method is **{irr_avgs.index[0]}**, "
            f"producing **{(irr_avgs.iloc[0]*1000):.4f} tons per 1,000 m³** of water. "
            f"Irrigation schemes sorted by water efficiency:\n\n" + "\n".join([f"- {i}" for i in irr_list])
        )
        return {"response": reply}
        
    elif "average water" in message or "water usage" in message:
        avg_water = df['water_usage_cubic_meters'].mean()
        reply = (
            f"Across all **{len(df)}** monitored farms, the average water usage is "
            f"**{avg_water:,.2f} cubic meters**. The farm with the lowest water footprint is "
            f"**{df.loc[df['water_usage_cubic_meters'].idxmin(), 'farm_id']}** ({df['water_usage_cubic_meters'].min():,.0f} m³), "
            f"while the highest draw is **{df.loc[df['water_usage_cubic_meters'].idxmax(), 'farm_id']}** ({df['water_usage_cubic_meters'].max():,.0f} m³)."
        )
        return {"response": reply}
        
    elif "factor" in message or "affect" in message or "yield most" in message:
        cols = ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg']
        X = df[cols].values
        y = df['yield_tons'].values
        
        X_scaled = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-9)
        
        from sklearn.linear_model import LinearRegression
        lr = LinearRegression()
        lr.fit(X_scaled, y)
        
        coefs = np.abs(lr.coef_)
        sum_coefs = coefs.sum() if coefs.sum() > 0 else 1.0
        importances = coefs / sum_coefs
        
        factors = [
            ("Farm Area", importances[0]),
            ("Water Usage", importances[1]),
            ("Fertilizer", importances[2]),
            ("Pesticide", importances[3])
        ]
        factors = sorted(factors, key=lambda x: x[1], reverse=True)
        factor_list = [f"{name}: {imp * 100:.1f}% impact" for name, imp in factors]
        
        reply = (
            f"The regression model indicates that **{factors[0][0]}** has the highest influence on crop yield "
            f"({factors[0][1]*100:.1f}% relative impact weight), followed by **{factors[1][0]}**. "
            f"Complete relative importance breakdown of numerical inputs on Yield:\n\n" + "\n".join([f"- {f}" for f in factor_list])
        )
        return {"response": reply}
        
    else:
        avg_yield = df['yield_tons'].mean()
        avg_sust = df['sustainability_score'].mean()
        reply = (
            f"Hello! I am your AgriIntel Assistant. I am connected directly to your database containing "
            f"**{len(df)}** active farm records. "
            f"Currently, the average yield is **{avg_yield:.2f} tons** and the average sustainability score is "
            f"**{avg_sust:.1f}/100**.\n\n"
            f"Ask me questions like:\n"
            f"- 'Which crop performs best?'\n"
            f"- 'Which factor affects yield most?'\n"
            f"- 'What is the average water usage?'\n"
            f"- 'Which irrigation method is most efficient?'"
        )
        return {"response": reply}
