/*
  PROJECT  : AI-Based Sign Language Translator
  FILE     : static/js/app.js
  PURPOSE  : Frontend logic — polls Flask for status, handles
             button clicks, updates the UI, and speaks text
             using the browser's Web Speech API.

  HOW IT WORKS:
  ─────────────────────────────────────────────────────
  1. pollStatus()  runs every 500ms via setInterval.
     It calls GET /status which returns JSON like:
       { camera_running: true, current_gesture: "A",
         gesture_progress: 8, current_word: "HEL", ... }
     Then it updates the UI with that data.

  2. startCamera() calls POST /start → Flask opens webcam.
  3. stopCamera()  calls POST /stop  → Flask closes webcam.
  4. clearText()   calls POST /clear → resets word/sentence.
  5. doSpace()     calls POST /space → finishes current word.
  6. doBackspace() calls POST /backspace → deletes last char.
  7. speakText()   calls GET /speak → gets the text, then uses
     window.speechSynthesis to speak it (browser built-in, no
     Python library needed, works inside Flask reliably).
*/

"use strict";

// ─────────────────────────────────────────────────────────────
// STATE TRACKING (client-side mirror of server state)
// ─────────────────────────────────────────────────────────────
let pollInterval   = null;   // setInterval handle for status polling
let lastLetter     = "";     // Tracks last confirmed letter to detect changes
let lastWord       = "";     // Tracks last word to detect changes
let failedPollsCount = 0;    // Tracks consecutive failed polls to detect offline server
let lastError      = "";     // Tracks last error to show toast only once


// ─────────────────────────────────────────────────────────────
// DOM ELEMENT REFERENCES
// Grab all the elements we'll update so we don't search for
// them repeatedly inside the polling loop.
// ─────────────────────────────────────────────────────────────
const elLetterChar   = document.getElementById("letter-char");
const elProgressBar  = document.getElementById("progress-bar");
const elProgressLbl  = document.getElementById("progress-label");
const elCurrentWord  = document.getElementById("current-word");
const elSentenceText = document.getElementById("sentence-text");
const elStatusDot    = document.getElementById("status-dot");
const elStatusLabel  = document.getElementById("status-label");
const elStatusPill   = document.querySelector(".status-pill");
const elFpsBadge     = document.getElementById("fps-badge");
const elVideoOverlay = document.getElementById("video-overlay");
const elToast        = document.getElementById("toast");
const elBtnStart     = document.getElementById("btn-start");
const elBtnStop      = document.getElementById("btn-stop");


// ─────────────────────────────────────────────────────────────
// POLLING — Fetch status from Flask every 500ms
// ─────────────────────────────────────────────────────────────

/**
 * Start polling /status every 500ms.
 * Called once when the camera starts.
 */
function startPolling() {
  if (pollInterval) return;  // Already polling
  pollInterval = setInterval(pollStatus, 500);
  pollStatus();              // Run once immediately (don't wait 500ms)
}

/**
 * Stop the polling loop.
 * Called when the camera stops.
 */
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

/**
 * Fetch current status from Flask and update the UI.
 * This is the CORE update function — called every 500ms.
 */
async function pollStatus() {
  try {
    // Fetch JSON from the /status Flask route
    const response = await fetch("/status");
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    failedPollsCount = 0; // Reset failure counter on successful connection

    /*
      data = {
        camera_running: bool,
        current_gesture: "A" or null,
        gesture_progress: 0-15,
        confirmation_frames: 15,
        current_word: "HEL",
        sentence: "HELLO WORLD",
        last_added_letter: "H",
        fps: 28
      }
    */

    updateCameraStatus(data.camera_running, data.error);
    updateLetterDisplay(data.current_gesture, data.gesture_progress, data.confirmation_frames);
    updateWordDisplay(data.current_word, data.sentence);
    updateFps(data.fps);

    // Detect when a new letter was just confirmed and show a toast
    if (data.last_added_letter && data.last_added_letter !== lastLetter) {
      showToast(`✓ "${data.last_added_letter}" added`);
      lastLetter = data.last_added_letter;
    }

    // Handle displaying error toast when it changes
    if (data.error && data.error !== lastError) {
      showToast(`❌ Error: ${data.error}`);
      lastError = data.error;
    } else if (!data.error) {
      lastError = "";
    }

  } catch (err) {
    failedPollsCount++;
    console.warn("[pollStatus] Could not reach server:", err.message);
    if (failedPollsCount >= 3) {
      showToast("⚠️ Server connection lost. Check Flask app.");
    }
  }
}


// ─────────────────────────────────────────────────────────────
// UI UPDATE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Update the header status pill (Camera On/Off indicator).
 */
function updateCameraStatus(isRunning, errorMsg) {
  const overlayContent = elVideoOverlay.querySelector(".overlay-content");
  if (isRunning) {
    elStatusPill.classList.add("active");
    elStatusLabel.textContent = "Camera Active";
    elVideoOverlay.classList.remove("visible");  // Hide the overlay
    elBtnStart.disabled = true;
    elBtnStop.disabled  = false;
  } else {
    elStatusPill.classList.remove("active");
    elVideoOverlay.classList.add("visible");     // Show the overlay
    elBtnStart.disabled = false;
    elBtnStop.disabled  = true;

    if (errorMsg) {
      elStatusLabel.textContent = "Camera Error";
      if (overlayContent) {
        overlayContent.innerHTML = `
          <span class="overlay-icon" style="color: #ff4a4a;">⚠️</span>
          <p style="color: #ff4a4a; font-weight: 600;">System Error</p>
          <p style="font-size: 0.9rem; margin-top: 5px; max-width: 80%;">${errorMsg}</p>
        `;
      }
    } else {
      elStatusLabel.textContent = "Camera Off";
      if (overlayContent) {
        overlayContent.innerHTML = `
          <span class="overlay-icon">📷</span>
          <p>Click <strong>Start Camera</strong> to begin</p>
        `;
      }
    }
  }
}

/**
 * Update the big letter display and the progress bar.
 *
 * @param {string|null} gesture  - The letter being detected (e.g. "A") or null
 * @param {number} progress      - Frames held (0 to confirmFrames)
 * @param {number} confirmFrames - Total frames needed to confirm (15)
 */
function updateLetterDisplay(gesture, progress, confirmFrames) {
  // ── Letter character ──
  const displayChar = gesture || "—";
  if (elLetterChar.textContent !== displayChar) {
    elLetterChar.textContent = displayChar;
    // Trigger a small pop animation when the letter changes
    elLetterChar.classList.remove("letter-pop");
    void elLetterChar.offsetWidth;              // Force browser reflow (resets animation)
    elLetterChar.classList.add("letter-pop");
  }

  // ── Progress bar (gesture hold confirmation) ──
  // progress / confirmFrames gives a 0.0 to 1.0 fraction
  const pct = confirmFrames > 0 ? (progress / confirmFrames) * 100 : 0;
  elProgressBar.style.width = pct + "%";

  if (gesture && progress > 0) {
    elProgressLbl.textContent = `Hold "${gesture}" — ${progress}/${confirmFrames} frames`;
  } else {
    elProgressLbl.textContent = "Hold a gesture to confirm a letter";
  }
}

/**
 * Update the word and sentence display areas.
 *
 * @param {string} word     - Current word being built
 * @param {string} sentence - Full sentence so far
 */
function updateWordDisplay(word, sentence) {
  // ── Current word ──
  elCurrentWord.textContent = word || "";

  // ── Full sentence ──
  // Combine confirmed sentence + the word currently being typed
  const fullText = [sentence, word].filter(Boolean).join(" ").trim();

  if (fullText) {
    elSentenceText.textContent = fullText;
    elSentenceText.classList.add("has-content");
  } else {
    elSentenceText.textContent = "Your sentence will appear here...";
    elSentenceText.classList.remove("has-content");
  }
}

/**
 * Update the FPS badge in the camera panel header.
 */
function updateFps(fps) {
  elFpsBadge.textContent = fps > 0 ? `${fps} FPS` : "-- FPS";
}


// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────

let toastTimer = null;

/**
 * Show a brief toast message at the bottom-right corner.
 * Auto-hides after 1.5 seconds.
 *
 * @param {string} message - Text to show in the toast
 */
function showToast(message) {
  elToast.textContent = message;
  elToast.classList.add("show");

  // Cancel any existing hide timer
  if (toastTimer) clearTimeout(toastTimer);

  // Auto-hide after 1.5s
  toastTimer = setTimeout(() => {
    elToast.classList.remove("show");
  }, 1500);
}


// ─────────────────────────────────────────────────────────────
// BUTTON ACTIONS
// Each function calls a Flask endpoint with POST/GET,
// then shows a toast for feedback.
// ─────────────────────────────────────────────────────────────

/**
 * Start the webcam — calls POST /start.
 * The camera_loop thread starts in Flask.
 */
async function startCamera() {
  if (elBtnStart.disabled) return;
  elBtnStart.disabled = true;
  lastError = ""; // Reset error tracker
  try {
    const res = await fetch("/start", { method: "POST" });
    const data = await res.json();

    if (data.status === "started" || data.status === "already_running") {
      showToast("📷 Camera starting...");
      startPolling();   // Begin status polling loop
    }
  } catch (err) {
    console.error("[startCamera] Error:", err);
    showToast("❌ Could not start camera");
    elBtnStart.disabled = false;
  }
}

/**
 * Stop the webcam — calls POST /stop.
 */
async function stopCamera() {
  if (elBtnStop.disabled) return;
  elBtnStop.disabled = true;
  try {
    await fetch("/stop", { method: "POST" });
    showToast("⏹ Camera stopped");
    stopPolling();
    // Update UI immediately (don't wait for next poll)
    updateCameraStatus(false);
    updateLetterDisplay(null, 0, 15);
    elFpsBadge.textContent = "-- FPS";
  } catch (err) {
    console.error("[stopCamera] Error:", err);
    elBtnStop.disabled = false;
  }
}

/**
 * Clear all text — calls POST /clear.
 */
async function clearText() {
  try {
    await fetch("/clear", { method: "POST" });
    showToast("🗑 Text cleared");
    lastLetter = "";
    updateWordDisplay("", "");
  } catch (err) {
    console.error("[clearText] Error:", err);
  }
}

/**
 * Add space (finish current word) — calls POST /space.
 * The server moves current_word into the sentence.
 */
async function doSpace() {
  try {
    await fetch("/space", { method: "POST" });
    showToast("␣ Word added");
  } catch (err) {
    console.error("[doSpace] Error:", err);
  }
}

/**
 * Backspace (delete last character) — calls POST /backspace.
 */
async function doBackspace() {
  try {
    await fetch("/backspace", { method: "POST" });
  } catch (err) {
    console.error("[doBackspace] Error:", err);
  }
}

/**
 * Speak the full text using the browser's built-in Web Speech API.
 *
 * WHY browser speech instead of pyttsx3?
 * → pyttsx3 was designed for desktop apps. Inside Flask's threaded
 *   server it can block or crash. The browser's window.speechSynthesis
 *   is built into Chrome/Edge and works perfectly without any Python
 *   library.
 *
 * HOW it works:
 * → We first ask Flask for the current text (GET /speak),
 *   then pass it to window.speechSynthesis.speak().
 */
async function speakText() {
  // Check if the browser supports speech
  if (!("speechSynthesis" in window)) {
    showToast("❌ Browser doesn't support speech");
    return;
  }

  try {
    // Ask Flask for the current full text
    const res  = await fetch("/speak");
    const data = await res.json();

    if (data.status === "empty" || !data.text) {
      showToast("⚠ Nothing to speak yet");
      return;
    }

    const text = data.text;
    showToast(`🔊 Speaking: "${text}"`);

    // Cancel any currently playing speech
    window.speechSynthesis.cancel();

    // Create a new utterance (a "speech request")
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = "en-US";    // Language
    utterance.rate  = 0.95;       // Slightly slower than default (0.0 to 10.0, default 1)
    utterance.pitch = 1.0;        // Normal pitch (0.0 to 2.0)

    // Speak it!
    window.speechSynthesis.speak(utterance);

  } catch (err) {
    console.error("[speakText] Error:", err);
    showToast("❌ Speech error");
  }
}


// ─────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// Makes the app faster to use while testing
// ─────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ignore key presses if user is typing in an input field
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.key) {
    case " ":
      e.preventDefault();    // Prevent page scrolling on spacebar
      doSpace();
      break;
    case "Backspace":
      doBackspace();
      break;
    case "Enter":
      speakText();
      break;
    case "Escape":
      clearText();
      break;
  }
});


// ─────────────────────────────────────────────────────────────
// PAGE INIT — Run when the page first loads
// ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Immediately check if the camera was already running
  // (e.g. if the user refreshed the page)
  pollStatus();

  // Show the video overlay initially (camera is off)
  elVideoOverlay.classList.add("visible");

  console.log("[SignAI] App ready. Click 'Start Camera' to begin.");
});
