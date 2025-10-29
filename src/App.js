// --- START OF FILE App.js (FINAL CORRECTED HUB) ---

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CameraCard from './components/CameraCard';
import EngagementChart from './components/EngagementChart';
import SpeechAnalysis from './components/SpeechAnalysis';
// CHANGE: Import the new LectureAnalysisCard (renamed from TopicCard/old analysis)
import LectureAnalysisCard from './components/LectureAnalysisCard'; 
import './index.css';

// --- CONFIGURATION ---
const MODEL_CONFIG = {
  "face_emotion": { 
    displayName: "Facial Engagement (FER-13)", 
    chartComponent: EngagementChart 
  },
};
const MAX_TREND_POINTS = 10; 

export default function App() {
  // --- New State for Speech/Topic Analysis ---
  const [latestTranscript, setLatestTranscript] = useState('');
  
  // --- Existing State for Facial Engagement ---
  const [modelTrendData, setModelTrendData] = useState(
    Object.keys(MODEL_CONFIG).reduce((acc, key) => ({ ...acc, [key]: [] }), {})
  );

  const handleNewPrediction = (modelName, prediction) => {
    if (!MODEL_CONFIG[modelName]) return; 
    
    setModelTrendData(prevData => {
        const newEntry = {
            confidence: prediction.confidence,
            timestamp: prediction.timestamp
        };
        const updatedTrend = [...prevData[modelName] || [], newEntry].slice(-MAX_TREND_POINTS); 
        return { ...prevData, [modelName]: updatedTrend };
    });
  };
  
  const mainModelName = "face_emotion"; 
  const mainModelConfig = MODEL_CONFIG[mainModelName];
  const latestPrediction = modelTrendData[mainModelName].slice(-1)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6">
          Multimodal Learning Monitor
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SIDE (2/3 width) - Camera Feed and Prediction Bar */}
          <div className="lg:col-span-2 space-y-6">
            <CameraCard 
              modelName={mainModelName} 
              displayName={mainModelConfig.displayName}
              onPrediction={(pred) => handleNewPrediction(mainModelName, pred)}
              latestPrediction={latestPrediction}
            />
            <EngagementChart 
              title={mainModelConfig.displayName + " Trend"}
              trendData={modelTrendData[mainModelName]} 
            />
          </div>

          {/* RIGHT SIDE (1/3 width) - Speech and Topic Analysis */}
          <div className="space-y-6">
            {/* Component for recording and transcribing speech */}
            <SpeechAnalysis 
                onTranscript={setLatestTranscript} // Updates the latest transcript state
            />
            {/* Component for the Teacher's Lecture Analysis */}
            <LectureAnalysisCard 
                latestTranscript={latestTranscript} // Pass the latest doubt for display
            />
          </div>
        </div>
      </main>
    </div>
  );
}
// --- END OF FILE App.js (FINAL CORRECTED HUB) ---