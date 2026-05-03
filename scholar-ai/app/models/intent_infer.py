from __future__ import annotations

from pathlib import Path
import pickle
from typing import Tuple

import torch

from app.models.intent_model import IntentMLP
from app.utils.text_clean import clean_text


class IntentPredictor:
    def __init__(self, artifact_dir: str) -> None:
        root = Path(artifact_dir)
        model_data = torch.load(root / "intent_model.pt", map_location="cpu")
        with (root / "label_encoder.pkl").open("rb") as f:
            encoder = pickle.load(f)
        with (root / "tfidf_vectorizer.pkl").open("rb") as f:
            vectorizer = pickle.load(f)

        self.labels = encoder.classes_.tolist()
        self.vectorizer = vectorizer
        self.model = IntentMLP(input_dim=model_data["input_dim"], num_classes=model_data["num_classes"])
        self.model.load_state_dict(model_data["state_dict"])
        self.model.eval()

    def predict(self, text: str) -> Tuple[str, float]:
        vec = self.vectorizer.transform([clean_text(text)]).astype("float32").toarray()
        xb = torch.tensor(vec, dtype=torch.float32)
        with torch.no_grad():
            logits = self.model(xb)
            probs = torch.softmax(logits, dim=1).squeeze(0)
        idx = int(torch.argmax(probs).item())
        return self.labels[idx], float(probs[idx].item())

