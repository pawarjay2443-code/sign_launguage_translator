# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# STEP     : 2 - Real-Time Hand & Finger Detection
# PURPOSE  : Detect hand, draw 21 landmarks, show FPS
# ============================================================

# Suppress noisy TensorFlow and MediaPipe warning messages in terminal
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"       # Hide TensorFlow info/warnings
os.environ["GLOG_minloglevel"] = "3"            # Hide MediaPipe internal logs
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"       # Use CPU only (more stable)

import cv2
import time
from hand_detector import HandDetector


def run():
    # --- Open Camera ---
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[ERROR] Camera not found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print("[OK] Camera opened. Press Q to quit.")

    # --- Load Hand Detector ---
    # This loads our HandDetector class from hand_detector.py
    # max_hands=1 means we only track one hand for now
    detector = HandDetector(model_path="model/hand_landmarker.task", max_hands=2)

    # Variables to calculate FPS (Frames Per Second)
    prev_time = 0  # Time of previous frame

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Cannot read frame.")
            break

        # Mirror the frame (selfie-style)
        frame = cv2.flip(frame, 1)

        # --- DETECT HANDS ---
        # find_hands() processes the frame and draws the skeleton
        frame, results = detector.find_hands(frame, draw=True)

        # --- SHOW STATUS TEXT ---
        if detector.is_hand_detected():
            # Count how many hands are detected
            num_hands = len(detector.results.hand_landmarks)
            label = "Hand" if num_hands == 1 else "Both Hands"
            cv2.putText(frame, f"{label} Detected! ({num_hands})", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            # Loop through each detected hand and show its wrist position
            for i in range(num_hands):
                landmarks = detector.get_landmark_positions(frame, hand_index=i)
                if landmarks:
                    wrist = landmarks[0]  # Landmark 0 = wrist
                    y_pos = 85 + i * 30   # Stack text: Hand 1 at y=85, Hand 2 at y=115
                    pos_text = f"Hand {i+1} Wrist: ({wrist[1]}, {wrist[2]})"
                    cv2.putText(frame, pos_text, (10, y_pos),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 255, 0), 2)
        else:
            cv2.putText(frame, "Show your hand(s)...", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 100, 255), 2)

        # --- CALCULATE & SHOW FPS ---
        # FPS = how many frames are processed per second
        # Higher FPS = smoother video (30+ is good)
        curr_time = time.time()
        fps = int(1 / (curr_time - prev_time)) if (curr_time - prev_time) > 0 else 0
        prev_time = curr_time

        cv2.putText(frame, f"FPS: {fps}", (540, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        # Quit instructions
        cv2.putText(frame, "Press Q to Quit", (10, frame.shape[0] - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 255), 2)

        # --- SHOW FRAME ---
        cv2.imshow("Sign Language Translator - Hand Detection", frame)

        if cv2.waitKey(1) & 0xFF in [ord('q'), ord('Q')]:
            print("Closing...")
            break

    # Cleanup
    detector.close()
    cap.release()
    cv2.destroyAllWindows()
    print("[DONE] Camera closed.")


if __name__ == "__main__":
    run()