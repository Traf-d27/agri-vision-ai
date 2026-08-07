"""
India Intelligence Models
New tables for national-scale agricultural intelligence platform.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class SoilType(Base):
    """Canonical soil catalog for India"""
    __tablename__ = "soil_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    texture = Column(String, nullable=True)          # Sandy / Loamy / Clayey / Silty
    ph_min = Column(Float, nullable=True)
    ph_max = Column(Float, nullable=True)
    water_retention = Column(String, nullable=True)  # Low / Medium / High
    organic_matter = Column(String, nullable=True)   # Low / Medium / High
    fertility = Column(String, nullable=True)        # Low / Medium / High
    color_hex = Column(String, nullable=True)        # For map visualization
    area_million_ha = Column(Float, nullable=True)   # Total area in India

    # Relationships
    soil_crop_mappings = relationship("SoilCropMapping", back_populates="soil_type", cascade="all, delete-orphan")
    satellite_metrics = relationship("SatelliteMetric", back_populates="soil_type")


class CropType(Base):
    """Canonical crop catalog for India"""
    __tablename__ = "crop_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=True)         # Cereal / Pulse / Cash / Oilseed / Horticulture / Spice
    season = Column(String, nullable=True)           # Kharif / Rabi / Zaid / Perennial
    water_requirement = Column(String, nullable=True) # Low / Medium / High
    growing_period_days = Column(Integer, nullable=True)
    avg_yield_tons_ha = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)             # Emoji icon for UI

    # Relationships
    soil_crop_mappings = relationship("SoilCropMapping", back_populates="crop_type", cascade="all, delete-orphan")
    yield_predictions = relationship("YieldPrediction", back_populates="crop_type")


class SoilCropMapping(Base):
    """M:N junction table: which crops are suitable for which soil"""
    __tablename__ = "soil_crop_mappings"

    id = Column(Integer, primary_key=True, index=True)
    soil_type_id = Column(Integer, ForeignKey("soil_types.id"), nullable=False)
    crop_type_id = Column(Integer, ForeignKey("crop_types.id"), nullable=False)
    suitability_score = Column(Float, nullable=True)  # 0.0 – 1.0
    notes = Column(Text, nullable=True)

    soil_type = relationship("SoilType", back_populates="soil_crop_mappings")
    crop_type = relationship("CropType", back_populates="soil_crop_mappings")


class SatelliteMetric(Base):
    """NDVI, EVI, NDWI readings per state/district"""
    __tablename__ = "satellite_metrics"

    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    soil_type_id = Column(Integer, ForeignKey("soil_types.id"), nullable=True)

    ndvi = Column(Float, nullable=True)    # Normalized Difference Vegetation Index  -1 to 1
    evi = Column(Float, nullable=True)     # Enhanced Vegetation Index
    ndwi = Column(Float, nullable=True)   # Normalized Difference Water Index
    crop_cover_pct = Column(Float, nullable=True)  # % of area under cultivation
    rainfall_mm = Column(Float, nullable=True)     # mm/year
    temp_avg_c = Column(Float, nullable=True)      # Average temperature °C
    soil_moisture_pct = Column(Float, nullable=True)

    recorded_at = Column(DateTime, server_default=func.now())
    source = Column(String, default="synthetic")   # synthetic / sentinel2 / modis

    # Relationships
    state = relationship("State", foreign_keys=[state_id])
    district = relationship("District", foreign_keys=[district_id])
    soil_type = relationship("SoilType", back_populates="satellite_metrics")


class YieldPrediction(Base):
    """Stored AI yield forecasts"""
    __tablename__ = "yield_predictions"

    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    crop_type_id = Column(Integer, ForeignKey("crop_types.id"), nullable=False)
    season = Column(String, nullable=False)           # Kharif / Rabi / Zaid
    year = Column(Integer, nullable=False)

    predicted_yield_tons_ha = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)   # 0.0 – 1.0
    ndvi_input = Column(Float, nullable=True)
    evi_input = Column(Float, nullable=True)
    rainfall_input = Column(Float, nullable=True)
    temp_input = Column(Float, nullable=True)
    area_ha = Column(Float, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    state = relationship("State", foreign_keys=[state_id])
    district = relationship("District", foreign_keys=[district_id])
    crop_type = relationship("CropType", back_populates="yield_predictions")
