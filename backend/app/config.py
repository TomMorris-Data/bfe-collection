from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://bfe:bfe_local_pw@localhost:5432/bfe_health"
    secret_key: str = "local-dev-secret-change-in-prod"
    resend_api_key: str = ""
    anthropic_api_key: str = ""
    app_base_url: str = "http://localhost:3000"
    environment: str = "development"
    token_expiry_days: int = 7
    from_email: str = "noreply@bfe-vets.co.uk"
    from_name: str = "Belmont Farm & Equine Vets"

    class Config:
        env_file = ".env"


settings = Settings()
