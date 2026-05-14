from __future__ import annotations

import argparse
import json
from pathlib import Path
import pickle

import numpy as np
import pandas as pd
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from app.models.intent_model import IntentMLP
from app.utils.text_clean import clean_text


def train(data_path: str, output_dir: str, epochs: int = 20, batch_size: int = 16) -> None:
    df = pd.read_csv(data_path)
    if "text" not in df.columns or "intent" not in df.columns:
        raise ValueError("intent dataset must contain text,intent columns")

    df["text"] = df["text"].astype(str).map(clean_text)
    X_train, X_val, y_train, y_val = train_test_split(
        df["text"].tolist(), df["intent"].astype(str).tolist(), test_size=0.2, random_state=42, stratify=df["intent"]
    )

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
    X_train_vec = vectorizer.fit_transform(X_train).astype(np.float32)
    X_val_vec = vectorizer.transform(X_val).astype(np.float32)

    encoder = LabelEncoder()
    y_train_enc = encoder.fit_transform(y_train)
    y_val_enc = encoder.transform(y_val)

    model = IntentMLP(input_dim=X_train_vec.shape[1], num_classes=len(encoder.classes_))
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    train_ds = TensorDataset(
        torch.tensor(X_train_vec.toarray(), dtype=torch.float32),
        torch.tensor(y_train_enc, dtype=torch.long),
    )
    val_x = torch.tensor(X_val_vec.toarray(), dtype=torch.float32)
    val_y = torch.tensor(y_val_enc, dtype=torch.long)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    best_acc = -1.0
    best_state = None
    for _ in range(epochs):
        model.train()
        for xb, yb in train_loader:
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()
        model.eval()
        with torch.no_grad():
            pred = model(val_x).argmax(dim=1)
            acc = (pred == val_y).float().mean().item()
            if acc > best_acc:
                best_acc = acc
                best_state = model.state_dict()

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": best_state or model.state_dict(),
            "input_dim": X_train_vec.shape[1],
            "num_classes": len(encoder.classes_),
        },
        out / "intent_model.pt",
    )
    with (out / "label_encoder.pkl").open("wb") as f:
        pickle.dump(encoder, f)
    with (out / "tfidf_vectorizer.pkl").open("wb") as f:
        pickle.dump(vectorizer, f)

    model.load_state_dict(best_state or model.state_dict())
    model.eval()
    with torch.no_grad():
        val_pred = model(val_x).argmax(dim=1).cpu().numpy()
    y_val_np = y_val_enc
    labels = encoder.classes_.tolist()
    report = classification_report(y_val_np, val_pred, target_names=labels, zero_division=0)
    metrics = {
        "model": "tfidf_mlp",
        "val_accuracy": float(accuracy_score(y_val_np, val_pred)),
        "val_macro_f1": float(f1_score(y_val_np, val_pred, average="macro", zero_division=0)),
        "val_weighted_f1": float(f1_score(y_val_np, val_pred, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_val_np, val_pred).tolist(),
        "label_order": labels,
        "classification_report": report,
    }
    (out / "intent_baseline_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(report)
    print(f"Wrote metrics to {out / 'intent_baseline_metrics.json'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="CSV file with text,intent")
    parser.add_argument("--output", default="app/models/artifacts")
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    train(args.data, args.output, epochs=args.epochs)

