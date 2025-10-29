// --- START OF FILE SpeechAnalysis.jsx (Futuristic Look) ---
import React, { useRef, useState, useCallback } from 'react';
import { transcribeAudio } from '../api';
import { Mic, Zap, AlertCircle } from 'lucide-react'; 

const RECORDING_DURATION_MS = 20000; 

export default function SpeechAnalysis({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('Ready to record doubt');
  const [transcript, setTranscript] = useState(''); // Added local transcript state
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startListening = useCallback(async () => {
    // ... (omitted same logic)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setTranscript(''); // Clear old transcript on start

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setStatus('Processing audio: Sending to Whisper ASR...');
        setListening(false);
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        try {
          const result = await transcribeAudio(audioBlob);
          const newTranscript = result.transcript;

          setStatus('Doubt translated and saved to JSON!');
          setTranscript(newTranscript);
          
          onTranscript(newTranscript); // Update parent state

        } catch (e) {
          console.error("ASR Transcription Error:", e);
          const detail = e.response?.data?.detail || 'Network Error/FFmpeg Issue';
          setStatus(`FAILURE: ${detail}`);
          onTranscript('');
        }
      };

      mediaRecorderRef.current.start();
      setListening(true);
      setStatus(`Recording... Max ${RECORDING_DURATION_MS / 1000}s`);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, RECORDING_DURATION_MS);

    } catch (e) {
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap size={18} className="text-yellow-400"/> Doubt Recorder (Hinglish ASR)
        </h3>
        <button
          onClick={toggle}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition ${
            listening
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Mic size={16} />
          {listening ? 'STOP & SAVE' : 'RECORD DOUBT'}
        </button>
      </div>

      <div className="bg-gray-900/50 p-3 rounded border border-indigo-700/50">
        <div className="text-sm text-indigo-400 flex items-center gap-2">
            <AlertCircle size={14}/> Current Status:
        </div>
        <div className="mt-2 text-white font-medium min-h-[40px]">{status}</div>
      </div>
      <div className="mt-3">
        <div className="text-sm text-indigo-400">Last Translated Transcript:</div>
        <div className="text-white font-bold mt-1 min-h-[30px]">{transcript || '— Awaiting recording —'}</div>
      </div>
    </div>
  );
}
// --- END OF FILE SpeechAnalysis.jsx ---