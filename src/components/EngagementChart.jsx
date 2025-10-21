// --- START OF FILE EngagementChart.jsx ---

import React from 'react';
import { motion } from 'framer-motion';

// FIX: Accept trendData prop
export default function EngagementChart({ trendData }) {
  // Use the confidence values from the live trend data
  const bars = trendData.map(d => d.confidence); 
  
  if (bars.length === 0) {
      return (
          <div className="card">
              <h3 className="text-lg font-semibold">Engagement Trend</h3>
              <p className="mt-4 text-center text-gray-500 h-28 flex items-center justify-center">
                  Awaiting first prediction...
              </p>
          </div>
      );
  }
  
  return (
    <div className="card">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Engagement Trend</h3>
        <span className="text-sm text-gray-500">Realtime</span>
      </div>
      <div className="mt-4 flex items-end gap-3 h-28">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            // FIX: Use the confidence value 'b' for the height
            animate={{ height: `${b * 100}%` }} 
            className="flex-1 bg-gradient-to-t from-indigo-400 to-emerald-400 rounded-md"
          />
        ))}
      </div>
    </div>
  );
}
// --- END OF FILE EngagementChart.jsx ---