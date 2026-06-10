import pandas as pd
from sqlalchemy.orm import Session
from app.models.agricultural_data import State, District, CropRecord, WeatherRecord, SoilRecord

def seed_india_data(db: Session, csv_path: str):
    # Check if states are already present in the database to prevent duplicate seeding
    if db.query(State).count() > 0:
        print("INFO:     States database already seeded. Skipping India agricultural dataset ETL.")
        return
        
    print(f"INFO:     Starting ETL process on: {csv_path}")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"ERROR:    Failed to read dataset CSV: {e}")
        return

    try:
        # 1. Seed States
        state_mapping = {}
        unique_states = df['State'].dropna().unique()
        for state_name in unique_states:
            state_name = str(state_name).strip()
            state = State(name=state_name)
            db.add(state)
            db.flush()
            state_mapping[state_name] = state.id
        print(f"INFO:     ETL: Seeded {len(state_mapping)} states.")

        # 2. Seed Districts (City in CSV represents the district)
        district_mapping = {}
        unique_districts = df[['State', 'City']].dropna().drop_duplicates()
        for _, row in unique_districts.iterrows():
            s_name = str(row['State']).strip()
            d_name = str(row['City']).strip()
            s_id = state_mapping.get(s_name)
            if s_id:
                district = District(name=d_name, state_id=s_id)
                db.add(district)
                db.flush()
                district_mapping[(s_name, d_name)] = district.id
        print(f"INFO:     ETL: Seeded {len(district_mapping)} districts.")

        # 3. Seed CropRecords, WeatherRecords, and SoilRecords
        weather_seeded_districts = set()
        soil_seeded_districts = set()
        crop_count = 0
        weather_count = 0
        soil_count = 0

        for _, row in df.iterrows():
            s_name = str(row['State']).strip()
            d_name = str(row['City']).strip()
            s_id = state_mapping.get(s_name)
            d_id = district_mapping.get((s_name, d_name))

            if not s_id or not d_id:
                continue

            # Crop record
            crop = CropRecord(
                crop_type=str(row['Crop_Type']).strip(),
                state_id=s_id,
                district_id=d_id,
                farm_area_acres=float(row['Farm_Area(acres)']),
                irrigation_type=str(row['Irrigation_Type']).strip(),
                fertilizer_used_tons=float(row['Fertilizer_Used(tons)']),
                pesticide_used_kg=float(row['Pesticide_Used(kg)']),
                yield_tons=float(row['Yield(tons)']),
                water_usage_cubic_meters=float(row['Water_Usage(cubic meters)']),
                soil_type=str(row['Soil_Type']).strip(),
                season=str(row['Season']).strip()
            )
            db.add(crop)
            crop_count += 1

            # Weather record (seed once per district)
            if d_id not in weather_seeded_districts:
                weather = WeatherRecord(
                    state_id=s_id,
                    district_id=d_id,
                    avg_temp=float(row['Avg_Temp']),
                    annual_rainfall=float(row['Annual_Rainfall']),
                    avg_humidity=float(row['Avg_Humidity']),
                    avg_windspeed=float(row['Avg_WindSpeed']),
                    drought_risk=str(row['Drought_Risk']).strip(),
                    flood_risk=str(row['Flood_Risk']).strip()
                )
                db.add(weather)
                weather_seeded_districts.add(d_id)
                weather_count += 1

            # Soil record (seed once per district)
            if d_id not in soil_seeded_districts:
                soil = SoilRecord(
                    state_id=s_id,
                    district_id=d_id,
                    soil_type=str(row['Soil_Type']).strip(),
                    soil_index=float(row['Soil_Index'])
                )
                db.add(soil)
                soil_seeded_districts.add(d_id)
                soil_count += 1

        db.commit()
        print(f"INFO:     ETL Seeding complete. Seeded: {crop_count} crops, {weather_count} weather, {soil_count} soil records.")
    except Exception as e:
        db.rollback()
        print(f"ERROR:    ETL Seeding failed: {e}")
        raise e
