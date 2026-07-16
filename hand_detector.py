# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : hand_detector.py
# PURPOSE  : Detect hands + draw 21 landmarks using MediaPipe 0.10+
# ============================================================

import cv2                        # OpenCV for drawing on frames
import mediapipe as mp            # MediaPipe AI library
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# ---- HAND CONNECTIONS ----
# MediaPipe detects 21 points (landmarks) on each hand.
# These are the pairs that should be connected with lines (like bones).
#
#   4  8  12  16  20   <- Fingertips
#   |  |   |   |   |
#   3  7  11  15  19
#   |  |   |   |   |
#   2  6  10  14  18
#   |  |   |   |   |
#   1  5   9  13  17
#    \ |   |   |  /
#          0           <- Wrist
#
HAND_CONNECTIONS = [
    # Thumb (landmark 0 to 4)
    (0, 1), (1, 2), (2, 3), (3, 4),
    # Index finger (5 to 8)
    (0, 5), (5, 6), (6, 7), (7, 8),
    # Middle finger (9 to 12)
    (0, 9), (9, 10), (10, 11), (11, 12),
    # Ring finger (13 to 16)
    (0, 13), (13, 14), (14, 15), (15, 16),
    # Pinky finger (17 to 20)
    (0, 17), (17, 18), (18, 19), (19, 20),
    # Palm connections (across the bottom of the hand)
    (5, 9), (9, 13), (13, 17),
]

# Colors for drawing (in BGR format — OpenCV uses BGR, not RGB)
COLOR_DOT        = (0, 255, 0)      # Green dots for landmarks
COLOR_LINE       = (255, 255, 255)  # White lines for connections
COLOR_FINGERTIP  = (0, 0, 255)      # Red dots for fingertips (4,8,12,16,20)
COLOR_WRIST      = (255, 100, 0)    # Blue dot for wrist (0)

# Landmark IDs of fingertips
FINGERTIPS = [4, 8, 12, 16, 20]


class HandDetector:
    """
    Detects hand landmarks in real time using MediaPipe Tasks API (v0.10+).
    Works with webcam frames from OpenCV.
    """

    def __init__(self, model_path="model/hand_landmarker.task", max_hands=1):
        """
        Set up the hand landmark detector.

        Parameters:
        - model_path : Path to the downloaded .task model file
        - max_hands  : Maximum number of hands to track at once
        """

        # BaseOptions tells MediaPipe where the AI model file is on disk
        base_options = mp_python.BaseOptions(model_asset_path=model_path)

        # HandLandmarkerOptions = all settings for the hand detector
        # RunningMode.VIDEO = best for live webcam (processes frame by frame with timestamps)
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=max_hands,
            min_hand_detection_confidence=0.5,  # 50% sure = detect as hand
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            running_mode=mp_vision.RunningMode.VIDEO  # Frame-by-frame webcam mode
        )

        # Create the actual detector object from our options
        self.detector = mp_vision.HandLandmarker.create_from_options(options)

        # We store the latest results so other methods can use them
        self.results = None

        # Timestamp counter: MediaPipe VIDEO mode needs increasing timestamps
        self.timestamp_ms = 0

        print("[OK] Hand detector loaded successfully.")

    def find_hands(self, frame, draw=True):
        """
        Detect hands in a video frame and optionally draw landmarks.

        Parameters:
        - frame : One BGR image from OpenCV webcam
        - draw  : True = draw the skeleton on the frame

        Returns:
        - frame   : Frame with hand skeleton drawn (if draw=True)
        - results : Raw MediaPipe detection results
        """

        # Step 1: Convert frame from BGR (OpenCV) → RGB (MediaPipe needs RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Step 2: Wrap the RGB frame in a MediaPipe Image object
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Step 3: Increase timestamp by 1ms each frame (required for VIDEO mode)
        self.timestamp_ms += 1

        # Step 4: Run the AI hand detection on this frame
        self.results = self.detector.detect_for_video(mp_image, self.timestamp_ms)

        # Step 5: If hands found and draw=True, draw landmarks on the frame
        if draw and self.results.hand_landmarks:
            for hand_landmarks in self.results.hand_landmarks:
                self._draw_landmarks(frame, hand_landmarks)

        return frame, self.results

    def _draw_landmarks(self, frame, hand_landmarks):
        """
        Draw dots and lines on the hand skeleton.
        This is a private method (starts with _) — only used inside this class.

        Parameters:
        - frame          : The frame to draw on
        - hand_landmarks : List of 21 landmark objects from MediaPipe
        """

        height, width, _ = frame.shape  # Get the frame size in pixels
        points = []                      # Store pixel positions of all 21 landmarks

        # --- Draw Dots on each landmark ---
        for i, landmark in enumerate(hand_landmarks):

            # MediaPipe gives positions as fractions (0.0 to 1.0)
            # Multiply by width/height to get actual pixel positions
            x = int(landmark.x * width)
            y = int(landmark.y * height)
            points.append((x, y))  # Save position for drawing lines later

            # Choose dot color: red for fingertips, blue for wrist, green for rest
            if i == 0:
                color = COLOR_WRIST        # Wrist = blue
            elif i in FINGERTIPS:
                color = COLOR_FINGERTIP    # Fingertips = red
            else:
                color = COLOR_DOT          # Other joints = green

            # Draw a filled circle at this landmark position
            cv2.circle(frame, (x, y), 6, color, cv2.FILLED)

            # Draw the landmark ID number next to each dot (small text)
            cv2.putText(frame, str(i), (x + 8, y + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 0), 1)

        # --- Draw Lines (connections between landmarks) ---
        for start_id, end_id in HAND_CONNECTIONS:
            # Draw a white line from one landmark to the connected landmark
            cv2.line(frame, points[start_id], points[end_id], COLOR_LINE, 2)

    def is_hand_detected(self):
        """Returns True if at least one hand is visible, else False."""
        return bool(self.results and self.results.hand_landmarks)

    def get_landmark_positions(self, frame, hand_index=0):
        """
        Get the (x, y) pixel positions of all 21 landmarks for one hand.

        Returns a list like: [[0, x, y], [1, x, y], ..., [20, x, y]]
        where the first number is the landmark ID.
        """
        landmark_list = []

        if self.results and self.results.hand_landmarks:
            if hand_index < len(self.results.hand_landmarks):
                hand = self.results.hand_landmarks[hand_index]
                height, width, _ = frame.shape

                for i, landmark in enumerate(hand):
                    x = int(landmark.x * width)
                    y = int(landmark.y * height)
                    landmark_list.append([i, x, y])

        return landmark_list

    def close(self):
        """Release the detector when done (good practice to free memory)."""
        self.detector.close()
