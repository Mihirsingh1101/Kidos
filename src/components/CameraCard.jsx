// --- START OF FILE CameraCard.jsx (Futuristic Look & Video/File Input) ---
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { predictFile } from '../api';
import { motion } from 'framer-motion';
import { Video, VideoOff, Upload, Play, Camera, StopCircle } from 'lucide-react';

// Added latestPrediction and displayName props for dynamic UI
export default function CameraCard({ modelName, onPrediction, latestPrediction, displayName }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [pred, setPred] = useState(null); 
  const [status, setStatus] = useState('Select Video or Start Camera');
  const [sending, setSending] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoSource, setVideoSource] = useState('camera'); // 'camera' or 'file'
  const [videoFile, setVideoFile] = useState(null);

  // --- Utility Functions ---
  const stopStream = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setStatus('Analysis Stopped');
    if (videoRef.current) videoRef.current.pause();
  }, []);

  const startCamera = useCallback(async () => {
    stopStream(); 
    setStatus('Starting Camera...');
    setVideoSource('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraOn(true);
      setStatus('LIVE FEED | Analyzing');
    } catch (e) {
      console.error("Camera error:", e);
      setStatus('Camera Permission Denied');
      setIsCameraOn(false);
    }
  }, [stopStream]);

  const startVideoFile = useCallback(async (file) => {
    stopStream();
    setVideoSource('file');
    setVideoFile(file);
    const videoURL = URL.createObjectURL(file);
    videoRef.current.srcObject = null; // Clear camera stream
    videoRef.current.src = videoURL;
    videoRef.current.loop = true; // Loop the video for continuous analysis
    await videoRef.current.play();
    setIsCameraOn(true);
    setStatus(`FILE LOADED | Analyzing ${file.name}`);
  }, [stopStream]);

  // --- Initial Mount / Unmount Cleanup ---
  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  // --- Prediction Polling Logic ---
  useEffect(() => {
    let id;
    if (isCameraOn) {
      id = setInterval(captureAndSend, 1000); 
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [isCameraOn, modelName, onPrediction]); 

  // --- Capture and Send Function ---
  async function captureAndSend() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || sending || !isCameraOn || v.paused) return;
    
    // Canvas drawing logic (224x224 crop)
    c.width = 224; c.height = 224;
    const [vw, vh] = [v.videoWidth, v.videoHeight];
    const aspect = vw / vh;
    const [dw, dh] = aspect > 1 ? [c.height * aspect, c.height] : [c.width, c.width / aspect];
    const [dx, dy] = [c.width / 2 - dw / 2, c.height / 2 - dh / 2];

    c.getContext('2d').drawImage(v, dx, dy, dw, dh);

    setSending(true);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
    
    try {
      const r = await predictFile(modelName, blob); 
      setPred(r);
      if (onPrediction) onPrediction(r);
    } catch (e) {
      // Keep running but show error
      console.error("API Error in captureAndSend:", e.response?.data?.detail || e.message);
    } finally {
      setSending(false);
    }
  }
  
  // --- RENDERING LOGIC ---
  const pEng = latestPrediction?.confidence || pred?.confidence || null; 
  const pEngPercent = pEng ? (pEng * 100).toFixed(0) : '—';
  const label = latestPrediction?.label || pred?.label || 'UNKNOWN';
  
  const barColor = label === 'engaged' 
    ? 'bg-emerald-500' 
    : label === 'not_engaged' ? 'bg-orange-500' : 'bg-gray-500';

  const cameraButtonText = isCameraOn ? 'Stop Analysis' : videoSource === 'file' ? 'Start File' : 'Start Camera';
  const CameraIcon = isCameraOn ? StopCircle : (videoSource === 'file' ? Play : Camera);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">{displayName}</h3>
        <p className={`text-sm font-medium ${isCameraOn ? 'text-emerald-400' : 'text-gray-400'}`}>{status}</p>
      </div>

      {/* Video Feed and Controls */}
      <div className="relative w-full aspect-video rounded-lg bg-gray-900/90 overflow-hidden shadow-xl mb-4">
        {/* Actual Video Element */}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover rounded-lg"
          style={{ display: isCameraOn ? 'block' : 'none' }}
          muted playsInline
        />
        {/* Placeholder when camera is off */}
        {!isCameraOn && (
            <div className="h-full flex items-center justify-center flex-col text-indigo-400 space-y-4">
                <VideoOff size={48} />
                <p className="text-lg">{status}</p>
            </div>
        )}
      </div>
      
      {/* BUTTON BAR */}
      <div className='flex gap-4 justify-center pb-4 border-b border-indigo-700/50'>
        {/* Main ON/OFF Toggle */}
        <button 
          onClick={isCameraOn ? stopStream : startCamera}
          className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors shadow-lg ${
            isCameraOn 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <CameraIcon size={18} />
          {isCameraOn ? 'STOP ANALYSIS' : 'START CAMERA'}
        </button>

        {/* File Input */}
        <input type="file" ref={fileInputRef} onChange={(e) => startVideoFile(e.target.files[0])} accept="video/*" style={{ display: 'none' }} />
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg"
          title="Upload video file for analysis"
        >
          <Upload size={18} /> Load Video File
        </button>
      </div>


      {/* Engagement Probability Bar */}
      <div className="mt-6">
        <div className="text-sm font-medium text-indigo-300 mb-2">
          {`Engagement Level: ${label.toUpperCase()}`}
        </div>
        <div className="bg-gray-700 h-4 rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pEng ? pEng * 100 : 0}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${barColor} transition-all duration-500`} 
          ></motion.div>
        </div>
        <div className="text-right text-sm mt-2 font-bold text-white">
          {`${pEngPercent}${pEng !== null ? '%' : ''} Confidence`}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </motion.section>
  );
}
// --- END OF FILE CameraCard.jsx ---