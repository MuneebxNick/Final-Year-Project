"""Train RandomForestRegressor for pothole days-until-critical.

Run from backend/:
  python -m app.ml.train_lifetime_model
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = [
    "severity",
    "bounding_box_percentage",
    "road_type",
    "traffic_density",
    "rainfall_probability",
    "temperature_celsius",
    "season",
]
TARGET = "days_until_critical"

DATA_PATH = Path(__file__).resolve().parent / "data" / "synthetic_lifetime_data.csv"
MODELS_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODELS_DIR / "lifetime_model.pkl"
ENCODERS_PATH = MODELS_DIR / "feature_encoders.json"

# Canonical string → int maps matching generate_training_data.py.
# CSV is already integer-encoded; this JSON is the predict-time contract.
FEATURE_ENCODERS = {
    "severity": {"Small": 0, "Medium": 1, "Large": 2},
    "road_type": {"Simple Road": 0, "Service Road": 1, "Highway": 2},
    "traffic_density": {"Low": 0, "Medium": 1, "High": 2},
    "season": {"Winter": 0, "Summer": 1, "Monsoon": 2},
    "reverse": {
        "severity": {"0": "Small", "1": "Medium", "2": "Large"},
        "road_type": {"0": "Simple Road", "1": "Service Road", "2": "Highway"},
        "traffic_density": {"0": "Low", "1": "Medium", "2": "High"},
        "season": {"0": "Winter", "1": "Summer", "2": "Monsoon"},
    },
}


def load_dataset(path: Path = DATA_PATH) -> tuple[pd.DataFrame, pd.Series]:
    frame = pd.read_csv(path)
    missing = [col for col in (*FEATURES, TARGET) if col not in frame.columns]
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")
    return frame[FEATURES], frame[TARGET]


def train_model(X: pd.DataFrame, y: pd.Series) -> tuple[RandomForestRegressor, dict[str, float]]:
    X_train, X_test, y_train, y_test = train_test_split(
        X.to_numpy(), y.to_numpy(), test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
        "r2": float(r2_score(y_test, y_pred)),
    }
    return model, metrics


def save_artifacts(model: RandomForestRegressor) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    ENCODERS_PATH.write_text(json.dumps(FEATURE_ENCODERS, indent=2) + "\n")


def print_report(model: RandomForestRegressor, metrics: dict[str, float]) -> None:
    print(f"MAE: {metrics['mae']:.4f}")
    print(f"RMSE: {metrics['rmse']:.4f}")
    print(f"R²: {metrics['r2']:.4f}")
    importances = sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda item: item[1],
        reverse=True,
    )
    print("Feature importances:")
    for name, value in importances:
        print(f"  {name}: {value:.6f}")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved encoders: {ENCODERS_PATH}")


def main() -> None:
    X, y = load_dataset()
    model, metrics = train_model(X, y)
    save_artifacts(model)
    print_report(model, metrics)


if __name__ == "__main__":
    main()
