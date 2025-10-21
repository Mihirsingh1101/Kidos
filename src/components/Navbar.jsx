import React from 'react';
import { Sun, User } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-white/60 backdrop-blur sticky top-0 z-30 border-b border-gray-100">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
            ML
          </div>
          <div>
            <div className="text-sm text-gray-500">Multimodal</div>
            <div className="text-gray-800 font-semibold">Learning Monitor</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-md flex items-center gap-2 text-sm">
            <Sun size={16} /> Theme
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} /> Admin
          </div>
        </div>
      </div>
    </header>
  );
}
