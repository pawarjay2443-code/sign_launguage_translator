import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { recognizeLandmarks } from '../lib/api';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17]             // Palm / Knuckles
];

export const useMediaPipe = (videoRef, canvasRef, isActive, onRecognitionUpdate) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const [handState, setHandState] = useState({ left: false, right: false });
  const [confidence, setConfidence] = useState(0);
  
  const landmarkerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const isProcessingRef = useRef(false);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let mounted = true;
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        if (mounted) {
          landmarkerRef.current = landmarker;
          setIsLoaded(true);
          console.log("[useMediaPipe] HandLandmarker loaded successfully");
        }
      } catch (err) {
        console.error("[useMediaPipe] Error initializing HandLandmarker:", err);
      }
    };

    initMediaPipe();

    return () => {
      mounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // Draw overlay skeleton on canvas
  const drawLandmarks = useCallback((ctx, landmarksList, handednessList) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!landmarksList || landmarksList.length === 0) return;

    landmarksList.forEach((landmarks, index) => {
      const handedness = handednessList[index] ? handednessList[index][0].categoryName : 'Unknown';
      const color = handedness === 'Left' ? '#06B6D4' : '#3B82F6'; // Cyan for Left, Blue for Right

      // Draw Connections
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
          ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
          ctx.stroke();
        }
      });

      // Draw Dots
      landmarks.forEach((lm) => {
        ctx.beginPath();
        ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
      });
    });
  }, []);

  // Frame detection & API Loop (~15 FPS target)
  const processFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !landmarkerRef.current) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    
    // Throttle frame processing to roughly ~15 FPS (66ms interval)
    if (now - lastTimeRef.current >= 65) {
      lastTimeRef.current = now;
      frameCountRef.current += 1;

      // Calculate FPS
      if (now - lastFpsUpdateRef.current >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));
        setFps(currentFps);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      if (canvasRef.current) {
        if (canvasRef.current.width !== video.videoWidth || canvasRef.current.height !== video.videoHeight) {
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
        }
      }

      try {
        const result = landmarkerRef.current.detectForVideo(video, now);
        
        let leftHandPoints = null;
        let rightHandPoints = null;
        let hasLeft = false;
        let hasRight = false;

        if (result.landmarks && result.landmarks.length > 0) {
          result.landmarks.forEach((handLandmarks, idx) => {
            const label = result.handedness[idx] ? result.handedness[idx][0].categoryName : 'Right';
            const formattedHand = handLandmarks.map(lm => [lm.x, lm.y, lm.z]);

            if (label === 'Left') {
              leftHandPoints = formattedHand;
              hasLeft = true;
            } else {
              rightHandPoints = formattedHand;
              hasRight = true;
            }
          });

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            drawLandmarks(ctx, result.landmarks, result.handedness);
          }
        } else {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          }
        }

        setHandState({ left: hasLeft, right: hasRight });

        // Trigger API post if not currently awaiting response
        if (!isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            const res = await recognizeLandmarks({
              left_hand: leftHandPoints,
              right_hand: rightHandPoints,
              fps: fps,
              face_visible: true,
            });

            if (res && res.confidence !== undefined) {
              setConfidence(Math.round(res.confidence * 100));
            }
            if (onRecognitionUpdate) {
              onRecognitionUpdate(res);
            }
          } catch (apiErr) {
            console.error("[useMediaPipe] API recognize error:", apiErr);
          } finally {
            isProcessingRef.current = false;
          }
        }

      } catch (err) {
        console.error("[useMediaPipe] Processing error:", err);
      }
    }

    if (isActive) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [isActive, videoRef, canvasRef, drawLandmarks, fps, onRecognitionUpdate]);

  useEffect(() => {
    if (isActive && isLoaded) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    } else {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isActive, isLoaded, processFrame]);

  return {
    isLoaded,
    fps,
    handState,
    confidence,
  };
};

export default useMediaPipe;
