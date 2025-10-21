// --- START OF FILE SpeechAnalysis.jsx (Rewritten for Backend ASR) ---
import React, { useRef, useState, useCallback } from 'react';
import { transcribeAudio } from '../api';
// --- The Correct Import ---
import { Mic } from 'lucide-react';

const RECORDING_DURATION_MS = 10000; // 10 seconds max recording

export default function SpeechAnalysis({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('Ready to record doubt');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setStatus('Processing audio...');
        setListening(false);
        stream.getTracks().forEach(track => track.stop()); // Stop mic access

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        try {
          // Send the audio blob to your FastAPI ASR endpoint
          const result = await transcribeAudio(audioBlob);
          setStatus('Doubt recorded and translated!');
          
          // Call parent function to update the global transcript state
          onTranscript(result.transcript); 

        } catch (e) {
          console.error("ASR Transcription Error:", e);
          setStatus('Transcription failed. Check console.');
          onTranscript(`ERROR: ${e.response?.data?.detail || 'Network Error'}`);
        }
      };

      mediaRecorderRef.current.start();
      setListening(true);
      setStatus(`Recording... Max ${RECORDING_DURATION_MS / 1000}s`);

      // Automatically stop after max duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, RECORDING_DURATION_MS);

    } catch (e) {
      console.error(e);
      setStatus('Microphone permission denied.');
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  function toggle() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Speech Analysis (Hinglish ASR)</h3>
        <button
          onClick={toggle}
          className={`px-3 py-2 rounded-md text-sm ${
            listening
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
          }`}
        >
          <Mic size={16} className="inline-block mr-1" />
          {listening ? 'STOP & ANALYZE' : 'RECORD DOUBT'}
        </button>
      </div>

      <div className="bg-gray-50 p-3 rounded border">
        <div className="text-sm text-gray-500">Status</div>
        <div className="mt-1 text-gray-800 min-h-[60px]">
          {status}
        </div>
      </div>
    </div>
  );
}
// --- END OF FILE SpeechAnalysis.jsx ---