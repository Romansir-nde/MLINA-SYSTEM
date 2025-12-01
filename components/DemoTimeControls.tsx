import React from 'react';
import { Clock } from 'lucide-react';

interface Props {
  currentTime: Date;
  onTimeChange: (date: Date) => void;
}

export const DemoTimeControls: React.FC<Props> = ({ currentTime, onTimeChange }) => {
  const setTime = (hours: number, minutes: number) => {
    const newDate = new Date(currentTime);
    newDate.setHours(hours, minutes, 0, 0);
    onTimeChange(newDate);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-xl border border-slate-200 z-50 text-xs w-64">
      <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold">
        <Clock size={16} />
        <span>Demo: Time Travel</span>
      </div>
      <p className="mb-2 text-slate-500">Simulate specific times to test window restrictions.</p>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => setTime(7, 30)} 
          className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-center"
        >
          Teacher (7:30 AM)
        </button>
        <button 
          onClick={() => setTime(13, 0)} 
          className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-center"
        >
          Half Day (1:00 PM)
        </button>
        <button 
          onClick={() => setTime(16, 15)} 
          className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-center"
        >
          Full Day (4:15 PM)
        </button>
        <button 
          onClick={() => setTime(20, 0)} 
          className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-center"
        >
          Closed (8:00 PM)
        </button>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 text-center text-slate-400">
        Current: {currentTime.toLocaleTimeString()}
      </div>
    </div>
  );
};
