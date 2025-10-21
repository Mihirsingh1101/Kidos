// --- START OF FILE CameraCard.jsx (With Toggle Button) ---

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { predictFile } from '../api';
import { motion } from 'framer-motion';
import { Video, VideoOff } from 'lucide-react'; // Import icons for the button

export default function CameraCard({ modelName, onPrediction, displayName = "Facial Engagement" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [pred, setPred] = useState(null); 
  const [status, setStatus] = useState('Initializing...');
  const [sending, setSending] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false); // NEW: State to control camera

  // --- Core Camera/Stream Management Logic ---
  const startCamera = useCallback(async () => {
    if (isCameraOn) return; // Prevent double start
    setStatus('Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
        setStatus('Camera ON');
      }
    } catch (e) {
      console.error("Camera error:", e);
      setStatus('Camera permission denied or device error');
      setIsCameraOn(false);
    }
  }, [isCameraOn]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      // Stop all tracks (video, audio) in the stream
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setStatus('Camera OFF');
  }, []);

  // --- Initial Mount / Unmount Cleanup ---
  useEffect(() => {
    // Start camera immediately on mount (you can change this to start on button press)
    // For now, let's keep it OFF by default and require a button press.
    // startCamera(); // <-- Commented out to start OFF
    setStatus('Camera is OFF. Click to start.');
    
    // Cleanup function runs on unmount
    return () => {
      stopCamera();
    };
  }, []); // Run only once on mount

  // --- Prediction Polling Logic ---
  useEffect(() => {
    let id;
    if (isCameraOn) {
      // Start polling only if the camera is ON
      id = setInterval(captureAndSend, 1000); 
    }
    // Cleanup function stops the interval when isCameraOn is false or component unmounts
    return () => {
      if (id) clearInterval(id);
    };
  }, [isCameraOn, modelName, onPrediction]); // Re-run effect when camera state changes

  // --- Toggle Handler ---
  const handleToggle = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // --- Capture and Send Function ---
  async function captureAndSend() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || sending || !isCameraOn) return; // Added !isCameraOn check
    
    // ... (Canvas drawing logic remains the same)
    c.width = 224;
    c.height = 224;
    const aspect = v.videoWidth / v.videoHeight;
    const drawWidth = c.height * aspect;
    const drawX = (c.width - drawWidth) / 2;
    c.getContext('2d').drawImage(v, 0, 0, v.videoWidth, v.videoHeight, drawX, 0, drawWidth, c.height);

    setSending(true);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.7));
    
    try {
      const r = await predictFile(modelName, blob); 
      setPred(r);
      if (onPrediction) {
          onPrediction(r);
      }
    } catch (e) {
      console.error("API Error in captureAndSend:", e);
      setStatus('Prediction failed'); 
    } finally {
      setSending(false);
    }
  }

  // --- Rendering Logic ---
  const pEng = pred ? pred.confidence : null; 
  const pEngPercent = pEng ? (pEng * 100).toFixed(0) : '—';
  const label = pred?.label || '...';
  
  const barColor = label === 'engaged' 
    ? 'from-green-400 to-emerald-500' 
    : 'from-orange-400 to-red-500';

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{displayName}</h3>
        <button 
          onClick={handleToggle}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
            isCameraOn 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isCameraOn ? <VideoOff size={16} /> : <Video size={16} />}
          {isCameraOn ? 'Camera OFF' : 'Camera ON'}
        </button>
      </div>
      
      {/* Status Bar */}
      <p className="text-sm text-gray-600 mb-3">{sending ? 'Sending...' : status}</p>

      {/* Video Feed */}
      {/* Conditional rendering: show video if on, or a placeholder if off */}
      <div className={`w-full rounded-lg ${isCameraOn ? 'bg-black' : 'bg-gray-800'}`}>
        <video 
          ref={videoRef} 
          className={`w-full rounded-lg ${isCameraOn ? 'opacity-100' : 'opacity-0 h-0'}`} 
          style={{ minHeight: isCameraOn ? '300px' : '0px' }}
          muted 
        />
        {/* Placeholder when camera is off */}
        {!isCameraOn && (
            <div className="h-48 flex items-center justify-center text-white">
                <VideoOff size={32} className="mr-2" /> Camera is Off
            </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-sm text-gray-500">{`Engagement Probability (${label.toUpperCase()})`}</div>
        <div className="mt-2 bg-gray-200 h-3 rounded overflow-hidden">
          <div
            style={{ width: `${pEng ? pEng * 100 : 0}%` }}
            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500`} 
          ></div>
        </div>
        <div className="text-right text-sm mt-1 font-medium">
          {`${pEngPercent}${pEng !== null ? '%' : ''}`}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </motion.section>
  );
}
// --- END OF FILE CameraCard.jsx ---