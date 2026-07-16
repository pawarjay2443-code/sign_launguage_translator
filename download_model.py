# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : download_model.py
# PURPOSE  : Download the MediaPipe hand landmark model
# RUN ONCE : py download_model.py
# ============================================================

import urllib.request  # Built-in Python module to download files
import os              # Built-in module to work with file paths

# URL of the official MediaPipe hand landmark model from Google
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

# We'll save the model in a 'model' folder inside our project
MODEL_DIR  = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "hand_landmarker.task")

def download():
    # Create the model folder if it doesn't already exist
    os.makedirs(MODEL_DIR, exist_ok=True)

    # If model already downloaded, skip
    if os.path.exists(MODEL_PATH):
        print("[OK] Model already exists at:", MODEL_PATH)
        return

    print("[INFO] Downloading hand landmark model...")
    print("       This may take 10-30 seconds depending on your internet speed.")

    # Download the file from Google's servers and save it locally
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)

    print("[DONE] Model saved to:", MODEL_PATH)

if __name__ == "__main__":
    download()
