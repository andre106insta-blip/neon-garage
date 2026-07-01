from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    BOT_TOKEN: str = ""
    WEBAPP_URL: str = "http://localhost:5173"
    # Список Telegram user_id через запятую — кому разрешён доступ и кому шлются напоминания.
    ADMIN_TG_IDS: str = ""
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DB_PATH: str = "./data.db"

    @property
    def admin_ids(self) -> list[int]:
        return [int(x) for x in self.ADMIN_TG_IDS.replace(" ", "").split(",") if x]


settings = Settings()
