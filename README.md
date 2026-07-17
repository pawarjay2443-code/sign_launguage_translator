# AI-Based Sign Language Translator 🤟

A Final Year Diploma IT Project that detects hand gestures in real time using a webcam and converts sign language into text (and later, speech).

## Tech Stack
- Python 3.13
- OpenCV (camera & image processing)
- MediaPipe (hand landmark detection)
- pyttsx3 (offline text-to-speech)
- Rule-Based Gesture Recognition (A–Y static letters)

## Project Structure
```
sign-language-translator/
├── main.py                # Entry point — runs the app
├── hand_detector.py       # Hand detection using MediaPipe Tasks API
├── finger_counter.py      # Counts fingers UP/DOWN from landmarks
├── gesture_recognizer.py  # Maps landmarks to ASL letters (A–Y)
├── tts_engine.py          # Text-to-speech (pyttsx3, async)
├── download_model.py      # Downloads the AI hand landmark model
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Install dependencies
```bash
py -m pip install opencv-python mediapipe numpy pyttsx3
```

### 2. Download the AI model (run once)
```bash
py download_model.py
```

### 3. Run the app
```bash
py main.py
```

## Features (Step by Step Progress)
- [x] Step 1: Webcam setup
- [x] Step 2: Real-time hand detection with 21 landmarks
- [x] Step 3: Finger counting
- [x] Step 4: Gesture recognition (A–Y, 24 static letters)
- [x] Step 5: Text output & sentence builder
- [x] Step 6: Text-to-speech (offline, async)

## Author
Om Chavan — Diploma IT, Final Year Project
