import os, sys
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"

# Ensure user site-packages are accessible for emergentintegrations
user_site = os.path.expanduser(r"~\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages")
if os.path.exists(user_site) and user_site not in sys.path:
    sys.path.append(user_site)

import json, time, uuid, asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from gesture_recognizer import GestureRecognizer
from emergency_detector import check_for_emergency
from emergency_data import DISCLAIMER_TEXT
from emergentintegrations.llm.chat import LlmChat, UserMessage

app = FastAPI(title="SignAI Translator API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

recognizer = GestureRecognizer()

SMALL_WORD_DICT = {
    "HELO":"HELLO", "HELLLO":"HELLO", "HOWW":"HOW", "ARR":"ARE",
    "YOUU":"YOU", "PLZ":"PLEASE", "PLEAS":"PLEASE", "THX":"THANKS",
    "THNKS":"THANKS", "GD":"GOOD", "MRNG":"MORNING", "NITE":"NIGHT",
}

class SessionState:
    def __init__(self):
        self.reset()
    def reset(self):
        self.current_word = ""
        self.sentence = ""
        self.last_added_letter = ""
        self.current_gesture: Optional[str] = None
        self.gesture_frames = 0
        self.CONFIRMATION_FRAMES = 10
        self.cooldown_frames = 0
        self.total_gestures = 0
        self.confirmed_count = 0
        self.attempts = 0
        self.session_started_at = datetime.now(timezone.utc).isoformat()
        self.recent_detections: List[Dict[str, Any]] = []
        self.translated_sentences: List[str] = []
        self.last_letter_ts = time.time()
        self.emergency_alerts_triggered = 0
        self.active_emergency_keyword: Optional[str] = None

    def _autocorrect_word(self, w): return SMALL_WORD_DICT.get(w.upper(), w)

    def push_letter(self, letter, confidence):
        self.attempts += 1
        now = time.time()
        if self.current_word and (now - self.last_letter_ts) > 2.0:
            self._commit_word_to_sentence(auto=True)
        if letter is None or confidence < 0.55:
            self.current_gesture = None
            self.gesture_frames = 0
            return None
        if letter == self.current_gesture:
            self.gesture_frames += 1
        else:
            self.current_gesture = letter
            self.gesture_frames = 1
        if self.cooldown_frames > 0:
            self.cooldown_frames -= 1
            if letter == self.last_added_letter:
                return None
        if self.gesture_frames >= self.CONFIRMATION_FRAMES:
            self.current_word += letter
            self.last_added_letter = letter
            self.gesture_frames = 0
            self.cooldown_frames = 8
            self.confirmed_count += 1
            self.total_gestures += 1
            self.last_letter_ts = now
            self.recent_detections.insert(0, {
                "value": letter, "confidence": round(confidence, 2),
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            self.recent_detections = self.recent_detections[:20]
            return letter
        return None

    def _commit_word_to_sentence(self, auto=False):
        w = self.current_word.strip()
        if not w: return
        w = self._autocorrect_word(w)
        w = w.capitalize() if not self.sentence else w.lower()
        self.sentence = (self.sentence + " " + w).strip() if self.sentence else w
        self.current_word = ""
        self.current_gesture = None
        self.gesture_frames = 0
        self.last_added_letter = ""

    def add_space(self): self._commit_word_to_sentence()

    def backspace(self):
        if self.current_word:
            self.current_word = self.current_word[:-1]
        elif self.sentence:
            parts = self.sentence.rsplit(" ", 1)
            self.sentence = parts[0] if len(parts) > 1 else ""
        self.current_gesture = None
        self.gesture_frames = 0

    def clear(self):
        full_text = (self.sentence + " " + self.current_word).strip()
        if full_text:
            self.translated_sentences.insert(0, full_text)
            self.translated_sentences = self.translated_sentences[:50]
        self.current_word = ""
        self.sentence = ""
        self.current_gesture = None
        self.gesture_frames = 0
        self.last_added_letter = ""

    def status_payload(self, extra=None):
        full_text = (self.sentence + " " + self.current_word).strip()
        emergency = check_for_emergency(full_text)
        if emergency:
            if emergency["keyword"] != self.active_emergency_keyword:
                self.emergency_alerts_triggered += 1
                self.active_emergency_keyword = emergency["keyword"]
        else:
            self.active_emergency_keyword = None
        try:
            started = datetime.fromisoformat(self.session_started_at)
            elapsed = int((datetime.now(timezone.utc) - started).total_seconds())
        except: elapsed = 0
        accuracy = round(100.0 * self.confirmed_count / max(self.attempts,1), 1) if self.attempts>0 else 0.0
        payload = {
            "current_gesture": self.current_gesture,
            "gesture_progress": self.gesture_frames,
            "confirmation_frames": self.CONFIRMATION_FRAMES,
            "current_word": self.current_word,
            "sentence": self.sentence,
            "last_added_letter": self.last_added_letter,
            "recent_detections": self.recent_detections,
            "translated_sentences": self.translated_sentences,
            "stats": {
                "total_gestures": self.total_gestures,
                "confirmed": self.confirmed_count,
                "attempts": self.attempts,
                "accuracy": accuracy,
                "session_seconds": elapsed,
            },
            "emergency": emergency,
            "emergency_disclaimer": DISCLAIMER_TEXT,
        }
        if extra: payload.update(extra)
        return payload

state = SessionState()

class RecognizeRequest(BaseModel):
    left_hand: Optional[List[List[float]]] = None
    right_hand: Optional[List[List[float]]] = None
    fps: Optional[float] = 0
    face_visible: bool = True

class SpeakRequest(BaseModel):
    text: Optional[str] = None

class AssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

def _flatten_hand(hand):
    if not hand or len(hand) != 21:
        return [0.0] * 63
    flat = []
    for lm in hand:
        if len(lm) < 3:
            lm = [lm[0] if len(lm)>0 else 0.0, lm[1] if len(lm)>1 else 0.0, 0.0]
        flat.extend([float(lm[0]), float(lm[1]), float(lm[2])])
    return flat

@app.post("/api/recognize")
async def recognize(req: RecognizeRequest):
    landmarks_flat = _flatten_hand(req.left_hand) + _flatten_hand(req.right_hand)
    detected_letter = None
    hand_visible = req.left_hand is not None or req.right_hand is not None
    if req.face_visible and hand_visible:
        try:
            detected_letter = recognizer.recognize(landmarks_flat)
        except Exception as ex:
            print(f"[recognize] {ex}")
    confidence = 0.9 if detected_letter else 0.0
    committed = state.push_letter(detected_letter, confidence)
    return state.status_payload(extra={
        "detected_letter": detected_letter,
        "confidence": confidence,
        "committed_letter": committed,
        "hand_visible": hand_visible,
        "face_visible": req.face_visible,
        "fps": req.fps or 0,
    })

@app.get("/api/status")
async def get_status(): return state.status_payload()

@app.post("/api/space")
async def api_space(): state.add_space(); return {"status":"ok", **state.status_payload()}

@app.post("/api/backspace")
async def api_backspace(): state.backspace(); return {"status":"ok", **state.status_payload()}

@app.post("/api/clear")
async def api_clear(): state.clear(); return {"status":"ok", **state.status_payload()}

@app.post("/api/reset")
async def api_reset(): state.reset(); return {"status":"ok", **state.status_payload()}

@app.post("/api/speak")
async def api_speak(req: SpeakRequest):
    text = req.text.strip() if (req.text and req.text.strip()) else (state.sentence + " " + state.current_word).strip()
    return {"status":"ok", "text": text}

ISL_LETTER_INFO = {
    "A": {"category":"vowel","description":"Closed fist with thumb resting alongside the fingers.","tip":"Keep thumb flat against index finger — don't tuck inside."},
    "B": {"category":"consonant","description":"Flat hand, fingers straight up together, thumb folded across palm.","tip":"Fingers tightly closed, pointed skyward."},
    "C": {"category":"consonant","description":"Curved hand shaped like the letter C.","tip":"Keep curve open and consistent."},
    "D": {"category":"consonant","description":"Index finger up, other fingers touch thumb forming a circle.","tip":"Circle should look like lowercase 'd'."},
    "E": {"category":"vowel","description":"Fingers curled to touch thumb, forming a claw shape.","tip":"All fingertips press lightly against thumb pad."},
    "F": {"category":"consonant","description":"Index and thumb form circle; other three fingers point up.","tip":"Keep three extended fingers straight and spread."},
    "G": {"category":"consonant","description":"Index and thumb extended horizontally, others closed.","tip":"Hand sideways, index pointing forward."},
    "H": {"category":"consonant","description":"Index and middle extended horizontally, others closed.","tip":"Two fingers side by side pointing forward."},
    "I": {"category":"vowel","description":"Pinky finger up, others closed with thumb on top.","tip":"Only little finger visible above fist."},
    "J": {"category":"consonant","description":"Draw the letter 'J' in the air with your pinky.","tip":"Dynamic — practice smoothly."},
    "K": {"category":"consonant","description":"Index up, middle at 90°, thumb touching middle base.","tip":"Middle forward, index up."},
    "L": {"category":"consonant","description":"Thumb sideways, index up — makes an 'L'.","tip":"Keep L crisp, other fingers folded."},
    "M": {"category":"consonant","description":"Thumb tucked under three folded fingers.","tip":"Thumb peeks between ring and pinky."},
    "N": {"category":"consonant","description":"Thumb tucked under two folded fingers.","tip":"Thumb visible between middle and ring."},
    "O": {"category":"vowel","description":"All fingers curl and touch thumb, forming round 'O'.","tip":"Keep O round — no gaps."},
    "P": {"category":"consonant","description":"Like K but pointing downward.","tip":"Flip K downward."},
    "Q": {"category":"consonant","description":"Like G but pointing downward.","tip":"Thumb and index down, palm facing you."},
    "R": {"category":"consonant","description":"Cross middle finger over index finger.","tip":"Fingers crossed like a knot."},
    "S": {"category":"consonant","description":"Fist with thumb wrapped over front of fingers.","tip":"Thumb across front — not on side (that's A)."},
    "T": {"category":"consonant","description":"Fist with thumb pushed between index and middle.","tip":"Only thumb tip peeks out."},
    "U": {"category":"vowel","description":"Index and middle up together, others closed.","tip":"Fingers touching side by side."},
    "V": {"category":"consonant","description":"Index and middle up in V-shape, spread apart.","tip":"Wide V — don't confuse with U."},
    "W": {"category":"consonant","description":"Index, middle, ring spread up in W-shape.","tip":"Three fingers spread evenly."},
    "X": {"category":"consonant","description":"Index finger bent like a hook, others closed.","tip":"Curl only the index."},
    "Y": {"category":"vowel","description":"Thumb and pinky extended, others folded (shaka sign).","tip":"Like 'call me' sign."},
    "Z": {"category":"consonant","description":"Draw the letter 'Z' in the air with your index finger.","tip":"Dynamic — trace the shape smoothly."},
}
RULE_SUPPORTED = {"A","B","C","D","E","F","I","K","L","O","S","U","V","W","Y"}

@app.get("/api/lessons")
async def get_lessons():
    letters = [{"letter":c, **ISL_LETTER_INFO[c], "rule_supported": c in RULE_SUPPORTED}
               for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
    return {"letters": letters, "supported_count": len(RULE_SUPPORTED)}

_chat_sessions: Dict[str, LlmChat] = {}

SIGN_AI_SYSTEM_PROMPT = """You are SignAI Assistant, an intelligent tutor & communication helper inside a real-time Indian Sign Language translator app.

The app supports letters A–Y with rule-based recognition of: A,B,C,D,E,F,I,K,L,O,S,U,V,W,Y. It has word/sentence building with auto-spacing, auto-capitalization, autocorrect, backspace, space, and clear gestures. There is a Learn ISL module.

Your job: teach signs step-by-step, explain detected gestures, suggest corrections, propose natural next words, answer ISL/accessibility questions. Style: Short, friendly, 2-4 sentences. Bullet points for step lists."""

def _get_chat(session_id):
    if session_id in _chat_sessions: return _chat_sessions[session_id]
    api_key = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-03a1c1b0f6b0bBaFc6")
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=SIGN_AI_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")
    _chat_sessions[session_id] = chat
    return chat

@app.post("/api/assistant")
async def assistant(req: AssistantRequest):
    if not req.message or not req.message.strip():
        return {"reply":"Ask me anything about ISL!", "session_id": req.session_id or ""}
    session_id = req.session_id or str(uuid.uuid4())
    chat = _get_chat(session_id)
    ctx = req.context or {}
    context_line = ""
    if ctx:
        cw, st, ll = ctx.get("current_word",""), ctx.get("sentence",""), ctx.get("last_letter","")
        if cw or st or ll:
            context_line = f"\n\n[Live context — current_word='{cw}', sentence='{st}', last_letter='{ll}']"
    user_msg = UserMessage(text=req.message.strip() + context_line)
    try:
        reply_text = await chat.send_message(user_msg)
    except Exception as ex:
        print(f"[assistant warning] {ex}")
        msg_lower = req.message.lower()
        if "a" in msg_lower or "letter" in msg_lower:
            reply_text = "To sign letter 'A' in ISL: Form a closed fist with your thumb resting flat alongside your index finger. Keep your palm facing forward."
        elif "phrase" in msg_lower or "practice" in msg_lower:
            reply_text = "Here are 3 great ISL practice phrases to try:\n• HELLO HOW ARE YOU\n• GOOD MORNING\n• PLEASE HELP"
        elif "difference" in msg_lower or "u and v" in msg_lower:
            reply_text = "For 'U', extend index & middle fingers straight together. For 'V', spread index & middle fingers apart in a V-shape."
        else:
            reply_text = f"SignAI Assistant: Position your hand clearly in front of the camera. Supported rule-based ISL letters are: {', '.join(sorted(RULE_SUPPORTED))}."
    return {"reply": reply_text, "session_id": session_id}

@app.get("/api/assistant/suggestions")
async def assistant_suggestions():
    return {
        "suggestions": [
            "How do I sign letter A?",
            "What is the difference between U and V?",
            "Show practice phrases",
            "How does emergency detection work?"
        ]
    }

# -----------------------------------------------------------------------------
# Static File & Single Page App (SPA) Serving for Production Deployment
# -----------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_build = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "build"))
if os.path.exists(frontend_build):
    static_dir = os.path.join(frontend_build, "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_build, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_build, "index.html"))

@app.get("/api/health")
async def health():
    return {"status":"healthy",
            "recognizer_mode": "rules" if recognizer.model is None else "ml",
            "supported_letters": sorted(RULE_SUPPORTED),
            "time": datetime.now(timezone.utc).isoformat()}

@app.get("/api/")
async def root(): return {"app":"SignAI Translator API","version":"2.0.0"}
