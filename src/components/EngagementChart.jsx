// --- START OF FILE EngagementChart.jsx (Futuristic Look) ---
import React from 'react';
import { motion } from 'framer-motion';

export default function EngagementChart({ title, trendData }) {
  const bars = trendData.map(d => d.confidence); 
  
  if (bars.length === 0) {
      return (
          <div className="card h-48 flex flex-col justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-4 text-center text-indigo-400 flex-grow flex items-center justify-center">
                  Start camera to begin real-time trend monitoring.
              </p>
          </div>
      );
  }
  
  return (
    <div className="card h-48 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-sm text-emerald-400">LIVE</span>
      </div>
      <div className="mt-4 flex items-end gap-2 h-full py-2">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${b * 100}%` }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
            className="flex-1 rounded-sm shadow-lg"
            style={{ 
              background: `linear-gradient(to top, #4f46e5 ${b * 50}%, #10b981 ${b * 100}%)`,
              minWidth: '5px' 
            }}
          />
        ))}
      </div>
    </div>
  );
}
// --- END OF FILE EngagementChart.jsx ---