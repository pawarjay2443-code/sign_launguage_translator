# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# STEP     : 3 - Finger Counting
# PURPOSE  : Detect hand + count how many fingers are raised
# ============================================================

# Suppress noisy TensorFlow and MediaPipe warning messages in terminal
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"

import cv2
import time
from hand_detector import HandDetector
from finger_counter import FingerCounter


def draw_finger_status(frame, fingers, start_y=160):
    """
    Draw a visual indicator for each finger (UP = green, DOWN = red).
    Shows 5 colored boxes with finger names.
    """
    names  = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
    colors = {
        True:  (0, 220, 0),    # Green = finger UP
        False: (0, 0, 200),    # Red   = finger DOWN
    }

    for i, (name, is_up) in enumerate(zip(names, fingers)):
        x = 10 + i * 118         # Space the 5 boxes horizontally
        color = colors[is_up]
        label = "UP" if is_up else "DOWN"

        # Draw colored filled rectangle
        cv2.rectangle(frame, (x, start_y), (x + 108, start_y + 50), color, cv2.FILLED)
        # Draw finger name
        cv2.putText(frame, name, (x + 5, start_y + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        # Draw UP / DOWN label
        cv2.putText(frame, label, (x + 25, start_y + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)


def run():
    # --- Camera ---
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[ERROR] Camera not found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print("[OK] Camera opened. Press Q to quit.")

    # --- Load modules ---
    detector = HandDetector(model_path="model/hand_landmarker.task", max_hands=2)
    counter  = FingerCounter()

    prev_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)

        # --- Detect hands ---
        frame, results = detector.find_hands(frame, draw=True)

        total_fingers = 0

        if detector.is_hand_detected():
            num_hands = len(results.hand_landmarks)

            for i in range(num_hands):
                landmarks = detector.get_landmark_positions(frame, hand_index=i)

                # Get which hand it is (Left or Right)
                # MediaPipe provides handedness but we use a simple positional check
                hand_label = results.handedness[i][0].display_name  # "Left" or "Right"

                # Count fingers for this hand
                count, fingers = counter.count_fingers(landmarks, hand_label)
                total_fingers += count

                # Show finger count for this hand above its wrist
                wrist = landmarks[0]
                cv2.putText(frame, f"Hand {i+1}: {count} fingers",
                            (wrist[1] - 30, wrist[2] - 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            # Draw the UP/DOWN status boxes for the FIRST hand
            first_landmarks = detector.get_landmark_positions(frame, hand_index=0)
            first_label     = results.handedness[0][0].display_name
            _, first_fingers = counter.count_fingers(first_landmarks, first_label)
            draw_finger_status(frame, first_fingers)

            # Big finger count display
            cv2.putText(frame, f"Total Fingers: {total_fingers}", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        else:
            cv2.putText(frame, "Show your hand(s)...", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 100, 255), 2)

        # --- FPS ---
        curr_time = time.time()
        fps = int(1 / (curr_time - prev_time)) if (curr_time - prev_time) > 0 else 0
        prev_time = curr_time
        cv2.putText(frame, f"FPS: {fps}", (540, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        cv2.putText(frame, "Press Q to Quit", (10, frame.shape[0] - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 255), 2)

        cv2.imshow("Sign Language Translator - Finger Counter", frame)

        if cv2.waitKey(1) & 0xFF in [ord('q'), ord('Q')]:
            print("Closing...")
            break

    detector.close()
    cap.release()
    cv2.destroyAllWindows()
    print("[DONE] Camera closed.")


if __name__ == "__main__":
    run()