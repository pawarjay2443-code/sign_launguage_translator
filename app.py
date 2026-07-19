# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : app.py
# PURPOSE  : Flask web server — wraps the existing AI pipeline
#            and streams the webcam feed to the browser.
# ============================================================
#
# HOW IT WORKS (simple explanation):
#
#   1. Flask runs a web server at http://127.0.0.1:5000
#   2. A background thread runs the webcam + AI pipeline loop
#   3. Each processed frame is JPEG-encoded and sent to the
#      browser as an MJPEG stream (like a live TV signal).
#   4. The browser polls /status every 500ms to get the current
#      detected letter and word as JSON.
#   5. Buttons call /start, /stop, /clear, /speak via fetch().
#
# ============================================================

import os
# Suppress noisy TensorFlow and MediaPipe warnings in the terminal
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"

import cv2
import time
import threading
from flask import Flask, Response, jsonify, render_template, request

# ── Import your existing AI modules (no changes needed to them) ──
from hand_detector import HandDetector
from gesture_recognizer import GestureRecognizer


# ============================================================
# Flask App Setup
# ============================================================

app = Flask(__name__)


# ============================================================
# Shared State
# ============================================================
# These variables are shared between the background camera
# thread and Flask route handlers.
# threading.Lock() ensures only one thread modifies them at once.

class AppState:
    """
    A single object to hold all shared state for the application.
    This avoids messy global variables.
    """
    def __init__(self):
        self.lock = threading.Lock()        # Protects shared data from race conditions

        # Camera / thread state
        self.camera_running = False         # True while the camera loop is active
        self.camera_thread = None           # Reference to the background thread

        # Latest processed frame (as JPEG bytes) to send to browser
        self.latest_frame = None

        # AI / gesture state
        self.current_gesture = None         # The letter currently being held
        self.gesture_frames = 0             # How many consecutive frames it was seen
        self.CONFIRMATION_FRAMES = 15       # Frames needed to confirm a letter

        # Text state
        self.current_word = ""              # Word being built letter by letter
        self.sentence = ""                  # Full sentence (multiple words)
        self.last_added_letter = ""         # Last confirmed letter (for UI animation)

        # Performance
        self.fps = 0


# Create one global state object
state = AppState()


# ============================================================
# Background Camera Thread
# ============================================================

def camera_loop():
    """
    This function runs in a BACKGROUND THREAD.
    It opens the webcam, runs the AI pipeline on each frame,
    and stores the latest JPEG frame in `state.latest_frame`
    so the /video_feed route can serve it.
    """
    cap = None
    detector = None
    try:
        # ── Open the webcam ──────────────────────────────────────
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)  # Try second camera if first fails
        if not cap.isOpened():
            print("[ERROR] Could not open camera.")
            with state.lock:
                state.camera_running = False
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        print("[OK] Camera opened for web app.")

        # ── Load AI modules ──────────────────────────────────────
        detector   = HandDetector(model_path="model/hand_landmarker.task", max_hands=2)
        recognizer = GestureRecognizer()

        prev_time = 0

        # ── Main loop ────────────────────────────────────────────
        while True:
            # Check if we should stop (set by /stop route)
            with state.lock:
                should_run = state.camera_running
            if not should_run:
                break

            # Read one frame from the webcam
            ret, frame = cap.read()
            if not ret:
                break

            # Mirror the frame (so it feels like a selfie camera)
            frame = cv2.flip(frame, 1)

            # ── Run hand detection ───────────────────────────────
            frame, results = detector.find_hands(frame, draw=True)

            detected_letter = None
            landmarks_flat = detector.get_normalized_landmarks()

            # Enforce Face Detection Activation Trigger (from the GitHub project model)
            if detector.is_face_detected():
                if detector.is_hand_detected():
                    # Recognize the gesture using the sequence recognizer
                    detected_letter = recognizer.recognize(landmarks_flat)

                    # ── Gesture confirmation logic ───────────────────
                    with state.lock:
                        if detected_letter:
                            if detected_letter == state.current_gesture:
                                state.gesture_frames += 1
                            else:
                                state.current_gesture = detected_letter
                                state.gesture_frames = 1

                            # Once held long enough, add to word
                            if state.gesture_frames == state.CONFIRMATION_FRAMES:
                                state.current_word    += detected_letter
                                state.last_added_letter = detected_letter
                                state.gesture_frames  = 0  # Reset so same letter can be typed again
                        else:
                            state.current_gesture = None
                            state.gesture_frames  = 0

                    # ── Overlay: Detected letter and current word ────
                    display_char = detected_letter if detected_letter else "?"
                    cv2.putText(frame, f"LETTER: {display_char}", (10, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 200, 255), 3)

                    with state.lock:
                        word_display = state.current_word
                    cv2.putText(frame, f"Word: {word_display}", (10, 100),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 200), 2)

                    # ── Progress bar: gesture confirmation progress ──
                    with state.lock:
                        progress = state.gesture_frames
                    bar_width = int((progress / state.CONFIRMATION_FRAMES) * 200)
                    cv2.rectangle(frame, (10, 115), (10 + bar_width, 125), (0, 255, 100), cv2.FILLED)
                    cv2.rectangle(frame, (10, 115), (210, 125), (100, 100, 100), 1)

                else:
                    # No hand visible, reset the recognizer's sequence queue
                    recognizer.reset_sequence()
                    cv2.putText(frame, "Show your hand...", (10, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 100, 255), 2)
            else:
                # Face not detected — system inactive
                recognizer.reset_sequence()
                cv2.putText(frame, "System Inactive", (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                cv2.putText(frame, "Stand in front of camera", (10, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            # ── FPS counter ──────────────────────────────────────
            curr_time = time.time()
            fps = int(1 / (curr_time - prev_time)) if (curr_time - prev_time) > 0 else 0
            prev_time = curr_time
            cv2.putText(frame, f"FPS: {fps}", (560, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            with state.lock:
                state.fps = fps

            # ── Encode frame as JPEG for browser streaming ───────
            success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if success:
                with state.lock:
                    state.latest_frame = buffer.tobytes()  # Store for /video_feed

    except Exception as e:
        print(f"[ERROR] Exception in camera thread: {e}")
    finally:
        # ── Cleanup after loop ends ──────────────────────────────
        if detector:
            try:
                detector.close()
            except:
                pass
        if cap and cap.isOpened():
            cap.release()
        print("[DONE] Camera loop ended and resources released.")


# ============================================================
# MJPEG Frame Generator
# ============================================================

def generate_frames():
    """
    A Python generator that yields JPEG frames one by one.
    Flask uses this to build the MJPEG stream.

    MJPEG (Motion JPEG) works by sending a continuous stream of
    JPEG images separated by boundary markers — like an endless
    HTTP response. The browser displays them as video.
    """
    no_feed_frame = None  # Cached "no signal" frame

    while True:
        with state.lock:
            frame_bytes = state.latest_frame
            cam_running = state.camera_running

        if frame_bytes:
            # Send the latest camera frame as JPEG
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        else:
            # Camera is off — send a black placeholder frame
            if no_feed_frame is None:
                import numpy as np
                blank = np.zeros((480, 640, 3), dtype="uint8")
                cv2.putText(blank, "Camera is OFF", (160, 230),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (80, 80, 80), 2)
                cv2.putText(blank, "Click 'Start Camera'", (145, 270),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (60, 60, 60), 1)
                _, buf = cv2.imencode(".jpg", blank)
                no_feed_frame = buf.tobytes()

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + no_feed_frame + b"\r\n")

        time.sleep(0.033)  # ~30 fps cap to avoid overloading the browser


# ============================================================
# Flask Routes
# ============================================================

@app.route("/")
def index():
    """
    Serve the Landing Page.
    """
    return render_template("landing.html")


@app.route("/dashboard")
def dashboard():
    """
    Serve the main Sign Language Translation dashboard.
    """
    return render_template("dashboard.html")


@app.route("/video_feed")
def video_feed():
    """
    The live webcam stream endpoint.

    The browser's <img src="/video_feed"> continuously reads from
    this URL. We return a special HTTP response type:
    'multipart/x-mixed-replace' — this tells the browser to keep
    replacing the image with each new frame we send.
    """
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/status")
def status():
    """
    Returns current app state as JSON.
    The browser polls this every 500ms to update the UI.

    Example response:
    {
      "camera_running": true,
      "current_gesture": "A",
      "gesture_progress": 8,
      "confirmation_frames": 15,
      "current_word": "HEL",
      "sentence": "HELLO WORLD",
      "fps": 28
    }
    """
    with state.lock:
        return jsonify({
            "camera_running":     state.camera_running,
            "current_gesture":    state.current_gesture,
            "gesture_progress":   state.gesture_frames,
            "confirmation_frames": state.CONFIRMATION_FRAMES,
            "current_word":       state.current_word,
            "sentence":           state.sentence,
            "last_added_letter":  state.last_added_letter,
            "fps":                state.fps,
        })


@app.route("/start", methods=["POST"])
def start_camera():
    """
    Start the webcam and AI pipeline in a background thread.
    Called when the user clicks the 'Start Camera' button.
    """
    with state.lock:
        if state.camera_running:
            return jsonify({"status": "already_running"})

        state.camera_running = True
        state.latest_frame   = None  # Clear any old frame

    # Create and start the background thread
    # daemon=True means this thread will auto-stop when Flask stops
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()

    with state.lock:
        state.camera_thread = t

    print("[OK] Camera thread started.")
    return jsonify({"status": "started"})


@app.route("/stop", methods=["POST"])
def stop_camera():
    """
    Stop the webcam. The camera_loop will exit cleanly
    when it sees state.camera_running = False.
    """
    with state.lock:
        state.camera_running = False
        state.latest_frame   = None
        state.current_gesture = None
        state.gesture_frames  = 0

    print("[OK] Camera stop requested.")
    return jsonify({"status": "stopped"})


@app.route("/clear", methods=["POST"])
def clear_text():
    """
    Clear the current word and sentence.
    Called when the user clicks 'Clear Text'.
    """
    with state.lock:
        state.current_word    = ""
        state.sentence        = ""
        state.current_gesture = None
        state.gesture_frames  = 0
        state.last_added_letter = ""

    return jsonify({"status": "cleared"})


@app.route("/space", methods=["POST"])
def add_space():
    """
    Finish the current word and start a new one.
    Moves current_word into sentence and resets current_word.
    """
    with state.lock:
        if state.current_word.strip():
            # Append the finished word to the sentence
            if state.sentence:
                state.sentence += " " + state.current_word
            else:
                state.sentence = state.current_word
            state.current_word = ""

    return jsonify({"status": "space_added"})


@app.route("/backspace", methods=["POST"])
def backspace():
    """
    Delete the last character from the current word.
    """
    with state.lock:
        if state.current_word:
            state.current_word = state.current_word[:-1]

    return jsonify({"status": "backspace"})


@app.route("/speak", methods=["GET", "POST"])
def speak():
    """
    Returns the full text to be spoken.
    The browser's Web Speech API will actually speak it —
    this avoids pyttsx3 threading issues inside Flask.
    """
    with state.lock:
        word     = state.current_word.strip()
        sentence = state.sentence.strip()

    # Build the full text: sentence + current word
    full_text = (sentence + " " + word).strip()

    if not full_text:
        return jsonify({"status": "empty", "text": ""})

    print(f"[SPEAK] Sending to browser TTS: '{full_text}'")
    return jsonify({"status": "ok", "text": full_text})


@app.route("/health")
def health():
    """
    Quick status/health check endpoint for verification.
    """
    return jsonify({
        "status": "healthy",
        "camera_running": state.camera_running,
        "fps": state.fps
    })


@app.errorhandler(404)
def not_found_error(error):
    return render_template("landing.html"), 404


@app.errorhandler(500)
def internal_error(error):
    return render_template("landing.html"), 500


# ============================================================
# Run the Server
# ============================================================

if __name__ == "__main__":
    print("=" * 55)
    print("  AI Sign Language Translator — Web App")
    print("  Open your browser at: http://127.0.0.1:5000")
    print("=" * 55)
    # threaded=True lets Flask handle multiple requests at once
    # (needed for the video stream + status polling simultaneously)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
