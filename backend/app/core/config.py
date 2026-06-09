from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriIntel AI Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "96d6786c07a3c36a6e5b56501c5ad83226a2468305ffae4d2719119616d6f8ff"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    DATABASE_URL: str = "sqlite:///./agri_intel.db"
    
    # CORS setup
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True

settings = Settings()
