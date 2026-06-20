from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "餐厨废油回收监管系统 API"
    API_V1_PREFIX: str = "/api"

    DATABASE_URL: str = "postgresql://oil_admin:oil_admin_2024@localhost:5432/oil_recycle"
    SECRET_KEY: str = "oil_recycle_secret_key_2024_please_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    WEIGHT_DIFF_THRESHOLD: float = 5.0
    ROUTE_DEVIATION_THRESHOLD: float = 200.0
    OIL_UNIT_PRICE: float = 2.50
    TRANSPORT_TIMEOUT_MINUTES: int = 180

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
