# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : gesture_recognizer.py
# PURPOSE  : Map hand landmark positions to ASL letters (A-Z)
# ============================================================

import math


class GestureRecognizer:
    """
    Rule-based gesture recognizer for static ASL alphabet letters.
    Uses finger states and landmark geometry to identify letters.
    
    Dynamic letters (J, Z) require motion tracking and are not supported here.
    """

    def _get_distance(self, p1, p2):
        """Calculate Euclidean distance between two landmarks [id, x, y]."""
        return math.sqrt((p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)

    def _is_finger_bent(self, tip, pip, mcp):
        """
        Check if a finger is BENT (hooked/curled but not fully down).
        Bent = tip Y is between pip Y and mcp Y (partially curled).
        """
        return pip[2] < tip[2] < mcp[2] or mcp[2] < tip[2] < pip[2]

    def recognize(self, landmarks, fingers, hand_label="Right"):
        """
        Identify the ASL letter from landmarks and finger states.

        Parameters:
        - landmarks  : List of [id, x, y] from HandDetector (21 points)
        - fingers    : [thumb, index, middle, ring, pinky] — True if finger is UP
        - hand_label : "Right" or "Left"

        Returns:
        - str : A–Z letter, or None if no confident match
        """
        if not landmarks or len(landmarks) < 21:
            return None

        # ── Unpack finger booleans ──────────────────────────────────────────
        thumb_up, index_up, middle_up, ring_up, pinky_up = fingers
        fingers_up_count = sum([index_up, middle_up, ring_up, pinky_up])
        all_fingers_down = fingers_up_count == 0

        # ── Key landmarks ───────────────────────────────────────────────────
        wrist        = landmarks[0]

        thumb_mcp    = landmarks[2]
        thumb_ip     = landmarks[3]
        thumb_tip    = landmarks[4]

        index_mcp    = landmarks[5]
        index_pip    = landmarks[6]
        index_dip    = landmarks[7]
        index_tip    = landmarks[8]

        middle_mcp   = landmarks[9]
        middle_pip   = landmarks[10]
        middle_tip   = landmarks[12]

        ring_mcp     = landmarks[13]
        ring_pip     = landmarks[14]
        ring_tip     = landmarks[16]

        pinky_mcp    = landmarks[17]
        pinky_pip    = landmarks[18]
        pinky_tip    = landmarks[20]

        # ── Useful distances ────────────────────────────────────────────────
        thumb_index_dist  = self._get_distance(thumb_tip, index_tip)
        thumb_middle_dist = self._get_distance(thumb_tip, middle_tip)
        thumb_ring_dist   = self._get_distance(thumb_tip, ring_tip)
        index_middle_dist = self._get_distance(index_tip, middle_tip)

        # ────────────────────────────────────────────────────────────────────
        # LETTER RULES — ordered from most specific to least specific
        # ────────────────────────────────────────────────────────────────────

        # ── B: All 4 fingers up, thumb tucked ───────────────────────────────
        if fingers_up_count == 4 and not thumb_up:
            return "B"

        # ── W: Index + Middle + Ring up, pinky down ─────────────────────────
        if index_up and middle_up and ring_up and not pinky_up and not thumb_up:
            return "W"

        # ── K: Index + Middle up, Thumb up, ring + pinky down ───────────────
        if index_up and middle_up and not ring_up and not pinky_up and thumb_up:
            return "K"

        # ── R: Index + Middle up & CROSSED (index tip past middle tip) ──────
        if index_up and middle_up and not ring_up and not pinky_up and not thumb_up:
            # R: index and middle are crossed — index tip X is inside middle tip X
            if hand_label == "Right":
                crossed = index_tip[1] > middle_tip[1]  # index is to the right of middle
            else:
                crossed = index_tip[1] < middle_tip[1]
            if crossed and index_middle_dist < 25:
                return "R"

        # ── U: Index + Middle up, close together ────────────────────────────
        if index_up and middle_up and not ring_up and not pinky_up and not thumb_up:
            if index_middle_dist < 30:
                return "U"

        # ── V: Index + Middle up, spread apart ──────────────────────────────
        if index_up and middle_up and not ring_up and not pinky_up and not thumb_up:
            if index_middle_dist >= 30:
                return "V"

        # ── Y: Thumb + Pinky up, others down ────────────────────────────────
        if thumb_up and pinky_up and not index_up and not middle_up and not ring_up:
            return "Y"

        # ── L: Index + Thumb up (L-shape) ───────────────────────────────────
        if index_up and thumb_up and not middle_up and not ring_up and not pinky_up:
            return "L"

        # ── I: Pinky up only ────────────────────────────────────────────────
        if pinky_up and not index_up and not middle_up and not ring_up:
            return "I"

        # ── D: Index up, thumb touches middle ───────────────────────────────
        if index_up and not middle_up and not ring_up and not pinky_up and not thumb_up:
            if thumb_middle_dist < 40:
                return "D"

        # ── X: Index hooked (bent), others down ─────────────────────────────
        if not index_up and not middle_up and not ring_up and not pinky_up:
            # Index is bent: tip is below pip but above mcp
            index_bent = middle_mcp[2] > index_tip[2] > index_pip[2] or \
                         index_pip[2] > index_tip[2] > index_mcp[2]
            if index_bent and not thumb_up:
                return "X"

        # ── G: Index pointing horizontally, thumb out (not raised vertically) ─
        # Index tip is at roughly the same Y as its MCP (pointing sideways)
        if not middle_up and not ring_up and not pinky_up:
            index_horizontal = abs(index_tip[2] - index_mcp[2]) < abs(index_tip[1] - index_mcp[1])
            if index_horizontal and not index_up:
                return "G"

        # ── H: Index + Middle pointing horizontally ──────────────────────────
        if not ring_up and not pinky_up and not thumb_up:
            idx_horiz = abs(index_tip[2] - index_mcp[2]) < abs(index_tip[1] - index_mcp[1])
            mid_horiz = abs(middle_tip[2] - middle_mcp[2]) < abs(middle_tip[1] - middle_mcp[1])
            if idx_horiz and mid_horiz and not index_up and not middle_up:
                return "H"

        # ── P: Index + Middle pointing DOWN (tips below wrist) ──────────────
        if not ring_up and not pinky_up and thumb_up:
            if index_tip[2] > wrist[2] and middle_tip[2] > wrist[2]:
                return "P"

        # ── Q: Index + Thumb pointing DOWN ──────────────────────────────────
        if not middle_up and not ring_up and not pinky_up and not thumb_up:
            if index_tip[2] > wrist[2]:
                return "Q"

        # ── F: Index+Thumb touching, Middle+Ring+Pinky up ───────────────────
        if middle_up and ring_up and pinky_up and not index_up:
            if thumb_index_dist < 30:
                return "F"

        # ────────────────────────────────────────────────────────────────────
        # FIST FAMILY — All fingers down (A / E / S / M / N / T)
        # Differentiated by thumb position relative to finger MCP joints
        # ────────────────────────────────────────────────────────────────────
        if all_fingers_down:

            # ── A: Thumb UP to the side (visible thumb) ─────────────────────
            if thumb_up:
                # Thumb tip is above (smaller Y) the index knuckle
                if thumb_tip[2] < index_mcp[2]:
                    return "A"

            # For S, T, M, N — thumb is DOWN (tucked)
            if not thumb_up:
                # Position of thumb tip relative to MCP joints
                # M: thumb under index + middle + ring (3 fingers)
                # N: thumb under index + middle (2 fingers)
                # T: thumb between index and middle MCPs
                # S: thumb crosses over the front of all fingers

                # Thumb tip X position (horizontal)
                tx = thumb_tip[1]
                ix = index_mcp[1]
                mx = middle_mcp[1]
                rx = ring_mcp[1]

                # M: thumb tip is behind/under ring + middle + index MCPs
                if hand_label == "Right":
                    under_3 = tx > rx  # Thumb behind ring side
                    under_2 = rx > tx > mx  # Thumb between ring and middle
                    t_pos   = mx > tx > ix  # Thumb between middle and index
                    s_pos   = tx < ix       # Thumb on index side (across front)
                else:
                    under_3 = tx < rx
                    under_2 = rx < tx < mx
                    t_pos   = mx < tx < ix
                    s_pos   = tx > ix

                if under_3:
                    return "M"
                elif under_2:
                    return "N"
                elif t_pos:
                    return "T"
                elif s_pos:
                    return "S"
                else:
                    return "E"  # Tight fist, thumb tucked under

        # ────────────────────────────────────────────────────────────────────
        # OPEN/CURVED shapes — C and O
        # ────────────────────────────────────────────────────────────────────
        if all_fingers_down and not thumb_up:
            # O: thumb tip very close to index tip (touching)
            if thumb_index_dist < 25:
                return "O"
            # C: thumb and fingers curved in a C — larger gap
            if 25 <= thumb_index_dist < 80:
                # Check that index tip is further from wrist than its MCP
                # (fingers are curved outward, not curled inward like E/S)
                if self._get_distance(index_tip, wrist) > self._get_distance(index_mcp, wrist):
                    return "C"

        return None  # No confident match
