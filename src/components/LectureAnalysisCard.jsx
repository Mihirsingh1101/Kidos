// --- START OF FILE LectureAnalysisCard.jsx (Futuristic Look) ---
import React, { useState, useRef } from 'react';
import { analyzeLecture } from '../api';
import { Upload, Clock, AlertTriangle, FileText } from 'lucide-react';

export default function LectureAnalysisCard({ latestTranscript }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select a lecture transcript file.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeLecture(selectedFile);
      setAnalysisResult(result);

    } catch (e) {
      console.error("Lecture Analysis Error:", e);
      setError(e.response?.data?.detail || "Analysis failed. Check backend logs for full traceback.");
    } finally {
      setLoading(false);
    }
  };

  const getAlertClass = (count) => {
    if (count >= 5) return "bg-red-800/40 border-red-500 text-red-300";
    if (count >= 3) return "bg-orange-800/40 border-orange-500 text-orange-300";
    return "bg-yellow-800/40 border-yellow-500 text-yellow-300";
  };
  
  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <AlertTriangle size={20} className="text-red-500"/> Teacher Analysis: Confusing Segments
      </h3>

      {/* Latest Doubt Display */}
      <div className="text-sm text-indigo-300 mb-4 flex items-center gap-2 border-b border-indigo-700/50 pb-2">
        <FileText size={16} /> Last Doubt Recorded: 
        <span className="font-semibold text-white">{latestTranscript || 'N/A'}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* File Input Area */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt"
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-4 py-2 bg-indigo-700/50 text-white rounded-full text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg"
        >
          <Upload size={16} /> 
          {selectedFile ? selectedFile.name : 'Select Lecture Transcript'}
        </button>

        {/* Analyze Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedFile}
          className={`px-6 py-2 rounded-full text-sm font-bold transition shadow-lg ${
            loading || !selectedFile
              ? 'bg-gray-600 text-gray-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {loading ? 'ANALYZING...' : 'RUN FULL ANALYSIS'}
        </button>
      </div>

      {/* ERROR / RESULTS DISPLAY */}
      <div className="mt-4 flex-grow custom-scroll">
        {error && <div className="text-red-300 bg-red-900/50 p-3 rounded border border-red-600 mb-4">{error}</div>}
        {loading && <p className="text-center text-indigo-400">Processing complex analysis...</p>}

        {analysisResult && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-indigo-300 flex items-center gap-2">
              <Clock size={16} /> Total Lecture Duration: {analysisResult.total_lecture_duration}
            </p>
            
            <h4 className="text-lg font-bold border-b border-indigo-700 pb-1 text-white">
              Flagged Confusion Segments ({analysisResult.flagged_chunks.length} Found):
            </h4>
            
            {analysisResult.flagged_chunks.length === 0 ? (
              <p className="text-emerald-400 font-medium">No segments met the confusion threshold. Great job!</p>
            ) : (
              <div className="space-y-3">
                {analysisResult.flagged_chunks.map((chunk, index) => (
                  <div key={index} className={`p-3 border-l-4 ${getAlertClass(chunk.num_doubts)} rounded-md shadow-md`}>
                    <p className="font-bold text-base text-white">
                      {chunk.start_time} - {chunk.end_time} 
                      <span className="text-xs font-normal ml-2 text-indigo-300"> (Chunk {chunk.chunk_id})</span>
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Doubts Mapped: {chunk.num_doubts} | Avg. Sim: {chunk.avg_similarity}
                    </p>
                    <p className="text-xs text-indigo-200 mt-1">
                      Keywords: {chunk.keywords.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// --- END OF FILE LectureAnalysisCard.jsx (Futuristic Look) ---