# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : finger_counter.py
# PURPOSE  : Count how many fingers are up using landmark positions
# ============================================================

# ---- HOW FINGER COUNTING WORKS ----
#
# MediaPipe gives us 21 points on the hand. Each finger has:
#   - TIP     : the very top of the finger
#   - PIP     : the middle joint of the finger
#   - MCP     : the bottom joint (where finger meets palm)
#
# On a screen, Y=0 is at the TOP, Y increases going DOWN.
#
# So if fingertip Y < pip Y  →  tip is ABOVE pip  →  finger is UP
# If fingertip Y > pip Y     →  tip is BELOW pip  →  finger is DOWN (curled)
#
# Thumb is special: it moves LEFT and RIGHT, so we compare X values.
#
#   Landmark IDs:
#   Thumb  → tip=4,  ip=3,   mcp=2
#   Index  → tip=8,  pip=6
#   Middle → tip=12, pip=10
#   Ring   → tip=16, pip=14
#   Pinky  → tip=20, pip=18
#
#        4       8    12   16   20    ← TIPS (fingertips)
#        |       |     |    |    |
#        3       7    11   15   19
#        |       |     |    |    |
#        2       6    10   14   18   ← PIPs (middle joints)
#        |       |     |    |    |
#        1       5     9   13   17
#         \      |     |    |   /
#                     0              ← WRIST
#

# Fingertip landmark IDs (in order: Thumb, Index, Middle, Ring, Pinky)
FINGERTIP_IDS = [4, 8, 12, 16, 20]

# PIP (middle joint) landmark IDs for Index, Middle, Ring, Pinky
# (Thumb uses a different comparison)
PIP_IDS = [6, 10, 14, 18]


class FingerCounter:
    """
    Counts how many fingers are raised (UP) for a detected hand.
    Works with the landmark positions from HandDetector.
    """

    def count_fingers(self, landmarks, hand_label="Right"):
        """
        Count the number of fingers that are UP.

        Parameters:
        - landmarks   : List of [id, x, y] from HandDetector.get_landmark_positions()
        - hand_label  : "Right" or "Left" hand (thumb direction differs)

        Returns:
        - count       : Number of fingers up (0 to 5)
        - fingers     : List of 5 booleans [thumb, index, middle, ring, pinky]
                        True = finger UP, False = finger DOWN
        """

        # If no landmarks given, return zero fingers
        if not landmarks or len(landmarks) < 21:
            return 0, [False, False, False, False, False]

        fingers = []

        # ---- THUMB ----
        # Thumb moves horizontally, so we compare X values.
        # For a RIGHT hand (mirrored camera):
        #   If tip X < mcp X  →  thumb is pointing LEFT  →  thumb UP (open)
        # For a LEFT hand:
        #   If tip X > mcp X  →  thumb is pointing RIGHT →  thumb UP (open)
        tip_x   = landmarks[4][1]   # Thumb tip X
        mcp_x   = landmarks[2][1]   # Thumb base X

        if hand_label == "Right":
            thumb_up = tip_x < mcp_x   # Thumb tip is to the LEFT of base
        else:
            thumb_up = tip_x > mcp_x   # Thumb tip is to the RIGHT of base

        fingers.append(thumb_up)

        # ---- INDEX, MIDDLE, RING, PINKY ----
        # For each of these 4 fingers, compare TIP Y vs PIP Y.
        # If tip Y < pip Y  →  finger is pointing UP
        for tip_id, pip_id in zip(FINGERTIP_IDS[1:], PIP_IDS):
            tip_y = landmarks[tip_id][2]   # Y position of fingertip
            pip_y = landmarks[pip_id][2]   # Y position of middle joint

            # Finger is UP if tip is above (smaller Y) than middle joint
            finger_up = tip_y < pip_y
            fingers.append(finger_up)

        # Count how many True values are in fingers list
        count = fingers.count(True)

        return count, fingers

    def get_finger_names(self, fingers):
        """
        Given a list of booleans [thumb, index, middle, ring, pinky],
        return the names of fingers that are UP.

        Example: [True, False, True, False, False] → ["Thumb", "Middle"]
        """
        names = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
        up_fingers = [names[i] for i in range(5) if fingers[i]]
        return up_fingers
