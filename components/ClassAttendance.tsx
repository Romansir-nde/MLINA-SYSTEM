import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceStatus, GradeLevel, Student, User } from '../types';
import { TIME_WINDOWS } from '../constants';
import { getAttendanceForDate, saveAttendance } from '../services/storageService';
import { Check, Clock, Calendar, ChevronLeft, ChevronRight, Lock, AlertTriangle } from 'lucide-react';

interface Props {
  user: User;
  students: Student[];
  currentTime: Date;
}

export const ClassAttendance: React.FC<Props> = ({ user, students, currentTime }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(currentTime.toISOString().split('T')[0]);
  const [pendingAction, setPendingAction] = useState<{ studentId: string; status: AttendanceStatus; studentName: string } | null>(null);
  
  const todayStr = currentTime.toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Parse current time for validation
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Define Windows
  const halfDayStart = parseTime(TIME_WINDOWS.STUDENT_HALF_DAY.start);
  const halfDayEnd = parseTime(TIME_WINDOWS.STUDENT_HALF_DAY.end);
  const fullDayStart = parseTime(TIME_WINDOWS.STUDENT_FULL_DAY.start);
  const fullDayEnd = parseTime(TIME_WINDOWS.STUDENT_FULL_DAY.end);

  const canMarkHalfDay = isToday && currentMinutes >= halfDayStart && currentMinutes <= halfDayEnd;
  const canMarkFullDay = isToday && currentMinutes >= fullDayStart && currentMinutes <= fullDayEnd;

  useEffect(() => {
    setRecords(getAttendanceForDate(selectedDate));
  }, [selectedDate, records.length, currentTime]); // Reload when date changes or we add records

  const initiateMarkAttendance = (studentId: string, status: AttendanceStatus, studentName: string) => {
    setPendingAction({ studentId, status, studentName });
  };

  const confirmMarkAttendance = () => {
    if (!pendingAction) return;
    const { studentId, status } = pendingAction;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      entityId: student.id,
      entityName: student.name,
      entityType: 'STUDENT',
      grade: student.grade,
      date: todayStr, // Always mark for today regardless of view
      status: status,
      timestamp: currentTime.toISOString(),
      markedBy: user.id
    };

    saveAttendance(newRecord);
    setRecords(prev => [...prev, newRecord]);
    setPendingAction(null);
  };

  const myStudents = students.filter(s => s.grade === user.assignedClass);

  if (!user.assignedClass) return <div>No class assigned.</div>;

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      
      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
             <div className="flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                 <AlertTriangle size={24} />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Attendance</h3>
               <p className="text-slate-600 mb-6 text-sm">
                 Are you sure you want to mark <strong>{pendingAction.studentName}</strong> as 
                 <span className="font-bold text-indigo-600"> {pendingAction.status === AttendanceStatus.PRESENT_HALF ? 'Half Day' : 'Full Day'}</span>?
                 <br/><span className="text-xs text-slate-400 mt-2 block">This action cannot be undone.</span>
               </p>
               <div className="flex gap-3 w-full">
                 <button 
                   onClick={() => setPendingAction(null)}
                   className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmMarkAttendance}
                   className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                 >
                   Confirm & Save
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{user.assignedClass} Attendance</h2>
            <p className="text-sm text-slate-500">Manage student records for your class.</p>
          </div>
          
          <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => handleDateChange(-1)}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-4 font-medium text-slate-700 min-w-[140px] justify-center">
              <Calendar size={16} />
              {isToday ? "Today" : selectedDate}
            </div>
            <button 
              onClick={() => handleDateChange(1)}
              disabled={isToday} // Cannot go to future
              className={`p-2 rounded-md transition-all ${isToday ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white hover:shadow-sm text-slate-600'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {isToday ? (
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className={`flex items-center gap-2 ${canMarkHalfDay ? 'text-green-600 font-bold' : 'opacity-70'}`}>
               <Clock size={16} /> Half Day Window: {TIME_WINDOWS.STUDENT_HALF_DAY.start} - {TIME_WINDOWS.STUDENT_HALF_DAY.end}
               {canMarkHalfDay && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full ml-1">ACTIVE</span>}
            </div>
            <div className="w-px h-4 bg-slate-300 hidden md:block"></div>
            <div className={`flex items-center gap-2 ${canMarkFullDay ? 'text-green-600 font-bold' : 'opacity-70'}`}>
               <Clock size={16} /> Full Day Window: {TIME_WINDOWS.STUDENT_FULL_DAY.start} - {TIME_WINDOWS.STUDENT_FULL_DAY.end}
               {canMarkFullDay && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full ml-1">ACTIVE</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm">
            <Lock size={16} />
            <span className="font-medium">Historical View (Read Only)</span>
            <span className="text-amber-600/70">- You cannot modify records for past dates.</span>
            <button 
              onClick={() => setSelectedDate(todayStr)}
              className="ml-auto text-xs underline font-semibold hover:text-amber-800"
            >
              Return to Today
            </button>
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="grid gap-4">
        {myStudents.map(student => {
          const studentRecords = records.filter(r => r.entityId === student.id);
          const hasHalfDay = studentRecords.some(r => r.status === AttendanceStatus.PRESENT_HALF);
          const hasFullDay = studentRecords.some(r => r.status === AttendanceStatus.PRESENT_FULL);

          return (
            <div key={student.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-700">{student.name}</h3>
                <p className="text-xs text-slate-400">ID: {student.id}</p>
              </div>

              <div className="flex gap-3">
                {/* Half Day Button/Status */}
                {hasHalfDay ? (
                  <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium border border-green-100">
                    <Check size={14} /> Half Day
                  </span>
                ) : isToday ? (
                    <button
                      onClick={() => initiateMarkAttendance(student.id, AttendanceStatus.PRESENT_HALF, student.name)}
                      disabled={!canMarkHalfDay}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        canMarkHalfDay 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      {canMarkHalfDay ? 'Mark Half Day' : (currentMinutes > halfDayEnd ? 'Window Closed' : 'Pending')}
                    </button>
                  ) : (
                    <span className="text-slate-300 text-sm italic px-2">Absent (Half)</span>
                  )
                }

                {/* Full Day Button/Status */}
                {hasFullDay ? (
                   <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-100">
                   <Check size={14} /> Full Day
                 </span>
                ) : isToday ? (
                    <button
                      onClick={() => initiateMarkAttendance(student.id, AttendanceStatus.PRESENT_FULL, student.name)}
                      disabled={!canMarkFullDay}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        canMarkFullDay 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      {canMarkFullDay ? 'Mark Full Day' : (currentMinutes > fullDayEnd ? 'Window Closed' : 'Pending')}
                    </button>
                  ) : (
                    <span className="text-slate-300 text-sm italic px-2">Absent (Full)</span>
                  )
                }
              </div>
            </div>
          );
        })}
      </div>

      {myStudents.length === 0 && (
         <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
           No students found in this class list.
         </div>
      )}
    </div>
  );
};