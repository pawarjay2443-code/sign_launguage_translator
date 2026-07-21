/*
  PROJECT  : AI-Based Sign Language Translator (SignAI)
  FILE     : static/js/app.js
  PURPOSE  : Frontend logic — polls /status endpoint, updates high-contrast UI,
             renders radial progress ring, handles button clicks, speaks text
             using Web Speech API, and communicates with the AI Assistant.
*/

"use strict";

// ─────────────────────────────────────────────────────────────
// STATE TRACKING
// ─────────────────────────────────────────────────────────────
let pollInterval     = null;   // setInterval handle for status polling
let lastLetter       = "";     // Tracks last confirmed letter to detect changes
let lastWord         = "";     // Tracks last word to detect changes
let failedPollsCount = 0;     // Tracks consecutive failed polls to detect offline server
let lastError        = "";     // Tracks last error to show toast only once

// ─────────────────────────────────────────────────────────────
// DOM ELEMENT REFERENCES
// ─────────────────────────────────────────────────────────────
const elLetterChar   = document.getElementById("letter-char");
const elProgressLbl  = document.getElementById("progress-label");
const elCurrentWord  = document.getElementById("current-word");
const elSentenceText = document.getElementById("sentence-text");
const elFpsBadge     = document.getElementById("fps-badge");
const elVideoOverlay = document.getElementById("video-overlay");
const elToast        = document.getElementById("toast");
const elBtnStart     = document.getElementById("btn-start");
const elBtnStop      = document.getElementById("btn-stop");
const elRadialCircle = document.getElementById("radial-circle");
const elErrorBanner  = document.getElementById("error-banner");
const elErrorText    = document.getElementById("error-text");

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
    const response = await fetch("/status");
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    failedPollsCount = 0; // Reset failure counter on successful connection

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
  const elStatusPill = document.getElementById("status-pill");
  const elStatusLabel = document.getElementById("status-label");
  
  if (isRunning) {
    if (elStatusPill) elStatusPill.classList.add("active");
    if (elStatusLabel) elStatusLabel.textContent = "Camera Active";
    if (elVideoOverlay) elVideoOverlay.classList.remove("visible");  // Hide the overlay
    if (elBtnStart) elBtnStart.disabled = true;
    if (elBtnStop) elBtnStop.disabled  = false;
    
    // Hide error banner when camera works
    if (elErrorBanner) elErrorBanner.style.display = "none";
  } else {
    if (elStatusPill) elStatusPill.classList.remove("active");
    if (elVideoOverlay) elVideoOverlay.classList.add("visible");     // Show the overlay
    if (elBtnStart) elBtnStart.disabled = false;
    if (elBtnStop) elBtnStop.disabled  = true;

    if (errorMsg) {
      if (elStatusLabel) elStatusLabel.textContent = "Camera Error";
      if (elErrorBanner && elErrorText) {
        elErrorText.textContent = errorMsg;
        elErrorBanner.style.display = "flex";
      }
    } else {
      if (elStatusLabel) elStatusLabel.textContent = "Camera Off";
      if (elErrorBanner) elErrorBanner.style.display = "none";
    }
  }
}

/**
 * Update the SVG radial progress ring based on confirmation frames.
 */
function updateRadialProgress(progress, confirmFrames) {
  if (!elRadialCircle) return;
  // Radial path circle has r=60 -> circumference = 2 * PI * r = 377 (approx)
  const circumference = 377;
  const pct = confirmFrames > 0 ? (progress / confirmFrames) * 100 : 0;
  const offset = circumference - (pct / 100) * circumference;
  
  elRadialCircle.style.strokeDashoffset = offset;
  
  // Accessibility update
  const progressContainer = document.getElementById("radial-progress");
  if (progressContainer) {
    progressContainer.setAttribute("aria-valuenow", Math.round(pct));
  }
}

/**
 * Update the big letter display and the progress ring.
 */
function updateLetterDisplay(gesture, progress, confirmFrames) {
  const displayChar = gesture || "—";
  
  if (elLetterChar.textContent !== displayChar) {
    elLetterChar.textContent = displayChar;
    // Trigger pop animation
    elLetterChar.classList.remove("letter-pop");
    void elLetterChar.offsetWidth; // Force reflow
    elLetterChar.classList.add("letter-pop");
  }

  updateRadialProgress(progress, confirmFrames);

  if (gesture && progress > 0) {
    elProgressLbl.textContent = `Confirming "${gesture}" — ${progress}/${confirmFrames} frames`;
  } else {
    elProgressLbl.textContent = "Hold a sign to confirm";
  }
}

/**
 * Update the word and sentence display areas.
 */
function updateWordDisplay(word, sentence) {
  // Current word
  elCurrentWord.textContent = word || "";

  // Full sentence
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
 * Update the FPS badge.
 */
function updateFps(fps) {
  elFpsBadge.textContent = fps > 0 ? `${fps} FPS` : "-- FPS";
}

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message) {
  elToast.textContent = message;
  elToast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elToast.classList.remove("show");
  }, 1500);
}

// ─────────────────────────────────────────────────────────────
// BUTTON ACTIONS
// ─────────────────────────────────────────────────────────────

async function startCamera() {
  if (elBtnStart.disabled) return;
  elBtnStart.disabled = true;
  lastError = ""; // Reset error
  try {
    const res = await fetch("/start", { method: "POST" });
    const data = await res.json();

    if (data.status === "started" || data.status === "already_running") {
      showToast("📷 Starting camera...");
      startPolling();
    }
  } catch (err) {
    console.error("[startCamera] Error:", err);
    showToast("❌ Could not start camera");
    elBtnStart.disabled = false;
  }
}

async function stopCamera() {
  if (elBtnStop.disabled) return;
  elBtnStop.disabled = true;
  try {
    await fetch("/stop", { method: "POST" });
    showToast("⏹ Camera stopped");
    stopPolling();
    updateCameraStatus(false);
    updateLetterDisplay(null, 0, 15);
    elFpsBadge.textContent = "-- FPS";
  } catch (err) {
    console.error("[stopCamera] Error:", err);
    elBtnStop.disabled = false;
  }
}

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

async function doSpace() {
  try {
    await fetch("/space", { method: "POST" });
    showToast("␣ Word space added");
  } catch (err) {
    console.error("[doSpace] Error:", err);
  }
}

async function doBackspace() {
  try {
    await fetch("/backspace", { method: "POST" });
  } catch (err) {
    console.error("[doBackspace] Error:", err);
  }
}

async function speakText() {
  if (!("speechSynthesis" in window)) {
    showToast("❌ Browser speech synthesis unsupported");
    return;
  }

  try {
    const res  = await fetch("/speak");
    const data = await res.json();

    if (data.status === "empty" || !data.text) {
      showToast("⚠ No text to speak yet");
      return;
    }

    const text = data.text;
    showToast(`🔊 Speaking sentence`);

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = "en-US";
    utterance.rate  = 0.95;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);

  } catch (err) {
    console.error("[speakText] Error:", err);
    showToast("❌ Speech synthesis failed");
  }
}

// ─────────────────────────────────────────────────────────────
// COLLAPSIBLE AI ASSISTANT PANEL
// ─────────────────────────────────────────────────────────────

function toggleAssistant() {
  const content = document.getElementById("assistant-content");
  const chevron = document.getElementById("assistant-chevron");
  const toggleBtn = document.getElementById("btn-assistant-toggle");
  
  if (!content) return;
  const isCollapsed = content.style.display === "none";
  
  if (isCollapsed) {
    content.style.display = "flex";
    if (chevron) chevron.classList.add("chevron-rotated");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
    content.setAttribute("aria-hidden", "false");
    document.getElementById("assistant-input").focus();
  } else {
    content.style.display = "none";
    if (chevron) chevron.classList.remove("chevron-rotated");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    content.setAttribute("aria-hidden", "true");
  }
}

async function askAssistant(event) {
  event.preventDefault();
  const input = document.getElementById("assistant-input");
  const sendBtn = document.getElementById("btn-assistant-send");
  const question = input.value.trim();
  
  if (!question) return;

  // Append user bubble
  appendChatMessage(question, "user");
  input.value = "";

  // Disable input during request
  input.disabled = true;
  sendBtn.disabled = true;

  // Append typing placeholder
  const placeholderId = "typing-" + Date.now();
  appendChatMessage("Thinking...", "assistant typing-indicator", placeholderId);

  try {
    const res = await fetch("/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question })
    });
    const data = await res.json();

    // Remove typing indicator
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) placeholder.remove();

    appendChatMessage(data.answer || "No response received.", "assistant");
  } catch (err) {
    console.error("[askAssistant] Error:", err);
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) placeholder.remove();
    appendChatMessage("Network error. Please make sure the backend is active.", "system-error");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
  }
}

function appendChatMessage(text, sender, id = null) {
  const chatLog = document.getElementById("assistant-chat-log");
  if (!chatLog) return;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + sender;
  if (id) bubble.id = id;

  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);
  chatLog.appendChild(bubble);

  // Auto-scroll chat log
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ─────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.key) {
    case " ":
      e.preventDefault();
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
// PAGE INIT
// ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  pollStatus();
  if (elVideoOverlay) elVideoOverlay.classList.add("visible");
  console.log("[SignAI] App ready. High-contrast accessible interface loaded.");
});
