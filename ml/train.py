import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import joblib

# --- TASK 1 & 2: DATASET STRUCTURE & SYNTHETIC DATA GENERATION ---
np.random.seed(42)
N = 1200

def generate_sample():
    has_official_domain = np.random.binomial(1, 0.6)
    has_deadline = np.random.binomial(1, 0.7)
    has_eligibility = np.random.binomial(1, 0.7)
    has_contact_info = np.random.binomial(1, 0.6)
    keyword_density = np.random.normal(0.15 + 0.1 * has_official_domain, 0.05)
    content_length = int(np.random.normal(1200 + 500 * has_official_domain, 300))
    is_https = np.random.binomial(1, 0.8)
    # Label rule
    if has_official_domain and has_deadline and has_eligibility:
        label = 1 if np.random.rand() > 0.1 else 0  # 10% noise
    else:
        label = 1 if np.random.rand() < 0.08 else 0  # 8% random positives
    return [has_official_domain, has_deadline, has_eligibility, has_contact_info, keyword_density, content_length, is_https, label]

columns = [
    "has_official_domain",
    "has_deadline",
    "has_eligibility",
    "has_contact_info",
    "keyword_density",
    "content_length",
    "is_https",
    "label"
]

data = [generate_sample() for _ in range(N)]
df = pd.DataFrame(data, columns=columns)

# --- TASK 3: FEATURE PROCESSING ---
X = df.drop("label", axis=1)
y = df["label"]

scaler = StandardScaler()
X_scaled = X.copy()
X_scaled["keyword_density"] = scaler.fit_transform(X[["keyword_density"]])
X_scaled["content_length"] = scaler.fit_transform(X[["content_length"]])

# --- TASK 4: MODEL ---
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Test accuracy: {acc:.3f}")

# --- TASK 5: SAVE MODEL ---
joblib.dump({
    "model": clf,
    "scaler": scaler,
    "columns": X.columns.tolist()
}, "model.pkl")
