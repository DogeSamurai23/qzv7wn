"""Vercel Python function entry: serves the FastAPI app from backend/."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401
