# 🤟 SignAI — AI-Based Real-Time Sign Language Translator

**SignAI** is a professional, real-time sign language translation system built for final-year project evaluation. The application leverages Google's MediaPipe framework for skeletal hand landmarker tracking and Flask for backend streaming, translating static signs to text and speech directly in a modern web dashboard.

---

## 🚀 Key Features

*   **Real-Time Joint Tracking:** Tracks 21 distinct hand landmarks dynamically using high-performance computer vision.
*   **Intelligent Face Trigger Activation:** Auto-locks and unlocks translation by verifying if a user is actively facing the camera screen.
*   **Rule-Based Algorithmic Translation:** Instantly converts coordinate geometry structures to Indian Sign Language (ISL) static letters.
*   **Word & Sentence Builder:** Assembles recognized letters into full words and continuous sentences.
*   **Universal Web Audio TTS:** Utilizes modern browser-based Web Speech APIs to read constructed sentences aloud.
*   **Modern Glassmorphism Dashboard:** Vibrant, responsive, and intuitive dark mode web interface.

---

## 🛠️ Project Stack

*   **Backend:** Python 3.11+, Flask
*   **Computer Vision:** OpenCV (cv2), Google MediaPipe (v0.10+ Tasks API)
*   **Frontend:** HTML5, CSS3 (Glassmorphism design system), Vanilla JavaScript (Web APIs)

---

## 📂 Project Architecture

```
sign language translator/
├── app.py                  # Main Flask Web Server & API Orchestrator
├── hand_detector.py        # OpenCV Wrapper & MediaPipe Joint Tracker
├── gesture_recognizer.py   # Rule-based ISL Gesture Recognizer
├── finger_counter.py       # Helper utility for finger state analysis
├── requirements.txt        # Python dependency manifest
├── README.md               # Project documentation
│
├── model/                  # AI Model Files
│   ├── hand_landmarker.task
│   └── haarcascade_frontalface_default.xml
│
├── templates/              # Jinja2 HTML Templates
│   ├── base.html           # Unified navigation & footer layout
│   ├── landing.html        # Home & project overview page
│   └── dashboard.html      # Main webcam translation view
│
└── static/                 # Static Assets
    ├── css/
    │   └── style.css       # Main design stylesheet
    └── js/
        └── app.js          # Client-side streaming & status controller
```

---

## ⚙️ Setup and Installation

### 1. Install Dependencies
Ensure you have Python 3.11+ installed. Run:
```bash
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask server:
```bash
python app.py
```

### 3. Access the System
Open your web browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## 💡 How to Use
1.  Open the website home page and click **Launch Translator**.
2.  Click the **Start Camera** button to start the live feed.
3.  Stand/sit in front of the webcam. The system requires face detection to activate.
4.  Perform any supported gesture and **hold it** for 15 frames.
5.  Watch the progress bar confirm the character and append it to the **Word Builder**.
6.  Perform actions like **Space** to build words, **Backspace** to edit, and **Speak** to read the full sentence.

---

## 📋 Current Scope & Limitations

### 🔤 Supported Alphabet (15 ISL Letters)
The following 15 static, one-handed ISL letter gestures are supported by the rule-based recognition system:
*   **A, B, C, D, E, F, I, K, L, O, S, U, V, W, Y**

### 🔢 Supported Digits (0–9)
The system supports numeric gestures 0–9 using finger-counting logic:
*   **0:** Two-handed fists (both hands active with 0 fingers up).
*   **1 to 5:** One-handed finger counts (if they do not match a specific letter shape).
    *   *Example 3:* Extend Thumb + Index + Middle.
    *   *Example 4:* Extend Thumb + Index + Middle + Ring.
*   **6 to 9:** Two-handed finger counts (sum of fingers raised on both active hands).
    *   *Example 6:* Raise 5 fingers on one hand and 1 finger on the other hand.

### 🚫 Out of Scope
*   **Two-handed or Dynamic Alphabet Letters:** **G, H, J, M, N, P, Q, R, T, X, Z** are out of scope for the rule-based algorithmic approach as they require dynamic motion tracking or complex two-handed alphabet mapping.

---

## 👥 Development Team
*   **Om Chavan** (Team Leader & Core Developer)
*   **Jay** (Integration & Backend Engineer)
*   **Ayush** (UI/UX & Frontend Designer)
*   **Tejas** (QA & Documentation Lead)

Agnel Polytechnic, Vashi — Diploma in Information Technology

---

## 📚 Dataset Attribution

This project utilizes visual sign image assets for reverse translation sourced from the CC0-licensed dataset:
- **RealSign Indian Sign Language Dataset (CC0 1.0)** — [GitHub Repository](https://github.com/RealSign62/RealSign-Indian-Sign-Language-Dataset)
