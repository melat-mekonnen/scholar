from __future__ import annotations

from pathlib import Path
import pickle
from typing import Optional, Protocol, Tuple, runtime_checkable

import torch

from app.models.intent_model import IntentMLP
from app.utils.text_clean import clean_text


@runtime_checkable
class IntentPredictorProtocol(Protocol):
    def predict(self, text: str) -> Tuple[str, float]: ...


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


class HfIntentPredictor:
    """DistilBERT / other HF sequence-classification checkpoints under ``intent_hf/``."""

    def __init__(self, hf_dir: str) -> None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        root = Path(hf_dir)
        self.tokenizer = AutoTokenizer.from_pretrained(str(root))
        self.model = AutoModelForSequenceClassification.from_pretrained(str(root))
        self.model.eval()
        raw = dict(getattr(self.model.config, "id2label", None) or {})
        id2l = {int(k): v for k, v in raw.items()}
        self.labels = [id2l[i] for i in range(len(id2l))]

    def predict(self, text: str) -> Tuple[str, float]:
        enc = self.tokenizer(
            text,
            truncation=True,
            padding=True,
            max_length=128,
            return_tensors="pt",
        )
        with torch.no_grad():
            logits = self.model(**enc).logits
            probs = torch.softmax(logits, dim=-1).squeeze(0)
        idx = int(torch.argmax(probs).item())
        lab = self.labels[idx] if idx < len(self.labels) else str(idx)
        return lab, float(probs[idx].item())


def load_intent_predictor(artifact_dir: str) -> Optional[IntentPredictorProtocol]:
    """
    Prefer fine-tuned HF encoder (``intent_hf/config.json``) when present; else TF-IDF + MLP bundle.
    """
    root = Path(artifact_dir)
    hf_cfg = root / "intent_hf" / "config.json"
    if hf_cfg.is_file():
        return HfIntentPredictor(str(root / "intent_hf"))
    if (root / "intent_model.pt").is_file():
        return IntentPredictor(str(root))
    return None

