// --- START OF FILE Navbar.jsx (Futuristic Look) ---
import React from 'react';
import { Cpu, User } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-gray-900/90 backdrop-blur sticky top-0 z-30 border-b border-indigo-700/50 shadow-lg">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
            ML
          </div>
          <div>
            <div className="text-sm text-indigo-300">Multimodal Assistant</div>
            <div className="text-white font-semibold text-lg">Learning Monitor</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-indigo-300">
          <div className="flex items-center gap-2 text-sm">
            <Cpu size={18} className="text-emerald-400" /> System Status: Online
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={18} /> Teacher Admin
          </div>
        </div>
      </div>
    </header>
  );
}
// --- END OF FILE Navbar.jsx ---