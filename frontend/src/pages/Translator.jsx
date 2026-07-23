import React, { useState, useCallback } from 'react';
import CameraFrame from '../components/CameraFrame';
import LetterCard from '../components/LetterCard';
import SentenceBuilder from '../components/SentenceBuilder';
import ChatAssistant from '../components/ChatAssistant';

export const Translator = () => {
  const [sessionState, setSessionState] = useState({
    current_gesture: null,
    gesture_progress: 0,
    confirmation_frames: 10,
    current_word: '',
    sentence: '',
    last_added_letter: '',
    recent_detections: [],
    translated_sentences: [],
    emergency: null,
  });

  const handleRecognitionUpdate = useCallback((data) => {
    if (!data) return;
    setSessionState((prev) => ({
      ...prev,
      current_gesture: data.current_gesture,
      gesture_progress: data.gesture_progress || 0,
      confirmation_frames: data.confirmation_frames || 10,
      current_word: data.current_word || '',
      sentence: data.sentence || '',
      last_added_letter: data.last_added_letter || '',
      recent_detections: data.recent_detections || prev.recent_detections,
      translated_sentences: data.translated_sentences || prev.translated_sentences,
      emergency: data.emergency || null,
    }));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-slate-100 flex items-center gap-2">
            ISL Real-Time Translator
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 font-plex mt-1">
            Perform Indian Sign Language gestures in front of your camera to form words & sentences.
          </p>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Frame (7 cols) */}
        <div className="lg:col-span-7">
          <CameraFrame
            onRecognitionUpdate={handleRecognitionUpdate}
            emergencyAlert={sessionState.emergency}
          />
        </div>

        {/* Right Column: Active Letter & Sentence Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <LetterCard
            currentGesture={sessionState.current_gesture}
            gestureProgress={sessionState.gesture_progress}
            confirmationFrames={sessionState.confirmation_frames}
            lastAddedLetter={sessionState.last_added_letter}
          />

          <SentenceBuilder
            currentWord={sessionState.current_word}
            sentence={sessionState.sentence}
            onStateUpdate={handleRecognitionUpdate}
          />
        </div>
      </div>

      {/* Floating Chat Assistant Component */}
      <ChatAssistant
        currentWord={sessionState.current_word}
        sentence={sessionState.sentence}
        lastLetter={sessionState.last_added_letter}
      />
    </div>
  );
};

export default Translator;
