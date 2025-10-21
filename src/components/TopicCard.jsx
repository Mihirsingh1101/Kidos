// --- START OF FILE TopicCard.jsx (Analysis Trigger) ---
import React, { useState } from 'react';
import { triggerTopicAnalysis } from '../api';

export default function TopicCard({ latestTranscript }) {
  const [topicResults, setTopicResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeTopics = async () => {
    setLoading(true);
    setError(null);
    setTopicResults(null);
    try {
      // Calls the /analyze/topics endpoint
      const results = await triggerTopicAnalysis(); 
      setTopicResults(results);
    } catch (e) {
      console.error("Topic Analysis Error:", e);
      setError(e.response?.data?.detail || "Failed to analyze topics. Check backend console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Doubt Topic Summary</h3>
        <button
          onClick={analyzeTopics}
          disabled={loading}
          className={`px-3 py-2 rounded-md text-sm font-medium ${
            loading ? 'bg-gray-300 text-gray-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Analyzing...' : 'Analyze Transcripts'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        Latest Recorded Doubt: <span className="font-medium text-gray-800">{latestTranscript || 'N/A'}</span>
      </p>
      
      <div className="p-3 bg-white border border-gray-100 rounded shadow-sm text-sm">
        {error && <p className="text-red-500">ERROR: {error}</p>}
        
        {topicResults ? (
          <div>
            <div className="mb-2">
              <span className="font-bold text-red-600">FLAGGED TOPIC (MOST DOUBTED):</span>
              <p className="text-base font-semibold">{topicResults.flagged_topics[0]}</p>
              <p className="text-xs text-gray-500">{topicResults.total_doubts} total doubts analyzed.</p>
            </div>
            <hr className="my-2"/>
            <div className="text-gray-700">
                <span className="font-bold">ALL DETECTED TOPICS:</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    {Object.entries(topicResults.topics).map(([cluster, keywords]) => (
                        <li key={cluster}>
                            <span className="font-semibold">{cluster}:</span> {keywords}
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">Click "Analyze Transcripts" to find key doubt areas.</div>
        )}
      </div>
    </div>
  );
}
// --- END OF FILE TopicCard.jsx (Analysis Trigger) ---