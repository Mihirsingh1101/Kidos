// --- START OF FILE api.js (Updated) ---
import axios from "axios";
const API = process.env.REACT_APP_API || "http://localhost:8000";

// --- EXISTING: Facial Engagement Prediction ---
export async function predictFile(modelName, fileBlob) {
  const form = new FormData();
  form.append("file", fileBlob, "capture.jpg");
  const res = await axios.post(`${API}/predict/${modelName}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// --- NEW: Audio Transcription/Translation (for SpeechAnalysis.jsx) ---
export async function transcribeAudio(audioBlob) {
  const form = new FormData();
  // Key 'file' must match the parameter in asr_router.py
  form.append("file", audioBlob, "recording.wav"); 
  const res = await axios.post(`${API}/asr/transcribe`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // Returns {transcript: "...", language: "..."}
  return res.data;
}

// --- NEW: Trigger Topic Analysis (for TopicCard.jsx) ---
export async function triggerTopicAnalysis() {
  // We use POST even if no body is sent because it triggers a server-side process
  const res = await axios.post(`${API}/analyze/topics`);
  // Returns {total_doubts: 5, topics: {...}, flagged_topics: [...]}
  return res.data;
}

// --- REMOVED: analyzeTextTopic is now handled by the backend's /analyze/topics endpoint. ---

// --- Optional: Health Check ---
export async function getHealthStatus() {
    const res = await axios.get(`${API}/health`);
    return res.data;
}
// --- END OF FILE api.js (Updated) ---