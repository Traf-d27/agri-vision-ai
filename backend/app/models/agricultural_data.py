from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    districts = relationship("District", back_populates="state", cascade="all, delete-orphan")
    crops = relationship("CropRecord", back_populates="state", cascade="all, delete-orphan")
    weather = relationship("WeatherRecord", back_populates="state", cascade="all, delete-orphan")
    soil_data = relationship("SoilRecord", back_populates="state", cascade="all, delete-orphan")

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)

    state = relationship("State", back_populates="districts")
    crops = relationship("CropRecord", back_populates="district", cascade="all, delete-orphan")
    weather = relationship("WeatherRecord", back_populates="district", cascade="all, delete-orphan")
    soil_data = relationship("SoilRecord", back_populates="district", cascade="all, delete-orphan")

class CropRecord(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    crop_type = Column(String, nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    farm_area_acres = Column(Float, nullable=False)
    irrigation_type = Column(String, nullable=False)
    fertilizer_used_tons = Column(Float, nullable=False)
    pesticide_used_kg = Column(Float, nullable=False)
    yield_tons = Column(Float, nullable=False)
    water_usage_cubic_meters = Column(Float, nullable=False)
    soil_type = Column(String, nullable=False)
    season = Column(String, nullable=False)

    state = relationship("State", back_populates="crops")
    district = relationship("District", back_populates="crops")

class WeatherRecord(Base):
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    avg_temp = Column(Float, nullable=False)
    annual_rainfall = Column(Float, nullable=False)
    avg_humidity = Column(Float, nullable=False)
    avg_windspeed = Column(Float, nullable=False)
    drought_risk = Column(String, nullable=False)
    flood_risk = Column(String, nullable=False)

    state = relationship("State", back_populates="weather")
    district = relationship("District", back_populates="weather")

class SoilRecord(Base):
    __tablename__ = "soil_data"

    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    soil_type = Column(String, nullable=False)
    soil_index = Column(Float, nullable=False)

    state = relationship("State", back_populates="soil_data")
    district = relationship("District", back_populates="soil_data")
