# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : scripts/train_word_classifier.py
# PURPOSE  : Train a word-level sign classifier from recorded
#            30-frame landmark sequences.
#
# MODELS TRAINED:
#   1. Random Forest (baseline) — fast, works well with limited data
#   2. LSTM (Keras/TensorFlow) — better with more data (100+ per word)
#
# USAGE:
#   python scripts/train_word_classifier.py
#   python scripts/train_word_classifier.py --dry-run   # Verify setup only
#
# OUTPUT:
#   model/word_classifier_rf.pkl     — Random Forest model
#   model/word_classifier_lstm.h5    — LSTM model (if TensorFlow available)
#   model/word_label_map.json        — Word label ↔ index mapping
#
# ============================================================

import os
import sys
import json
import argparse
import numpy as np
from collections import Counter

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# ════════════════════════════════════════════════════════════
# CONFIGURATION
# ════════════════════════════════════════════════════════════

DATA_DIR = os.path.join(PROJECT_ROOT, "data", "word_sequences")
MODEL_DIR = os.path.join(PROJECT_ROOT, "model")

RF_MODEL_PATH = os.path.join(MODEL_DIR, "word_classifier_rf.pkl")
LSTM_MODEL_PATH = os.path.join(MODEL_DIR, "word_classifier_lstm.h5")
LABEL_MAP_PATH = os.path.join(MODEL_DIR, "word_label_map.json")

SEQUENCE_LENGTH = 30   # Must match data collection
FEATURES_PER_FRAME = 126  # 63 per hand × 2 hands
TEST_SPLIT = 0.2       # 80% train, 20% test
RANDOM_STATE = 42


# ════════════════════════════════════════════════════════════
# DATA LOADING
# ════════════════════════════════════════════════════════════

def load_dataset():
    """
    Load all recorded word sequences from the data directory.

    Returns:
    - X : np.ndarray of shape (N, 30, 126) — N samples of 30-frame sequences
    - y : np.ndarray of shape (N,) — word labels as strings
    - label_map : dict mapping word string → integer index
    """
    X_list = []
    y_list = []

    if not os.path.isdir(DATA_DIR):
        print(f"[ERROR] Data directory not found: {DATA_DIR}")
        print("        Run collect_word_data.py first to record samples.")
        return None, None, None

    # Scan each word subdirectory
    word_dirs = sorted([
        d for d in os.listdir(DATA_DIR)
        if os.path.isdir(os.path.join(DATA_DIR, d))
    ])

    if not word_dirs:
        print("[ERROR] No word data directories found.")
        print("        Run collect_word_data.py first to record samples.")
        return None, None, None

    print(f"\n{'='*55}")
    print("  LOADING DATASET")
    print(f"{'='*55}")

    for word_dir_name in word_dirs:
        word_path = os.path.join(DATA_DIR, word_dir_name)
        npy_files = sorted([
            f for f in os.listdir(word_path)
            if f.endswith(".npy")
        ])

        if not npy_files:
            continue

        # Convert directory name back to word label
        word_label = word_dir_name.replace("_", " ").title()

        for npy_file in npy_files:
            filepath = os.path.join(word_path, npy_file)
            try:
                arr = np.load(filepath)
                # Validate shape
                if arr.shape == (SEQUENCE_LENGTH, FEATURES_PER_FRAME):
                    X_list.append(arr)
                    y_list.append(word_label)
                else:
                    print(f"  [SKIP] {filepath} — unexpected shape {arr.shape}")
            except Exception as e:
                print(f"  [SKIP] {filepath} — load error: {e}")

        print(f"  ✓ {word_label:15s}: {len([l for l in y_list if l == word_label])} samples")

    if not X_list:
        print("[ERROR] No valid samples found.")
        return None, None, None

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list)

    # Create label map
    unique_labels = sorted(set(y))
    label_map = {label: idx for idx, label in enumerate(unique_labels)}

    print(f"\n  Total samples: {len(X)}")
    print(f"  Total words:   {len(unique_labels)}")
    print(f"  Data shape:    {X.shape}")
    print(f"{'='*55}\n")

    return X, y, label_map


# ════════════════════════════════════════════════════════════
# RANDOM FOREST TRAINING (BASELINE)
# ════════════════════════════════════════════════════════════

def train_random_forest(X_train, y_train, X_test, y_test, label_map):
    """
    Train a Random Forest classifier on flattened sequences.
    This is the baseline model — fast and works with limited data.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report, accuracy_score

    print("=" * 55)
    print("  TRAINING: Random Forest (Baseline)")
    print("=" * 55)

    # Flatten sequences: (N, 30, 126) → (N, 3780)
    X_train_flat = X_train.reshape(X_train.shape[0], -1)
    X_test_flat = X_test.reshape(X_test.shape[0], -1)

    print(f"  Flattened feature size: {X_train_flat.shape[1]}")
    print(f"  Training samples: {len(X_train_flat)}")
    print(f"  Test samples:     {len(X_test_flat)}")
    print("  Training...")

    # Train
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight="balanced"  # Handle imbalanced classes
    )
    clf.fit(X_train_flat, y_train)

    # Evaluate
    y_pred = clf.predict(X_test_flat)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n  ✓ Accuracy: {accuracy:.4f} ({accuracy * 100:.1f}%)")
    print(f"\n  Per-Word Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Save model
    import joblib
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, RF_MODEL_PATH)
    print(f"  [SAVED] Random Forest model → {RF_MODEL_PATH}")

    return clf, accuracy


# ════════════════════════════════════════════════════════════
# LSTM TRAINING (ADVANCED)
# ════════════════════════════════════════════════════════════

def train_lstm(X_train, y_train_idx, X_test, y_test_idx, num_classes, label_map):
    """
    Train an LSTM sequence classifier using Keras/TensorFlow.
    Better with more data (100+ samples per word).
    """
    try:
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers
    except ImportError:
        print("\n  [SKIP] TensorFlow not installed. Skipping LSTM training.")
        print("         Install with: pip install tensorflow>=2.13.0")
        return None, 0.0

    print("\n" + "=" * 55)
    print("  TRAINING: LSTM (Sequence Classifier)")
    print("=" * 55)

    print(f"  Input shape: ({SEQUENCE_LENGTH}, {FEATURES_PER_FRAME})")
    print(f"  Classes: {num_classes}")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Test samples:     {len(X_test)}")

    # One-hot encode labels
    y_train_oh = keras.utils.to_categorical(y_train_idx, num_classes)
    y_test_oh = keras.utils.to_categorical(y_test_idx, num_classes)

    # Build LSTM model
    model = keras.Sequential([
        layers.Input(shape=(SEQUENCE_LENGTH, FEATURES_PER_FRAME)),
        layers.LSTM(64, return_sequences=False),
        layers.Dropout(0.3),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.summary()

    # Train with early stopping
    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=10,
        restore_best_weights=True
    )

    print("\n  Training...")
    history = model.fit(
        X_train, y_train_oh,
        validation_data=(X_test, y_test_oh),
        epochs=50,
        batch_size=16,
        callbacks=[early_stop],
        verbose=1
    )

    # Evaluate
    loss, accuracy = model.evaluate(X_test, y_test_oh, verbose=0)
    print(f"\n  ✓ LSTM Accuracy: {accuracy:.4f} ({accuracy * 100:.1f}%)")

    # Per-class report
    y_pred_probs = model.predict(X_test, verbose=0)
    y_pred_idx = np.argmax(y_pred_probs, axis=1)

    inv_label_map = {v: k for k, v in label_map.items()}
    y_test_names = [inv_label_map[i] for i in y_test_idx]
    y_pred_names = [inv_label_map[i] for i in y_pred_idx]

    from sklearn.metrics import classification_report
    print(f"\n  Per-Word Classification Report:")
    print(classification_report(y_test_names, y_pred_names, zero_division=0))

    # Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(LSTM_MODEL_PATH)
    print(f"  [SAVED] LSTM model → {LSTM_MODEL_PATH}")

    return model, accuracy


# ════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Train word-level sign classifier")
    parser.add_argument("--dry-run", action="store_true",
                        help="Verify setup without training")
    args = parser.parse_args()

    print("=" * 55)
    print("  SignAI — Word Classifier Training")
    print("=" * 55)

    # Load dataset
    X, y, label_map = load_dataset()

    if X is None:
        print("\n[ABORT] Cannot train without data.")
        print("        Run: python scripts/collect_word_data.py")
        sys.exit(1)

    # Check minimum data requirements
    counts = Counter(y)
    min_samples = min(counts.values())
    if min_samples < 3:
        print(f"\n[WARNING] Some words have very few samples (min: {min_samples}).")
        print("          Recommend at least 10 samples per word for meaningful results.")

    if args.dry_run:
        print("\n[DRY RUN] Data loaded successfully. Setup is correct.")
        print(f"  Words: {list(label_map.keys())}")
        print(f"  Total samples: {len(X)}")
        sys.exit(0)

    # Encode labels to integers
    y_idx = np.array([label_map[label] for label in y])

    # Train/test split (stratified)
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test, y_train_idx, y_test_idx = train_test_split(
        X, y, y_idx,
        test_size=TEST_SPLIT,
        random_state=RANDOM_STATE,
        stratify=y
    )

    # Save label map
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(LABEL_MAP_PATH, "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"[SAVED] Label map → {LABEL_MAP_PATH}")

    # ── Train Random Forest (Baseline) ──
    rf_model, rf_accuracy = train_random_forest(
        X_train, y_train, X_test, y_test, label_map
    )

    # ── Train LSTM (Advanced) ──
    num_classes = len(label_map)
    lstm_model, lstm_accuracy = train_lstm(
        X_train, y_train_idx, X_test, y_test_idx, num_classes, label_map
    )

    # ── Summary ──
    print("\n" + "=" * 55)
    print("  TRAINING COMPLETE — RESULTS SUMMARY")
    print("=" * 55)
    print(f"  Random Forest accuracy: {rf_accuracy:.4f} ({rf_accuracy * 100:.1f}%)")
    if lstm_model is not None:
        print(f"  LSTM accuracy:          {lstm_accuracy:.4f} ({lstm_accuracy * 100:.1f}%)")
        if lstm_accuracy > rf_accuracy:
            print(f"\n  ★ LSTM is the better model (+{(lstm_accuracy - rf_accuracy)*100:.1f}%)")
            print(f"    Recommended: model/word_classifier_lstm.h5")
        else:
            print(f"\n  ★ Random Forest is the better model (+{(rf_accuracy - lstm_accuracy)*100:.1f}%)")
            print(f"    Recommended: model/word_classifier_rf.pkl")
    else:
        print(f"\n  ★ Using Random Forest (LSTM was not trained)")
        print(f"    Model: model/word_classifier_rf.pkl")

    print(f"\n  Label map: model/word_label_map.json")
    print(f"  Words trained: {list(label_map.keys())}")
    print("=" * 55)


if __name__ == "__main__":
    main()
