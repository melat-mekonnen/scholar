"""
Fine-tune DistilBERT (or another HF encoder) for intent classification.

Saves to ``<output>/intent_hf/`` (Transformers format). Writes ``intent_hf_metrics.json``
with accuracy, macro F1, confusion matrix, and classification report for coursework / comparison
to the TF-IDF + MLP baseline (``train_intent.py``).

Example::

    python -m app.models.train_intent_distilbert \\
        --data app/data/intent_train.csv \\
        --output app/models/artifacts \\
        --epochs 6 \\
        --model-name distilbert-base-uncased
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup


def _light_clean(text: str) -> str:
    """Keep natural language for subword tokenization (do not strip digits/punctuation aggressively)."""
    return " ".join((text or "").strip().split())


class IntentDataset(Dataset):
    def __init__(self, texts: list[str], labels: list[int], tokenizer, max_length: int) -> None:
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        enc = self.tokenizer(
            self.texts[idx],
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        item = {k: v.squeeze(0) for k, v in enc.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


def train(
    data_path: str,
    output_dir: str,
    *,
    model_name: str = "distilbert-base-uncased",
    epochs: int = 6,
    batch_size: int = 8,
    lr: float = 2e-5,
    max_length: int = 128,
    seed: int = 42,
) -> None:
    df = pd.read_csv(data_path)
    if "text" not in df.columns or "intent" not in df.columns:
        raise ValueError("intent dataset must contain text,intent columns")

    df["text"] = df["text"].astype(str).map(_light_clean)
    intents = df["intent"].astype(str).tolist()
    texts = df["text"].tolist()

    encoder = LabelEncoder()
    y = encoder.fit_transform(intents)
    n_classes = len(encoder.classes_)
    if n_classes < 2:
        raise ValueError("need at least 2 intent classes")

    X_train, X_val, y_train, y_val = train_test_split(
        texts, y, test_size=0.2, random_state=seed, stratify=y
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    id2label = {str(i): lab for i, lab in enumerate(encoder.classes_)}
    label2id = {lab: i for i, lab in enumerate(encoder.classes_)}

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=n_classes,
        id2label=id2label,
        label2id=label2id,
    )

    train_ds = IntentDataset(X_train, y_train.tolist(), tokenizer, max_length)
    val_ds = IntentDataset(X_val, y_val.tolist(), tokenizer, max_length)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    total_steps = len(train_loader) * epochs
    warmup = max(1, int(0.1 * total_steps))
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, eps=1e-8)
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup, num_training_steps=total_steps
    )

    best_f1 = -1.0
    best_state: dict[str, torch.Tensor] | None = None

    for _ in range(epochs):
        model.train()
        for batch in train_loader:
            labels = batch.pop("labels").to(device)
            batch = {k: v.to(device) for k, v in batch.items()}
            optimizer.zero_grad()
            out = model(**batch, labels=labels)
            out.loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

        model.eval()
        val_preds: list[int] = []
        val_true: list[int] = []
        with torch.no_grad():
            for batch in val_loader:
                labels = batch.pop("labels").to(device)
                batch = {k: v.to(device) for k, v in batch.items()}
                logits = model(**batch).logits
                val_preds.extend(logits.argmax(dim=-1).cpu().tolist())
                val_true.extend(labels.cpu().tolist())

        vf1 = f1_score(val_true, val_preds, average="macro", zero_division=0)
        if vf1 > best_f1:
            best_f1 = vf1
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    val_preds = []
    val_true = []
    with torch.no_grad():
        for batch in val_loader:
            labels = batch.pop("labels").to(device)
            batch = {k: v.to(device) for k, v in batch.items()}
            logits = model(**batch).logits
            val_preds.extend(logits.argmax(dim=-1).cpu().tolist())
            val_true.extend(labels.cpu().tolist())

    labels_order = encoder.classes_.tolist()
    report = classification_report(val_true, val_preds, target_names=labels_order, zero_division=0)
    metrics = {
        "model": model_name,
        "val_accuracy": float(accuracy_score(val_true, val_preds)),
        "val_macro_f1": float(f1_score(val_true, val_preds, average="macro", zero_division=0)),
        "val_weighted_f1": float(f1_score(val_true, val_preds, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(val_true, val_preds).tolist(),
        "label_order": labels_order,
        "classification_report": report,
    }

    out_root = Path(output_dir)
    hf_dir = out_root / "intent_hf"
    hf_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(hf_dir)
    tokenizer.save_pretrained(hf_dir)

    metrics_path = out_root / "intent_hf_metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(report)
    print(f"Saved HF classifier to {hf_dir}")
    print(f"Wrote metrics to {metrics_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="CSV with text,intent")
    ap.add_argument("--output", default="app/models/artifacts")
    ap.add_argument("--model-name", default="distilbert-base-uncased")
    ap.add_argument("--epochs", type=int, default=6)
    ap.add_argument("--batch-size", type=int, default=8)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--max-length", type=int, default=128)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    train(
        args.data,
        args.output,
        model_name=args.model_name,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        max_length=args.max_length,
        seed=args.seed,
    )
