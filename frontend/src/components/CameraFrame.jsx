import React, { useRef } from 'react';
import { Camera, CameraOff, Video, Activity, Hand, ShieldAlert } from 'lucide-react';
import useCamera from '../hooks/useCamera';
import useMediaPipe from '../hooks/useMediaPipe';
import StatPill from './StatPill';

export const CameraFrame = ({ onRecognitionUpdate, emergencyAlert }) => {
  const canvasRef = useRef(null);
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const { isLoaded, fps, handState, confidence } = useMediaPipe(
    videoRef,
    canvasRef,
    isActive,
    onRecognitionUpdate
  );

  const hasHand = handState.left || handState.right;
  const handLabel = hasHand
    ? `${handState.left ? 'Left' : ''}${handState.left && handState.right ? ' + ' : ''}${handState.right ? 'Right' : ''}`
    : 'None';

  return (
    <div className="space-y-4">
      {/* Emergency Alert Banner if triggered */}
      {emergencyAlert && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 flex items-start gap-3 backdrop-blur-md animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm uppercase tracking-wide">
              Emergency Triggered: "{emergencyAlert.keyword}"
            </div>
            <div className="text-xs mt-1 text-rose-200/80">
              {emergencyAlert.message || 'Potential distress keyword detected in signed message.'}
            </div>
          </div>
        </div>
      )}

      {/* Main Camera Container */}
      <div className={`relative rounded-2xl overflow-hidden glass-panel ${isActive ? 'tracing-beam-card' : 'border border-slate-800'}`}>
        {/* Top Status Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatPill
              icon={Video}
              label="Camera"
              value={isActive ? 'Active' : 'Off'}
              color={isActive ? 'emerald' : 'amber'}
            />
            <StatPill
              icon={Hand}
              label="Hand"
              value={handLabel}
              color={hasHand ? 'cyan' : 'amber'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <StatPill
              icon={Activity}
              label="FPS"
              value={fps}
              color={fps > 10 ? 'emerald' : 'cyan'}
            />
            <StatPill
              label="Confidence"
              value={`${confidence}%`}
              color={confidence > 70 ? 'emerald' : 'blue'}
            />
          </div>
        </div>

        {/* Video Feed & Canvas Overlay */}
        <div className="relative w-full aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden rounded-2xl">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${isActive ? 'block' : 'hidden'}`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${isActive ? 'block' : 'hidden'}`}
          />

          {/* Fallback when Camera is Off */}
          {!isActive && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-800/80 text-cyan-400 border border-slate-700/50">
                <CameraOff className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-200 font-outfit">Camera Disconnected</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Start camera to begin real-time Indian Sign Language recognition using MediaPipe.
                </p>
              </div>
              <button
                onClick={startCamera}
                disabled={!isLoaded}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-glow transition-all active:scale-95 disabled:opacity-50"
                data-testid="start-camera-btn"
              >
                <Camera className="w-4 h-4" />
                <span>{isLoaded ? 'Start Camera' : 'Loading MediaPipe...'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Control Bar on active stream */}
        {isActive && (
          <div className="p-3 bg-slate-950/70 backdrop-blur-md border-t border-slate-800/60 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Streaming MediaPipe HandLandmarker</span>
            </div>
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
              data-testid="stop-camera-btn"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          Camera Error: {error}
        </div>
      )}
    </div>
  );
};

export default CameraFrame;
