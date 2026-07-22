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
let lastWordSign     = "";     // Tracks last word sign to detect changes
let failedPollsCount = 0;     // Tracks consecutive failed polls to detect offline server
let lastError        = "";     // Tracks last error to show toast only once
let conversationPollInterval = null; // setInterval handle for transcript polling
let convLastTranscriptLen = 0; // Tracks length of chat transcript to detect updates
let convListening = false;     // Tracks if conversation mic is active
let convRecognition = null;    // Conversation speech recognition instance
let activeEmergencyKeyword = null; // Current active emergency warning word

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

// Emergency Warning DOM References
const elEmergencyBanner = document.getElementById("emergency-banner");
const elEmergencyAlertText = document.getElementById("emergency-alert-text");
const elEmergencyFirstAidList = document.getElementById("emergency-first-aid-list");
const elEmergencyDisclaimer = document.getElementById("emergency-disclaimer");

// Toggles & Mode container elements
const elBtnAppSolo = document.getElementById("btn-app-solo");
const elBtnAppConv = document.getElementById("btn-app-conversation");
const elBtnRecSpell = document.getElementById("btn-rec-spell");
const elBtnRecWord = document.getElementById("btn-rec-word");

const elSoloInfoPanel = document.getElementById("solo-info-panel");
const elConvPanel = document.getElementById("conversation-panel");
const elReverseTranslationCard = document.getElementById("reverse-translation-card");
const elSignerOutputCard = document.getElementById("signer-output-card");

// Word sign UI elements
const elRadialProgress = document.getElementById("radial-progress");
const elWordSignDisplay = document.getElementById("word-sign-display");
const elWordSignChar = document.getElementById("word-sign-char");
const elWordConfidenceBar = document.getElementById("word-confidence-bar-indicator");
const elWordConfidencePct = document.getElementById("word-confidence-pct");
const elGestureCardHeading = document.getElementById("gesture-card-heading");

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
    
    // Check mode and update displays
    if (data.recognition_mode === "word") {
      updateWordSignDisplay(data.current_word_sign, data.word_confidence);
    } else {
      updateLetterDisplay(data.current_gesture, data.gesture_progress, data.confirmation_frames);
    }
    
    updateWordDisplay(data.current_word, data.sentence);
    updateFps(data.fps);

    // Sync state mode toggles
    updateModeToggles(data.recognition_mode, data.app_mode);

    // Detect when a new letter was just confirmed and show a toast
    if (data.last_added_letter && data.last_added_letter !== lastLetter) {
      showToast(`✓ "${data.last_added_letter}" added`);
      lastLetter = data.last_added_letter;
    }

    // Detect when a new word sign was just confirmed and show a toast
    if (data.last_added_word_sign && data.last_added_word_sign !== lastWordSign) {
      showToast(`✓ "${data.last_added_word_sign}" added`);
      lastWordSign = data.last_added_word_sign;
      if (data.app_mode === "conversation") {
        pollConversationTranscript(); // Update immediately
      }
    }

    // Handle displaying error toast when it changes
    if (data.error && data.error !== lastError) {
      showToast(`❌ Error: ${data.error}`);
      lastError = data.error;
    } else if (!data.error) {
      lastError = "";
    }

    // ── Handle Emergency Warning Banner & TTS ──
    if (data.emergency) {
      if (elEmergencyBanner) {
        if (elEmergencyAlertText) elEmergencyAlertText.textContent = data.emergency.alert;
        if (elEmergencyDisclaimer) elEmergencyDisclaimer.textContent = "*Disclaimer: " + data.emergency_disclaimer;
        
        // Populate first-aid bullet list
        if (elEmergencyFirstAidList) {
          elEmergencyFirstAidList.innerHTML = "";
          data.emergency.first_aid.forEach(step => {
            const li = document.createElement("li");
            li.textContent = step;
            elEmergencyFirstAidList.appendChild(li);
          });
        }
        
        elEmergencyBanner.style.display = "block";
      }
      
      // Interrupt and play TTS if this is a new emergency keyword
      if (data.emergency.keyword !== activeEmergencyKeyword) {
        activeEmergencyKeyword = data.emergency.keyword;
        showToast("🚨 Emergency Triggered!");
        speakText(data.emergency.alert);
      }
    } else {
      // Hide emergency banner and reset state
      if (elEmergencyBanner) elEmergencyBanner.style.display = "none";
      activeEmergencyKeyword = null;
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

    // Also update signer output card on the left in conversation mode
    const elSignerOutputText = document.getElementById("signer-output-text");
    if (elSignerOutputText) {
      elSignerOutputText.textContent = fullText;
      elSignerOutputText.classList.add("has-content");
    }
  } else {
    elSentenceText.textContent = "Your sentence will appear here...";
    elSentenceText.classList.remove("has-content");

    const elSignerOutputText = document.getElementById("signer-output-text");
    if (elSignerOutputText) {
      elSignerOutputText.textContent = "Sign using your webcam to build sentences...";
      elSignerOutputText.classList.remove("has-content");
    }
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

async function speakText(overrideText = null) {
  if (!("speechSynthesis" in window)) {
    showToast("❌ Browser speech synthesis unsupported");
    return;
  }

  let text = "";
  if (overrideText) {
    text = overrideText;
    try {
      fetch(`/speak?text=${encodeURIComponent(overrideText)}`);
    } catch (e) {}
  } else {
    try {
      const res  = await fetch("/speak");
      const data = await res.json();

      if (data.status === "empty" || !data.text) {
        showToast("⚠ No text to speak yet");
        return;
      }
      text = data.text;
    } catch (err) {
      console.error("[speakText] Error:", err);
      showToast("❌ Speech synthesis failed");
      return;
    }
  }

  showToast(`🔊 Speaking text`);

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = "en-US";
  utterance.rate  = 0.95;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
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

    appendChatMessage(data.answer || "No response received.", "assistant", null, data.image_url);
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

function appendChatMessage(text, sender, id = null, imageUrl = null) {
  const chatLog = document.getElementById("assistant-chat-log");
  if (!chatLog) return;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + sender;
  if (id) bubble.id = id;

  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);

  // If there's an inline image, render it underneath the answer text
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = `ISL Sign gesture illustration`;
    img.className = "chat-sign-img";
    img.onerror = () => {
      img.style.display = "none";
      const errorMsg = document.createElement("p");
      errorMsg.className = "chat-img-fallback";
      errorMsg.textContent = "⚠️ (Sign reference image failed to load)";
      bubble.appendChild(errorMsg);
    };
    bubble.appendChild(img);
  }

  chatLog.appendChild(bubble);

  // Auto-scroll chat log
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ─────────────────────────────────────────────────────────────
// REVERSE TRANSLATION (TEXT TO SIGN FILMSTRIP & MIC INPUT)
// ─────────────────────────────────────────────────────────────
let filmstripQueue = [];
let filmstripIndex = 0;
let filmstripPlayInterval = null;
let filmstripPlaybackSpeed = 1.0; // delay in seconds
let recognition = null;
let isListening = false;

async function translateTextToSign(event) {
  if (event) event.preventDefault();
  
  const input = document.getElementById("reverse-text-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  stopFilmstripPlayback();

  try {
    const res = await fetch(`/text-to-sign?text=${encodeURIComponent(text)}`);
    const data = await res.json();

    filmstripQueue = data;
    filmstripIndex = 0;

    renderFilmstripTimeline();

    if (filmstripQueue.length > 0) {
      document.getElementById("filmstrip-wrapper").style.display = "flex";
      highlightFilmstripFrame(0);
    } else {
      document.getElementById("filmstrip-wrapper").style.display = "none";
      showToast("⚠️ No signs could be extracted from input.");
    }
  } catch (err) {
    console.error("[translateTextToSign] Error:", err);
    showToast("❌ Failed to parse signs.");
  }
}

function renderFilmstripTimeline() {
  const timeline = document.getElementById("filmstrip-timeline");
  if (!timeline) return;

  timeline.innerHTML = "";
  filmstripQueue.forEach((item, idx) => {
    const itemCard = document.createElement("div");
    itemCard.className = "filmstrip-item";
    
    if (item.is_space) {
      itemCard.classList.add("space-item");
      const span = document.createElement("span");
      span.textContent = "␣";
      itemCard.appendChild(span);
      itemCard.title = "Space";
    } else {
      if (item.exists && item.image_url) {
        const img = document.createElement("img");
        img.src = item.image_url;
        img.alt = `Sign for ${item.letter}`;
        itemCard.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.textContent = item.letter;
        itemCard.appendChild(span);
      }
      itemCard.title = `Letter: ${item.letter}`;
    }

    itemCard.onclick = () => {
      stopFilmstripPlayback();
      highlightFilmstripFrame(idx);
    };

    timeline.appendChild(itemCard);
  });
}

function highlightFilmstripFrame(index) {
  if (index < 0 || index >= filmstripQueue.length) return;
  filmstripIndex = index;

  // Highlight thumbnail in scrollbar
  const items = document.querySelectorAll(".filmstrip-timeline .filmstrip-item");
  items.forEach((item, idx) => {
    if (idx === index) {
      item.classList.add("active");
      item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } else {
      item.classList.remove("active");
    }
  });

  // Highlight preview window
  const activeItem = filmstripQueue[index];
  const largePreview = document.getElementById("filmstrip-large-preview");
  const fallback = document.getElementById("filmstrip-preview-fallback");
  const activeLetter = document.getElementById("filmstrip-active-letter");

  if (activeItem.is_space) {
    if (largePreview) largePreview.style.display = "none";
    if (fallback) {
      fallback.textContent = "␣";
      fallback.style.display = "block";
    }
    if (activeLetter) activeLetter.textContent = "Space";
  } else {
    if (activeItem.exists && activeItem.image_url) {
      if (largePreview) {
        largePreview.src = activeItem.image_url;
        largePreview.alt = `Active sign: ${activeItem.letter}`;
        largePreview.style.display = "block";
      }
      if (fallback) fallback.style.display = "none";
    } else {
      if (largePreview) largePreview.style.display = "none";
      if (fallback) {
        fallback.textContent = activeItem.letter;
        fallback.style.display = "block";
      }
    }
    if (activeLetter) activeLetter.textContent = `Letter ${activeItem.letter}`;
  }
}

function toggleFilmstripPlay() {
  if (filmstripPlayInterval) {
    stopFilmstripPlayback();
  } else {
    startFilmstripPlayback();
  }
}

function startFilmstripPlayback() {
  if (filmstripQueue.length === 0) return;

  const playPauseLabel = document.getElementById("play-pause-label");
  const playPauseIcon = document.getElementById("play-pause-icon");

  if (playPauseLabel) playPauseLabel.textContent = "Pause";
  if (playPauseIcon) {
    playPauseIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
  }

  filmstripPlayInterval = setInterval(() => {
    let nextIndex = filmstripIndex + 1;
    if (nextIndex >= filmstripQueue.length) {
      nextIndex = 0; // Wrap around loop
    }
    highlightFilmstripFrame(nextIndex);
  }, filmstripPlaybackSpeed * 1000);
}

function stopFilmstripPlayback() {
  if (filmstripPlayInterval) {
    clearInterval(filmstripPlayInterval);
    filmstripPlayInterval = null;
  }

  const playPauseLabel = document.getElementById("play-pause-label");
  const playPauseIcon = document.getElementById("play-pause-icon");

  if (playPauseLabel) playPauseLabel.textContent = "Play";
  if (playPauseIcon) {
    playPauseIcon.innerHTML = `<path d="M8 5v14l11-7z" />`;
  }
}

function updateFilmstripSpeed(val) {
  filmstripPlaybackSpeed = parseFloat(val);
  const speedVal = document.getElementById("speed-val");
  if (speedVal) speedVal.textContent = filmstripPlaybackSpeed.toFixed(1);

  if (filmstripPlayInterval) {
    stopFilmstripPlayback();
    startFilmstripPlayback();
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById("btn-mic-input");

  if (!SpeechRecognition) {
    console.log("[SignAI] Web Speech recognition is not supported in this browser environment.");
    if (micBtn) micBtn.style.display = "none";
    return;
  }

  if (micBtn) micBtn.style.display = "flex";

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("recording");
    micBtn.title = "Listening... Click to stop";
    showToast("🎙️ Speech Recognition active...");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("recording");
    micBtn.title = "Voice input [Speech Recognition]";
  };

  recognition.onerror = (e) => {
    console.error("[SpeechRecognition Error]:", e.error);
    showToast(`❌ Speech Recognition error: ${e.error}`);
    isListening = false;
    micBtn.classList.remove("recording");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById("reverse-text-input");
    if (input) {
      input.value = transcript;
      translateTextToSign();
    }
  };
}

function toggleMicInput() {
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

// ─────────────────────────────────────────────────────────────
// QUICK PHRASES POPULATION
// ─────────────────────────────────────────────────────────────
function initQuickPhrases() {
  const container = document.getElementById("quick-phrases-row");
  if (!container) return;

  const phrases = [
    { label: "🆘 Help", text: "I need help" },
    { label: "🩺 Doctor", text: "Call a doctor" },
    { label: "🙏 Thank You", text: "Thank you" },
    { label: "👍 Yes", text: "Yes" },
    { label: "👎 No", text: "No" },
    { label: "⏳ Wait", text: "Please wait" }
  ];

  container.innerHTML = "";
  phrases.forEach(phrase => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-phrase";
    btn.textContent = phrase.label;
    btn.title = `Speak: "${phrase.text}"`;
    btn.onclick = () => speakText(phrase.text);
    container.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────────────────
// MODE CONTROLLER FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function changeAppMode(mode) {
  try {
    const res = await fetch("/set_app_mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode })
    });
    const data = await res.json();
    
    if (data.status === "success") {
      updateAppModeUI(mode);
      showToast(`🚀 Switch to ${mode === 'solo' ? 'Solo Practice' : 'Conversation Mode'}`);
      
      // If entering conversation mode, default to whole-word sign recognition
      if (mode === "conversation") {
        changeRecMode("word");
      }
    }
  } catch (err) {
    console.error("[changeAppMode] Error:", err);
    showToast("❌ Failed to change app mode");
  }
}

async function changeRecMode(mode) {
  try {
    const res = await fetch("/set_mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode })
    });
    const data = await res.json();
    
    if (data.status === "success") {
      updateRecModeUI(mode);
      showToast(`⚡ Recognition mode: ${mode === 'word' ? 'Word Signs' : 'Fingerspelling'}`);
    }
  } catch (err) {
    console.error("[changeRecMode] Error:", err);
    showToast("❌ Failed to change recognition mode");
  }
}

function updateModeToggles(recMode, appMode) {
  // Sync Recognition Mode button classes
  if (recMode === "word") {
    elBtnRecSpell.classList.remove("active");
    elBtnRecWord.classList.add("active");
    elBtnRecSpell.setAttribute("aria-checked", "false");
    elBtnRecWord.setAttribute("aria-checked", "true");
    
    elRadialProgress.style.display = "none";
    elWordSignDisplay.style.display = "flex";
    if (elGestureCardHeading) elGestureCardHeading.textContent = "Detected Word Sign";
  } else {
    elBtnRecSpell.classList.add("active");
    elBtnRecWord.classList.remove("active");
    elBtnRecSpell.setAttribute("aria-checked", "true");
    elBtnRecWord.setAttribute("aria-checked", "false");
    
    elRadialProgress.style.display = "flex";
    elWordSignDisplay.style.display = "none";
    if (elGestureCardHeading) elGestureCardHeading.textContent = "Current Gesture";
  }

  // Sync App Mode button classes
  if (appMode === "conversation") {
    elBtnAppSolo.classList.remove("active");
    elBtnAppConv.classList.add("active");
    elBtnAppSolo.setAttribute("aria-checked", "false");
    elBtnAppConv.setAttribute("aria-checked", "true");
    
    updateAppModeUI("conversation");
  } else {
    elBtnAppSolo.classList.add("active");
    elBtnAppConv.classList.remove("active");
    elBtnAppSolo.setAttribute("aria-checked", "true");
    elBtnAppConv.setAttribute("aria-checked", "false");
    
    updateAppModeUI("solo");
  }
}

function updateAppModeUI(mode) {
  const mainLayout = document.getElementById("translation-app");
  
  if (mode === "conversation") {
    mainLayout.classList.add("conversation-layout-active");
    
    elSoloInfoPanel.style.display = "none";
    elReverseTranslationCard.style.display = "none";
    elConvPanel.style.display = "flex";
    
    const elSignerOutputCard = document.getElementById("signer-output-card");
    if (elSignerOutputCard) elSignerOutputCard.style.display = "block";
    
    // Check first-use explainer tooltip
    const dismissed = localStorage.getItem("dismissedConvTooltip");
    if (!dismissed) {
      document.getElementById("conv-explainer-tooltip").style.display = "block";
    }
    
    // Start polling transcript if not already
    if (!conversationPollInterval) {
      conversationPollInterval = setInterval(pollConversationTranscript, 1000);
      pollConversationTranscript();
    }
  } else {
    mainLayout.classList.remove("conversation-layout-active");
    
    elSoloInfoPanel.style.display = "flex";
    elReverseTranslationCard.style.display = "block";
    elConvPanel.style.display = "none";
    
    const elSignerOutputCard = document.getElementById("signer-output-card");
    if (elSignerOutputCard) elSignerOutputCard.style.display = "none";
    
    document.getElementById("conv-explainer-tooltip").style.display = "none";
    
    // Stop transcript polling
    if (conversationPollInterval) {
      clearInterval(conversationPollInterval);
      conversationPollInterval = null;
    }
  }
}

function updateRecModeUI(mode) {
  if (mode === "word") {
    elRadialProgress.style.display = "none";
    elWordSignDisplay.style.display = "flex";
    if (elGestureCardHeading) elGestureCardHeading.textContent = "Detected Word Sign";
  } else {
    elRadialProgress.style.display = "flex";
    elWordSignDisplay.style.display = "none";
    if (elGestureCardHeading) elGestureCardHeading.textContent = "Current Gesture";
  }
}

function dismissConvTooltip() {
  localStorage.setItem("dismissedConvTooltip", "true");
  document.getElementById("conv-explainer-tooltip").style.display = "none";
}

/**
 * Update the word sign display and confidence bar indicator.
 */
function updateWordSignDisplay(wordSign, confidence) {
  const displayVal = wordSign || "—";
  
  if (elWordSignChar.textContent !== displayVal) {
    elWordSignChar.textContent = displayVal;
    
    // Animation trigger
    elWordSignChar.classList.remove("letter-pop");
    void elWordSignChar.offsetWidth;
    elWordSignChar.classList.add("letter-pop");
  }

  const pct = Math.round(confidence * 100);
  elWordConfidenceBar.style.width = `${pct}%`;
  elWordConfidencePct.textContent = `${pct}% Confidence`;

  if (wordSign) {
    elProgressLbl.textContent = `Sign: "${wordSign}" — ${pct}% confidence`;
  } else {
    elProgressLbl.textContent = "Hold a sign to confirm";
  }
}

// ─────────────────────────────────────────────────────────────
// CONVERSATION MODE HANDLERS
// ─────────────────────────────────────────────────────────────

async function sendConversationReply(event, customText = null) {
  if (event) event.preventDefault();
  
  const input = document.getElementById("conversation-reply-input");
  const replyText = customText ? customText.trim() : (input ? input.value.trim() : "");
  if (!replyText) return;

  try {
    const res = await fetch("/conversation/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: replyText, sender: "other" })
    });
    
    if (res.ok) {
      input.value = "";
      
      // Auto speak if checked
      const speakEnable = document.getElementById("conv-tts-enable").checked;
      if (speakEnable) {
        speakText(replyText);
      }
      
      pollConversationTranscript();
    }
  } catch (err) {
    console.error("[sendConversationReply] Error:", err);
    showToast("❌ Failed to send reply");
  }
}

async function pollConversationTranscript() {
  try {
    const res = await fetch("/conversation/transcript");
    const transcript = await res.json();
    
    if (transcript.length !== convLastTranscriptLen) {
      convLastTranscriptLen = transcript.length;
      renderConversationTranscript(transcript);
    }
  } catch (err) {
    console.warn("[pollConversationTranscript] Error:", err);
  }
}

function renderConversationTranscript(transcript) {
  const windowEl = document.getElementById("chat-log-window");
  if (!windowEl) return;
  
  windowEl.innerHTML = "";
  
  if (transcript.length === 0) {
    windowEl.innerHTML = `
      <div class="chat-placeholder" id="chat-placeholder">
        <p>No messages yet. Sign with your camera or reply below to start the conversation.</p>
      </div>
    `;
    return;
  }
  
  transcript.forEach(msg => {
    const bubble = document.createElement("div");
    // Style differently based on sender
    const isSigner = msg.sender === "signer";
    bubble.className = `chat-bubble ${isSigner ? 'conv-signer' : 'conv-other'}`;
    
    const textP = document.createElement("p");
    textP.className = "chat-msg-text";
    textP.textContent = msg.text;
    bubble.appendChild(textP);
    
    const tsSpan = document.createElement("span");
    tsSpan.className = "chat-msg-time";
    tsSpan.textContent = msg.timestamp;
    bubble.appendChild(tsSpan);
    
    windowEl.appendChild(bubble);
  });
  
  // Auto scroll to bottom
  windowEl.scrollTop = windowEl.scrollHeight;
}

async function clearConversationTranscript() {
  try {
    const res = await fetch("/conversation/clear", { method: "POST" });
    if (res.ok) {
      showToast("🗑 Transcript cleared");
      convLastTranscriptLen = 0;
      renderConversationTranscript([]);
    }
  } catch (err) {
    console.error("[clearConversationTranscript] Error:", err);
  }
}

function initConvQuickReplies() {
  const container = document.getElementById("conv-quick-replies");
  if (!container) return;

  const quickReplies = [
    "Yes", "No", "Thank you", "OK", "Please wait", "Understood", "Hello"
  ];

  container.innerHTML = "";
  quickReplies.forEach(text => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-phrase";
    btn.textContent = text;
    btn.title = `Send response: "${text}"`;
    btn.onclick = () => {
      document.getElementById("conversation-reply-input").value = text;
      sendConversationReply();
    };
    container.appendChild(btn);
  });
}

function initConvSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById("btn-conv-mic");

  if (!SpeechRecognition) {
    console.log("[SignAI] Web Speech recognition is not supported for Conversation Mode in this browser.");
    if (micBtn) micBtn.style.display = "none";
    return;
  }

  if (micBtn) micBtn.style.display = "flex";

  convRecognition = new SpeechRecognition();
  convRecognition.continuous = false;
  convRecognition.lang = "en-US";
  convRecognition.interimResults = false;

  convRecognition.onstart = () => {
    convListening = true;
    micBtn.classList.add("recording");
    micBtn.title = "Listening... Click to stop";
    showToast("🎙️ Speech Recognition active...");
  };

  convRecognition.onend = () => {
    convListening = false;
    micBtn.classList.remove("recording");
    micBtn.title = "Voice input [Speech Recognition]";
  };

  convRecognition.onerror = (e) => {
    console.error("[ConvSpeechRecognition Error]:", e.error);
    showToast(`❌ Speech Recognition error: ${e.error}`);
    convListening = false;
    micBtn.classList.remove("recording");
  };

  convRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById("conversation-reply-input");
    if (input) {
      input.value = transcript;
      sendConversationReply();
    }
  };
}

function toggleConvMic() {
  if (!convRecognition) return;

  if (convListening) {
    convRecognition.stop();
  } else {
    convRecognition.start();
  }
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
      e.preventDefault();
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
  initSpeechRecognition();
  initQuickPhrases();
  initConvSpeechRecognition();
  initConvQuickReplies();
  console.log("[SignAI] App ready. Upgrade functional interface loaded.");
});
