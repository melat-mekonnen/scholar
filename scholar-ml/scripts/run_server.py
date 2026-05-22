"""
Milestone 8 — Start FastAPI service (Uvicorn).

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.run_server
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os

os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.example", override=False)

from src.api import main

if __name__ == "__main__":
    main()
