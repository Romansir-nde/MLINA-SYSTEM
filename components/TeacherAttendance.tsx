import React, { useState, useEffect } from 'react';
import { AttendanceRecord, User } from '../types';
import { TIME_WINDOWS } from '../constants';
import { getAttendanceForDate, saveAttendance } from '../services/storageService';
import { CheckCircle, Clock, AlertTriangle, History, Fingerprint } from 'lucide-react';

interface Props {
  user: User;
  currentTime: Date;
}

export const TeacherAttendance: React.FC<Props> = ({ user, currentTime }) => {
  const [markedToday, setMarkedToday] = useState<AttendanceRecord | null>(null);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const todayStr = currentTime.toISOString().split('T')[0];

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [startH, startM] = TIME_WINDOWS.TEACHER_SIGN_IN.start.split(':').map(Number);
  const [endH, endM] = TIME_WINDOWS.TEACHER_SIGN_IN.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isWithinWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  useEffect(() => {
    const records = getAttendanceForDate(todayStr);
    const userRecords = records.filter(r => r.entityId === user.id && r.entityType === 'TEACHER');
    // Sort by timestamp descending
    userRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setMyRecords(userRecords);
    setMarkedToday(userRecords.length > 0 ? userRecords[0] : null);
  }, [todayStr, user.id]);

  const handleSignIn = () => {
    if (!isWithinWindow) return;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      entityId: user.id,
      entityName: user.name,
      entityType: 'TEACHER',
      date: todayStr,
      status: 'PRESENT',
      timestamp: currentTime.toISOString(),
      markedBy: user.id
    };

    saveAttendance(newRecord);
    setMarkedToday(newRecord);
    setMyRecords(prev => [newRecord, ...prev]);
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
       <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 p-6 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" /> Teacher Check-In
            </h2>
            <p className="text-indigo-100 opacity-80 mt-1">
              Valid Window: {TIME_WINDOWS.TEACHER_SIGN_IN.start} - {TIME_WINDOWS.TEACHER_SIGN_IN.end} AM
            </p>
          </div>
          
          <div className="p-8 text-center">
            {markedToday ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">You are signed in!</h3>
                <p className="text-slate-500 mt-2">
                  Recorded at {new Date(markedToday.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {!isWithinWindow && (
                  <div className="mb-6 p-4 bg-amber-50 text-amber-700 rounded-lg flex items-start gap-3 text-left w-full text-sm">
                    <AlertTriangle className="shrink-0 w-5 h-5" />
                    <div>
                      <p className="font-semibold">Check-in Unavailable</p>
                      <p>You can only sign in between {TIME_WINDOWS.TEACHER_SIGN_IN.start} and {TIME_WINDOWS.TEACHER_SIGN_IN.end}.</p>
                      <p className="mt-1 text-amber-600/70">Current Time: {currentTime.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSignIn}
                  disabled={!isWithinWindow}
                  className={`w-full py-5 rounded-xl text-xl font-bold transition-all transform active:scale-95 shadow-lg border-2 flex items-center justify-center gap-3 ${
                    isWithinWindow 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-500 hover:shadow-indigo-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                  }`}
                >
                  <Fingerprint size={28} />
                  {isWithinWindow ? 'MARK DAILY ATTENDANCE' : 'Window Closed'}
                </button>
              </div>
            )}
          </div>
       </div>

       {/* Activity Log Section */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700">Today's Activity Log</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {myRecords.length > 0 ? (
              myRecords.map(record => (
                <div key={record.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">Check-in Successful</span>
                    <span className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      {record.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No attendance records found for today.
              </div>
            )}
          </div>
       </div>
    </div>
  );
};