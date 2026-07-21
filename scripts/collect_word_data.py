# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : scripts/collect_word_data.py
# PURPOSE  : Record 30-frame hand landmark sequences for
#            whole-word ISL sign recognition training.
#
# HOW TO USE:
#   1. Run:  python scripts/collect_word_data.py
#   2. The webcam opens with live hand tracking.
#   3. Press a number key (shown on screen) to select a word.
#   4. Press 'R' to start recording — a 3-second countdown
#      plays, then 30 frames of landmarks are captured.
#   5. Repeat for multiple takes per word.
#   6. Press 'Q' to quit and save summary.
#
# DATA FORMAT:
#   Each sample is saved as a .npy file containing a
#   (30, 126) numpy array — 30 frames × 126 landmark floats
#   (63 per hand × 2 hands).
#
# ============================================================

import os
import sys
import time
import cv2
import numpy as np

# Add project root to path so we can import our modules
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from hand_detector import HandDetector

# ════════════════════════════════════════════════════════════
# TARGET VOCABULARY — 20 Common ISL Word Signs
# ════════════════════════════════════════════════════════════

WORD_VOCABULARY = [
    "Hello", "Thank You", "Please", "Sorry", "Yes",
    "No", "Help", "Water", "Food", "Stop",
    "Wait", "Good", "Bad", "Name", "Friend",
    "Family", "Doctor", "Emergency", "Love", "Understand",
]

# ════════════════════════════════════════════════════════════
# CONFIGURATION
# ════════════════════════════════════════════════════════════

SEQUENCE_LENGTH = 30          # Frames per recording
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "word_sequences")
COUNTDOWN_SECONDS = 3         # Countdown before recording starts


def get_sample_counts():
    """Count how many samples exist per word in the data directory."""
    counts = {}
    for word in WORD_VOCABULARY:
        word_dir = os.path.join(DATA_DIR, word.lower().replace(" ", "_"))
        if os.path.isdir(word_dir):
            npy_files = [f for f in os.listdir(word_dir) if f.endswith(".npy")]
            counts[word] = len(npy_files)
        else:
            counts[word] = 0
    return counts


def save_sequence(word_label, sequence):
    """
    Save a recorded sequence to disk as a .npy file.

    Parameters:
    - word_label : str — the word being signed
    - sequence   : list of 30 landmark frames (each 126 floats)
    """
    word_dir = os.path.join(DATA_DIR, word_label.lower().replace(" ", "_"))
    os.makedirs(word_dir, exist_ok=True)

    # Create a unique filename using timestamp
    timestamp = int(time.time() * 1000)
    filename = f"sample_{timestamp}.npy"
    filepath = os.path.join(word_dir, filename)

    # Convert to numpy array: shape (30, 126)
    arr = np.array(sequence, dtype=np.float32)
    np.save(filepath, arr)

    return filepath


def draw_word_menu(frame, selected_word, page, counts):
    """Draw the word selection menu on the frame."""
    h, w = frame.shape[:2]

    # Semi-transparent overlay for the menu area
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (w - 10, 55), (0, 0, 0), cv2.FILLED)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Title
    cv2.putText(frame, "WORD DATA COLLECTOR", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)

    # Page indicator
    words_per_page = 10
    total_pages = (len(WORD_VOCABULARY) + words_per_page - 1) // words_per_page
    page_text = f"Page {page + 1}/{total_pages} | [N]ext [P]rev page"
    cv2.putText(frame, page_text, (w - 350, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    # Word list for current page
    start_idx = page * words_per_page
    end_idx = min(start_idx + words_per_page, len(WORD_VOCABULARY))
    page_words = WORD_VOCABULARY[start_idx:end_idx]

    # Draw word buttons
    y_start = 70
    for i, word in enumerate(page_words):
        key_num = i  # 0-9 keys
        count = counts.get(word, 0)
        is_selected = (word == selected_word)

        # Background for selected word
        y_pos = y_start + i * 30
        if is_selected:
            cv2.rectangle(frame, (10, y_pos - 15), (350, y_pos + 10),
                          (0, 140, 255), cv2.FILLED)
            text_color = (255, 255, 255)
        else:
            text_color = (200, 200, 200)

        # Count indicator color (green if enough, yellow if some, red if none)
        if count >= 30:
            count_color = (0, 255, 0)    # Green — good amount
        elif count >= 10:
            count_color = (0, 255, 255)  # Yellow — some data
        else:
            count_color = (0, 100, 255)  # Orange — needs more

        label = f"[{key_num}] {word}"
        cv2.putText(frame, label, (20, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, text_color, 1)
        cv2.putText(frame, f"({count} samples)", (260, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, count_color, 1)

    # Instructions at the bottom
    instructions = [
        "[0-9] Select word | [R] Record | [Q] Quit",
        f"Selected: {selected_word or 'None'} | Seq length: {SEQUENCE_LENGTH} frames",
    ]
    for i, text in enumerate(instructions):
        cv2.putText(frame, text, (20, h - 40 + i * 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)


def draw_recording_state(frame, state, countdown_val=0, frames_captured=0):
    """Draw recording status overlay on the frame."""
    h, w = frame.shape[:2]

    if state == "countdown":
        # Large countdown number in the center
        cv2.rectangle(frame, (w // 2 - 80, h // 2 - 60),
                      (w // 2 + 80, h // 2 + 60), (0, 0, 200), cv2.FILLED)
        cv2.putText(frame, str(countdown_val), (w // 2 - 25, h // 2 + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 3.0, (255, 255, 255), 4)
        cv2.putText(frame, "GET READY!", (w // 2 - 80, h // 2 - 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

    elif state == "recording":
        # Recording indicator — red dot + frame counter
        cv2.circle(frame, (30, h - 30), 10, (0, 0, 255), cv2.FILLED)
        progress = f"REC: {frames_captured}/{SEQUENCE_LENGTH}"
        cv2.putText(frame, progress, (50, h - 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Progress bar
        bar_w = int((frames_captured / SEQUENCE_LENGTH) * (w - 40))
        cv2.rectangle(frame, (20, h - 10), (20 + bar_w, h - 2),
                      (0, 255, 0), cv2.FILLED)
        cv2.rectangle(frame, (20, h - 10), (w - 20, h - 2),
                      (100, 100, 100), 1)

    elif state == "saved":
        cv2.rectangle(frame, (w // 2 - 120, h // 2 - 25),
                      (w // 2 + 120, h // 2 + 25), (0, 180, 0), cv2.FILLED)
        cv2.putText(frame, "SAVED!", (w // 2 - 50, h // 2 + 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)


def main():
    """Main data collection loop."""
    print("=" * 55)
    print("  SignAI — Word Sign Data Collector")
    print("=" * 55)
    print(f"  Vocabulary: {len(WORD_VOCABULARY)} words")
    print(f"  Sequence length: {SEQUENCE_LENGTH} frames")
    print(f"  Data directory: {DATA_DIR}")
    print("=" * 55)

    # ── Open webcam ──
    import platform
    if platform.system() == "Windows":
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print("[ERROR] Could not open camera.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print("[OK] Camera opened.")

    # ── Load hand detector ──
    detector = HandDetector(
        model_path=os.path.join(PROJECT_ROOT, "model", "hand_landmarker.task"),
        max_hands=2
    )
    print("[OK] Hand detector loaded.")

    # ── State variables ──
    selected_word = None
    menu_page = 0
    recording_state = "idle"     # idle, countdown, recording, saved
    countdown_start = 0
    sequence_buffer = []
    saved_flash_start = 0

    counts = get_sample_counts()
    print("\n[INFO] Current sample counts:")
    for word in WORD_VOCABULARY:
        c = counts.get(word, 0)
        print(f"  {word:15s}: {c} samples")

    print("\n[READY] Press number keys to select a word, 'R' to record, 'Q' to quit.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)

        # Run hand detection
        frame, results = detector.find_hands(frame, draw=True)

        # ── Handle recording states ──
        if recording_state == "countdown":
            elapsed = time.time() - countdown_start
            remaining = COUNTDOWN_SECONDS - int(elapsed)

            if remaining > 0:
                draw_recording_state(frame, "countdown", remaining)
            else:
                # Countdown finished — start recording
                recording_state = "recording"
                sequence_buffer = []

        elif recording_state == "recording":
            # Capture landmarks for this frame
            landmarks = detector.get_normalized_landmarks()
            sequence_buffer.append(landmarks)

            draw_recording_state(frame, "recording",
                                 frames_captured=len(sequence_buffer))

            if len(sequence_buffer) >= SEQUENCE_LENGTH:
                # Recording complete — save
                filepath = save_sequence(selected_word, sequence_buffer)
                counts = get_sample_counts()
                print(f"[SAVED] {selected_word} → {filepath} "
                      f"(total: {counts.get(selected_word, 0)} samples)")
                recording_state = "saved"
                saved_flash_start = time.time()

        elif recording_state == "saved":
            draw_recording_state(frame, "saved")
            if time.time() - saved_flash_start > 1.0:
                recording_state = "idle"

        else:
            # Idle — show the word selection menu
            draw_word_menu(frame, selected_word, menu_page, counts)

        # ── Display the frame ──
        cv2.imshow("SignAI — Word Data Collector", frame)

        # ── Handle key presses ──
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q') or key == ord('Q'):
            break

        # Number keys 0-9 for word selection
        if recording_state == "idle":
            words_per_page = 10
            if ord('0') <= key <= ord('9'):
                idx = (key - ord('0')) + menu_page * words_per_page
                if idx < len(WORD_VOCABULARY):
                    selected_word = WORD_VOCABULARY[idx]
                    print(f"[SELECT] Word: {selected_word}")

            # Page navigation
            if key == ord('n') or key == ord('N'):
                total_pages = (len(WORD_VOCABULARY) + words_per_page - 1) // words_per_page
                menu_page = (menu_page + 1) % total_pages

            if key == ord('p') or key == ord('P'):
                total_pages = (len(WORD_VOCABULARY) + words_per_page - 1) // words_per_page
                menu_page = (menu_page - 1) % total_pages

            # Start recording
            if key == ord('r') or key == ord('R'):
                if selected_word is None:
                    print("[WARNING] Select a word first (press 0-9).")
                else:
                    print(f"[REC] Starting countdown for: {selected_word}")
                    recording_state = "countdown"
                    countdown_start = time.time()

    # ── Cleanup ──
    detector.close()
    cap.release()
    cv2.destroyAllWindows()

    # Print final summary
    counts = get_sample_counts()
    print("\n" + "=" * 55)
    print("  FINAL SAMPLE COUNTS")
    print("=" * 55)
    total = 0
    for word in WORD_VOCABULARY:
        c = counts.get(word, 0)
        total += c
        status = "✓" if c >= 20 else "⚠" if c >= 5 else "✗"
        print(f"  {status} {word:15s}: {c} samples")
    print(f"\n  Total samples: {total}")
    print("=" * 55)


if __name__ == "__main__":
    main()
