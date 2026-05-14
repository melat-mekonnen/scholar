from __future__ import annotations

import re


def clean_text(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"http[s]?://\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s\-_/]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

