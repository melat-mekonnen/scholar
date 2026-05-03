from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict, Any

import pandas as pd


CANONICAL_COLUMNS = [
    "name",
    "country",
    "field",
    "deadline",
    "eligibility",
    "funding_type",
    "level",
]


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {
        "funding type": "funding_type",
        "fundingType": "funding_type",
        "field_of_study": "field",
        "degree_level": "level",
    }
    for src, dst in col_map.items():
        if src in df.columns and dst not in df.columns:
            df = df.rename(columns={src: dst})
    for col in CANONICAL_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    return df[CANONICAL_COLUMNS].fillna("")


def load_own_dataset(json_path: str) -> pd.DataFrame:
    p = Path(json_path)
    if not p.exists():
        return pd.DataFrame(columns=CANONICAL_COLUMNS)
    data = json.loads(p.read_text(encoding="utf-8"))
    return _normalize_columns(pd.DataFrame(data))


def load_public_dataset(csv_path: str) -> pd.DataFrame:
    p = Path(csv_path)
    if not p.exists():
        return pd.DataFrame(columns=CANONICAL_COLUMNS)
    return _normalize_columns(pd.read_csv(p))


def load_hybrid_records(own_json_path: str, public_csv_path: str) -> List[Dict[str, Any]]:
    own_df = load_own_dataset(own_json_path)
    public_df = load_public_dataset(public_csv_path)
    merged = pd.concat([own_df, public_df], ignore_index=True)
    merged = merged.drop_duplicates(subset=["name", "country", "field", "deadline"])
    return merged.to_dict(orient="records")

