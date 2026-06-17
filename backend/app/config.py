import os

from dotenv import load_dotenv

load_dotenv()

# Application settings loaded from environment variables.
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./solarpulse.db")
JWT_SECRET: str = os.getenv("JWT_SECRET", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
