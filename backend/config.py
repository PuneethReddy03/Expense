import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def get_database_url():
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'expense_tracker.db'}")
    if database_url.startswith(("postgres://", "postgresql://")):
        return database_url.replace("postgres://", "postgresql+psycopg2://", 1).replace(
            "postgresql://", "postgresql+psycopg2://", 1
        )
    return database_url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-this-development-key-32")
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:5174")
