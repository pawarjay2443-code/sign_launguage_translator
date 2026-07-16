# AI-Based Sign Language Translator 🤟

A Final Year Diploma IT Project that detects hand gestures in real time using a webcam and converts sign language into text (and later, speech).

## Tech Stack
- Python 3.13
- OpenCV (camera & image processing)
- MediaPipe (hand landmark detection)
- Machine Learning (coming soon)

## Project Structure
```
sign-language-translator/
├── main.py              # Entry point — runs the app
├── hand_detector.py     # Hand detection using MediaPipe Tasks API
├── download_model.py    # Downloads the AI hand landmark model
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Install dependencies
```bash
py -m pip install opencv-python mediapipe numpy
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
- [ ] Step 3: Finger counting
- [ ] Step 4: Gesture recognition (A, B, C...)
- [ ] Step 5: Text output
- [ ] Step 6: Text-to-speech

## Author
Om Chavan — Diploma IT, Final Year Project
