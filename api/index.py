import sys
import os

# Add backend directory to sys.path so backend modules (hand_detector, gesture_recognizer, etc.) can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from server import app
