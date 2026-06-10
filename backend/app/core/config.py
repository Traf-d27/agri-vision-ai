import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator

# Load environment variables from .env if present (searching up the directory tree)
load_dotenv()

def mask_database_url(url: str) -> str:
    if not url:
        return "None"
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.password:
            user_part = parsed.username or ""
            host_part = parsed.hostname or ""
            netloc = f"{user_part}:******@{host_part}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return parsed._replace(netloc=netloc).geturl()
        return url
    except Exception:
        return "Invalid URL format (masked)"

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

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

