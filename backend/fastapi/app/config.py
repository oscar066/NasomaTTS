from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "nasoma"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    class Config:
        env_file = ".env"


settings = Settings()
