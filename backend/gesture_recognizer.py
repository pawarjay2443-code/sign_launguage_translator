# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : gesture_recognizer.py
# PURPOSE  : Recognize Indian Sign Language (ISL) static gestures
#            using MediaPipe hand landmarks.
#
# HOW IT WORKS:
#   1. If a trained ML model (.pkl) exists → use ML prediction
#   2. If no model exists → use RULE-BASED recognition
#
# WORD-LEVEL RECOGNITION (added for whole-word ISL signs):
#   - Uses a separate 30-frame sequence buffer
#   - Runs a trained RF (.pkl) or LSTM (.h5) classifier
#   - Returns (word, confidence) instead of a single letter
#   - Coexists with the letter recognizer via mode toggle
#
# RULE-BASED APPROACH (used by default for letters):
#   - Checks which fingers are UP vs DOWN
#   - Measures distances between fingertips
#   - Maps finger patterns to ISL letters
#   - Supports 15 letters: A, B, C, D, E, F, I, K, L, O, S, U, V, W, Y
#
# LANDMARK DATA FORMAT:
#   landmarks_flat = [left_hand(63 floats), right_hand(63 floats)]
#   Each hand = 21 landmarks × 3 coords (x, y, z) = 63 floats
#   Landmark 0=Wrist, 4=Thumb tip, 8=Index tip, 12=Middle tip,
#   16=Ring tip, 20=Pinky tip
#
# ============================================================

import os
import json
import math
import numpy as np

# Import FingerCounter for rule-based numeric gestures
from finger_counter import FingerCounter

# Try importing joblib (only needed if ML model is used)
try:
    import joblib
except ImportError:
    joblib = None


class GestureRecognizer:
    """
    ISL gesture recognizer with three modes:
    1. Rule-based (default) — works immediately, no training needed
    2. ML-based (optional) — uses a trained .pkl classifier for letters
    3. Word-level (optional) — uses a trained RF/LSTM for whole-word signs
    """

    def __init__(self, model_path="model/isl_classifier.pkl",
                 label_map_path="model/label_map.pkl",
                 word_model_rf_path="model/word_classifier_rf.pkl",
                 word_model_lstm_path="model/word_classifier_lstm.h5",
                 word_label_map_path="model/word_label_map.json"):
        """
        Initialize the recognizer and load trained models if available.
        """
        self.model_path = model_path
        self.label_map_path = label_map_path

        self.model = None
        self.label_map = None
        self.inverse_label_map = None

        # Instantiate FingerCounter for numeric fallback / gestures
        self.finger_counter = FingerCounter()

        # Sliding window buffer for ML-based letter recognition
        self.sequence_queue = []
        self.SEQUENCE_LENGTH = 30  # Must match training sequence length

        # ── Word-level recognition state ──
        self.word_model = None
        self.word_model_type = None           # "rf" or "lstm"
        self.word_label_map = None
        self.word_inverse_label_map = None
        self.word_sequence_queue = []          # Dedicated 30-frame buffer for words
        self.WORD_CONFIDENCE_THRESHOLD = 0.65  # Minimum confidence for word prediction

        # Try loading ML models (optional — rule-based works without them)
        self.load_model()
        self.load_word_model(word_model_rf_path, word_model_lstm_path,
                            word_label_map_path)

        # Log which mode we're using
        if self.model is not None:
            print("[OK] Using ML-based gesture recognition.")
        else:
            print("[OK] Using rule-based gesture recognition (15 ISL letters).")

    def load_model(self):
        """Load the letter-level model and label mapping from disk (if they exist)."""
        if joblib is None:
            return

        if os.path.exists(self.model_path) and os.path.exists(self.label_map_path):
            try:
                self.model = joblib.load(self.model_path)
                self.label_map = joblib.load(self.label_map_path)
                self.inverse_label_map = {v: k for k, v in self.label_map.items()}
                print(f"[OK] Loaded trained ISL model: {self.model_path}")
            except Exception as e:
                print(f"[ERROR] Failed to load trained ISL model: {e}")

    def load_word_model(self, rf_path, lstm_path, label_map_path):
        """
        Load the word-level classifier (RF or LSTM) and its label map.
        Prefers LSTM if both exist; falls back to RF.
        """
        # Load label map first (shared by both model types)
        if not os.path.exists(label_map_path):
            print("[INFO] No word-level label map found. Word recognition disabled.")
            return

        try:
            with open(label_map_path, "r") as f:
                self.word_label_map = json.load(f)
            self.word_inverse_label_map = {v: k for k, v in self.word_label_map.items()}
        except Exception as e:
            print(f"[ERROR] Failed to load word label map: {e}")
            return

        # Try loading LSTM model first (better accuracy with enough data)
        if os.path.exists(lstm_path):
            try:
                import tensorflow as tf
                self.word_model = tf.keras.models.load_model(lstm_path)
                self.word_model_type = "lstm"
                self.WORD_CONFIDENCE_THRESHOLD = 0.70  # Higher bar for LSTM
                print(f"[OK] Loaded LSTM word model: {lstm_path}")
                return
            except ImportError:
                print("[INFO] TensorFlow not available, trying RF model...")
            except Exception as e:
                print(f"[WARNING] Failed to load LSTM word model: {e}")

        # Fall back to Random Forest
        if os.path.exists(rf_path) and joblib is not None:
            try:
                self.word_model = joblib.load(rf_path)
                self.word_model_type = "rf"
                self.WORD_CONFIDENCE_THRESHOLD = 0.65
                print(f"[OK] Loaded RF word model: {rf_path}")
                return
            except Exception as e:
                print(f"[ERROR] Failed to load RF word model: {e}")

        # Neither model loaded
        self.word_label_map = None
        self.word_inverse_label_map = None
        print("[INFO] No word-level model found. Word recognition disabled.")
        print("       Train one with: python scripts/train_word_classifier.py")

    # ════════════════════════════════════════════════════════════
    # MAIN RECOGNITION METHOD
    # ════════════════════════════════════════════════════════════

    def recognize(self, landmarks_flat):
        """
        Predict the gesture from a flat landmark list.

        Parameters:
        - landmarks_flat : List of 126 floats (left hand 63 + right hand 63)

        Returns:
        - str : Predicted letter (e.g. "A", "V"), or None
        """
        # ── If ML model is loaded, use it ──
        if self.model is not None:
            return self._recognize_ml(landmarks_flat)

        # ── Otherwise, use rule-based recognition ──
        return self._recognize_rules(landmarks_flat)

    # ════════════════════════════════════════════════════════════
    # RULE-BASED RECOGNITION
    # ════════════════════════════════════════════════════════════

    def _recognize_rules(self, landmarks_flat):
        """
        Detect ISL letters using finger positions and distances.

        Supported letters: A, B, C, D, E, F, I, K, L, O, S, U, V, W, Y

        How it works:
        1. Find which hand has data (non-zero landmarks)
        2. Check which fingers are UP vs DOWN
        3. Measure distances between fingertips for ambiguous cases
        4. Return the matching letter
        """
        # ── Step 1: Find the active hand ──
        left_hand = landmarks_flat[:63]
        right_hand = landmarks_flat[63:]

        left_active = any(v != 0.0 for v in left_hand)
        right_active = any(v != 0.0 for v in right_hand)

        # ── Two-Handed Numeric Gesture Recognition (6-9, and 0) ──
        if left_active and right_active:
            left_landmarks = [[i, left_hand[i * 3], left_hand[i * 3 + 1]] for i in range(21)]
            right_landmarks = [[i, right_hand[i * 3], right_hand[i * 3 + 1]] for i in range(21)]
            left_count, _ = self.finger_counter.count_fingers(left_landmarks, "Left")
            right_count, _ = self.finger_counter.count_fingers(right_landmarks, "Right")
            total_fingers = left_count + right_count
            if 6 <= total_fingers <= 9:
                return str(total_fingers)
            elif total_fingers == 0:
                return "0"

        if right_active:
            hand = right_hand
            is_right = True
        elif left_active:
            hand = left_hand
            is_right = False
        else:
            return None  # No hand detected

        # ── Step 2: Determine finger states ──
        thumb, index, middle, ring, pinky = self._get_finger_states(hand, is_right)
        fingers_up = sum([thumb, index, middle, ring, pinky])

        # ── Step 3: Calculate useful distances ──
        # Palm size = wrist(0) to middle_mcp(9) — used as a reference
        palm_size = self._distance(hand, 0, 9)
        if palm_size < 0.01:
            return None  # Hand too small / invalid data

        # Fingertip distances (normalized by palm size for consistency)
        index_middle_dist = self._distance(hand, 8, 12) / palm_size
        thumb_index_dist = self._distance(hand, 4, 8) / palm_size
        thumb_middle_dist = self._distance(hand, 4, 12) / palm_size
        thumb_ring_dist = self._distance(hand, 4, 16) / palm_size
        thumb_pinky_dist = self._distance(hand, 4, 20) / palm_size

        # Check if fingertips are near thumb (for O, C shapes)
        all_tips_near_thumb = (thumb_index_dist < 0.4 and
                               thumb_middle_dist < 0.4 and
                               thumb_ring_dist < 0.5)

        # ── Step 4: Match finger patterns to letters ──
        # Each rule checks a unique combination of finger states
        # and distances to identify the letter.
        #
        # IMPORTANT: Order matters! More specific rules come first
        # to avoid false matches.

        # ── 0 fingers up (fist shapes) ──
        if fingers_up == 0:
            # Both S and E are closed fists
            # E: fingertips rest against palm (tips near thumb)
            # S: thumb wraps over fingers (tips NOT near thumb)
            if all_tips_near_thumb:
                return "E"
            else:
                return "S"

        # ── 1 finger up ──
        elif fingers_up == 1:
            if thumb and not index and not middle and not ring and not pinky:
                return "A"      # 👍 Thumb up only (like a thumbs-up)

            elif index and not thumb:
                return "D"      # ☝️ Index pointing up

            elif pinky and not thumb:
                return "I"      # 🤙 Pinky up only

        # ── 2 fingers up ──
        elif fingers_up == 2:
            if thumb and index and not middle and not ring and not pinky:
                return "L"      # 👆 L-shape (thumb + index at 90°)

            elif thumb and pinky and not index and not middle and not ring:
                return "Y"      # 🤙 Hang loose (thumb + pinky out)

            elif index and middle and not ring and not pinky:
                # Could be U, V, or K — check finger spread
                if index_middle_dist > 0.35:
                    # Fingers are spread apart
                    if thumb:
                        return "K"  # K: spread fingers + thumb out
                    else:
                        return "V"  # ✌️ Peace sign (fingers apart)
                else:
                    # Fingers are together
                    return "U"      # U: two fingers together

        # ── 3 fingers up ──
        elif fingers_up == 3:
            if index and middle and ring and not pinky:
                return "W"  # 🤟 Three fingers (index + middle + ring)

            elif middle and ring and pinky and not index:
                return "F"  # Middle + ring + pinky (index tip touches thumb)

        # ── 4 fingers up ──
        elif fingers_up == 4:
            if not thumb and index and middle and ring and pinky:
                return "B"      # ✋ Four fingers up, thumb folded across palm

        # ── 5 fingers up ──
        elif fingers_up == 5:
            # All fingers extended — open hand
            # Check if fingers are curved (C shape) or straight (B/5)
            # C: fingertips are between MCP and PIP level (partially curled)
            index_curl = self._get_curl_ratio(hand, 8, 6, 5)  # tip, pip, mcp
            middle_curl = self._get_curl_ratio(hand, 12, 10, 9)

            if index_curl < 0.6 and middle_curl < 0.6:
                return "C"      # Curved hand like holding a cup
            else:
                return "B"      # Flat open hand (all fingers straight)

        # ── Special checks for O (all fingertips touching thumb) ──
        # O can register as various finger counts depending on detection
        if all_tips_near_thumb and fingers_up <= 1:
            return "O"          # 👌 Circle shape — all tips touch thumb

        # ── Fallback: One-Handed Numeric Gestures (1-5) ──
        active_landmarks = [[i, hand[i * 3], hand[i * 3 + 1]] for i in range(21)]
        hand_label = "Right" if is_right else "Left"
        count, _ = self.finger_counter.count_fingers(active_landmarks, hand_label)
        if 1 <= count <= 5:
            return str(count)

        return None  # Unknown gesture

    # ════════════════════════════════════════════════════════════
    # HELPER METHODS — Finger State Detection
    # ════════════════════════════════════════════════════════════

    def _get_finger_states(self, hand_63, is_right_hand=True):
        """
        Determine which fingers are UP from 63 normalized landmarks.

        Parameters:
        - hand_63       : List of 63 floats [x0,y0,z0, x1,y1,z1, ... x20,y20,z20]
        - is_right_hand : True if right hand, False if left

        Returns:
        - Tuple of 5 booleans: (thumb, index, middle, ring, pinky)

        How it works:
        - For 4 fingers (index to pinky): compare TIP.y vs PIP.y
          If tip is ABOVE pip (smaller y), finger is UP
        - For thumb: compare TIP.x vs IP.x (thumb moves horizontally)
        """
        def lm_y(idx):
            """Get Y coordinate of landmark (0=top, 1=bottom)"""
            return hand_63[idx * 3 + 1]

        def lm_x(idx):
            """Get X coordinate of landmark (0=left, 1=right)"""
            return hand_63[idx * 3]

        # ── Thumb (horizontal comparison) ──
        thumb_tip_x = lm_x(4)    # Thumb tip
        thumb_ip_x = lm_x(3)     # Thumb IP joint (one below tip)

        if is_right_hand:
            # Right hand (mirrored): thumb extends LEFT (smaller x)
            thumb_up = thumb_tip_x < thumb_ip_x
        else:
            # Left hand: thumb extends RIGHT (larger x)
            thumb_up = thumb_tip_x > thumb_ip_x

        # ── Index, Middle, Ring, Pinky (vertical comparison) ──
        # Finger is UP if tip Y < PIP Y (tip is higher on screen)
        index_up  = lm_y(8)  < lm_y(6)    # Index: tip(8) vs PIP(6)
        middle_up = lm_y(12) < lm_y(10)   # Middle: tip(12) vs PIP(10)
        ring_up   = lm_y(16) < lm_y(14)   # Ring: tip(16) vs PIP(14)
        pinky_up  = lm_y(20) < lm_y(18)   # Pinky: tip(20) vs PIP(18)

        return thumb_up, index_up, middle_up, ring_up, pinky_up

    def _distance(self, hand_63, idx1, idx2):
        """
        Calculate 2D Euclidean distance between two landmarks.
        Uses (x, y) coordinates only (ignores z-depth).
        """
        x1 = hand_63[idx1 * 3]
        y1 = hand_63[idx1 * 3 + 1]
        x2 = hand_63[idx2 * 3]
        y2 = hand_63[idx2 * 3 + 1]
        return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

    def _get_curl_ratio(self, hand_63, tip_idx, pip_idx, mcp_idx):
        """
        Calculate how 'curled' a finger is.
        Returns a ratio from 0.0 (fully curled) to 1.0+ (fully extended).

        How it works:
        - Measures distance from tip to mcp (fingertip to knuckle)
        - Compares against pip to mcp distance (reference segment)
        - If tip is close to mcp → finger is curled (small ratio)
        - If tip is far from mcp → finger is extended (large ratio)
        """
        tip_to_mcp = self._distance(hand_63, tip_idx, mcp_idx)
        pip_to_mcp = self._distance(hand_63, pip_idx, mcp_idx)

        if pip_to_mcp < 0.001:
            return 1.0  # Avoid division by zero

        return tip_to_mcp / pip_to_mcp

    # ════════════════════════════════════════════════════════════
    # ML-BASED RECOGNITION (Optional — used when .pkl model exists)
    # ════════════════════════════════════════════════════════════

    def _recognize_ml(self, landmarks_flat):
        """
        ML-based recognition using a trained scikit-learn classifier.
        Uses a sliding window of 30 frames for sequence-based prediction.
        """
        # Append current frame's landmarks to sequence queue
        self.sequence_queue.append(landmarks_flat)

        # Maintain sliding window size
        if len(self.sequence_queue) > self.SEQUENCE_LENGTH:
            self.sequence_queue.pop(0)

        # Wait until we have enough frames
        if len(self.sequence_queue) < self.SEQUENCE_LENGTH:
            return None

        # Flatten sequence for model input
        input_data = np.array(self.sequence_queue).flatten().reshape(1, -1)

        try:
            probs = self.model.predict_proba(input_data)[0]
            max_idx = np.argmax(probs)
            max_prob = probs[max_idx]

            if max_prob > 0.80:
                return self.inverse_label_map.get(max_idx, None)
        except AttributeError:
            try:
                pred = self.model.predict(input_data)[0]
                return self.inverse_label_map.get(pred, None)
            except Exception as ex:
                print(f"[ERROR] ML prediction failed: {ex}")
        except Exception as e:
            print(f"[ERROR] ML prediction failed: {e}")

        return None

    # ════════════════════════════════════════════════════════════
    # WORD-LEVEL SEQUENCE RECOGNITION
    # ════════════════════════════════════════════════════════════

    def recognize_word_sequence(self, landmarks_flat):
        """
        Predict a whole-word ISL sign from a 30-frame sliding window
        of hand landmark sequences.

        Parameters:
        - landmarks_flat : List of 126 floats (current frame's landmarks)

        Returns:
        - Tuple (predicted_word, confidence) or (None, 0.0)
        """
        if self.word_model is None:
            return None, 0.0

        # Append current frame to the word sequence buffer
        self.word_sequence_queue.append(landmarks_flat)

        # Maintain sliding window size
        if len(self.word_sequence_queue) > self.SEQUENCE_LENGTH:
            self.word_sequence_queue.pop(0)

        # Wait until we have enough frames
        if len(self.word_sequence_queue) < self.SEQUENCE_LENGTH:
            return None, 0.0

        # Build input array
        sequence_array = np.array(self.word_sequence_queue, dtype=np.float32)

        try:
            if self.word_model_type == "lstm":
                return self._predict_word_lstm(sequence_array)
            elif self.word_model_type == "rf":
                return self._predict_word_rf(sequence_array)
        except Exception as e:
            print(f"[ERROR] Word prediction failed: {e}")

        return None, 0.0

    def _predict_word_rf(self, sequence_array):
        """
        Run word prediction using the Random Forest model.
        Flattens the (30, 126) sequence to (1, 3780) for prediction.
        """
        flat_input = sequence_array.flatten().reshape(1, -1)

        try:
            probs = self.word_model.predict_proba(flat_input)[0]
            max_idx = np.argmax(probs)
            confidence = float(probs[max_idx])

            if confidence >= self.WORD_CONFIDENCE_THRESHOLD:
                word = self.word_inverse_label_map.get(max_idx, None)
                return word, confidence
        except AttributeError:
            # Model doesn't support predict_proba — use predict
            pred = self.word_model.predict(flat_input)[0]
            word = self.word_inverse_label_map.get(pred, None)
            return word, 1.0 if word else 0.0

        return None, 0.0

    def _predict_word_lstm(self, sequence_array):
        """
        Run word prediction using the LSTM model.
        Input shape: (1, 30, 126).
        """
        input_data = sequence_array.reshape(1, self.SEQUENCE_LENGTH, -1)
        probs = self.word_model.predict(input_data, verbose=0)[0]
        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])

        if confidence >= self.WORD_CONFIDENCE_THRESHOLD:
            word = self.word_inverse_label_map.get(max_idx, None)
            return word, confidence

        return None, 0.0

    def is_word_model_loaded(self):
        """Returns True if a word-level model is loaded and ready."""
        return self.word_model is not None

    # ════════════════════════════════════════════════════════════
    # UTILITY
    # ════════════════════════════════════════════════════════════

    def reset_sequence(self):
        """Clear the letter-level sequence buffer (e.g., when no hands are detected)."""
        self.sequence_queue.clear()

    def reset_word_sequence(self):
        """Clear the word-level sequence buffer."""
        self.word_sequence_queue.clear()