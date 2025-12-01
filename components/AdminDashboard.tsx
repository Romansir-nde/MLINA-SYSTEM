import React, { useEffect, useState } from 'react';
import { AttendanceRecord, GradeLevel, Student, User, UserRole } from '../types';
import { getAttendance, getStudents, updateEnrollmentCount, addStudent, addStudentsBulk, getUsers, addUser, removeUser, promoteAcademicYear, clearStudents, removeStudent, clearAttendanceHistory } from '../services/storageService';
import { generateAttendanceReport } from '../services/geminiService';
import { GRADE_GROUPS, TIME_WINDOWS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, TrendingUp, Sparkles, Download, Settings, RefreshCw, Layers, Plus, CheckCircle, Trash2, GraduationCap, ArrowRight, Briefcase, Lock, Eraser, FileText, List, History, Clock, Search, Calendar, ChevronLeft, ChevronRight, AlertCircle, FileX, BadgeCheck, Key } from 'lucide-react';

interface Props {
  userRole: UserRole;
  currentTime: Date;
}

export const AdminDashboard: React.FC<Props> = ({ userRole, currentTime }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [enrollmentInput, setEnrollmentInput] = useState(98);
  
  // Date State
  const [dashboardDate, setDashboardDate] = useState<string>(currentTime.toISOString().split('T')[0]);

  // New Student Form State
  const [enrollMode, setEnrollMode] = useState<'single' | 'bulk'>('single');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState<GradeLevel>(GradeLevel.PLAYGROUP);
  const [bulkNames, setBulkNames] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Student Directory State
  const [studentSearch, setStudentSearch] = useState('');

  // Staff Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  // Merged "Position" selector
  // Values: 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER', 'GENERAL_STAFF', 'CLASS_{GradeLevel}'
  const [staffPosition, setStaffPosition] = useState<string>('');
  const [staffPin, setStaffPin] = useState('');
  const [staffEnrollSuccess, setStaffEnrollSuccess] = useState<string | null>(null);
  
  // Progression State
  const [moveTeachers, setMoveTeachers] = useState(false);

  const isReadOnly = userRole === UserRole.HEAD_TEACHER || userRole === UserRole.DEPUTY_HEAD_TEACHER;

  useEffect(() => {
    // Sync dashboard date if currentTime changes significantly (e.g. day change via demo)
    setDashboardDate(currentTime.toISOString().split('T')[0]);
  }, [currentTime]);

  useEffect(() => {
    refreshData();
  }, [dashboardDate]); // Refresh when date changes too

  const refreshData = () => {
    setAttendance(getAttendance());
    const loadedStudents = getStudents();
    setStudents(loadedStudents);
    setUsers(getUsers());
    setEnrollmentInput(loadedStudents.length);
  };

  const handleDateChange = (days: number) => {
    const date = new Date(dashboardDate);
    date.setDate(date.getDate() + days);
    setDashboardDate(date.toISOString().split('T')[0]);
  };

  // --- Calculations for Selected Date ---

  // 1. Student Stats
  const studentRecordsSelectedDate = attendance.filter(r => r.entityType === 'STUDENT' && r.date === dashboardDate);
  const uniqueStudentsPresent = new Set(studentRecordsSelectedDate.map(r => r.entityId)).size;
  const totalStudents = students.length;
  const attendanceRate = totalStudents > 0 ? ((uniqueStudentsPresent / totalStudents) * 100).toFixed(1) : 0;

  // 2. Teacher Stats
  const teacherRecordsSelectedDate = attendance.filter(r => r.entityType === 'TEACHER' && r.date === dashboardDate);
  
  // Helper to determine if a teacher was late
  const isTeacherLate = (timestamp: string) => {
    const time = new Date(timestamp);
    const minutes = time.getHours() * 60 + time.getMinutes();
    const [endH, endM] = TIME_WINDOWS.TEACHER_SIGN_IN.end.split(':').map(Number);
    const limit = endH * 60 + endM;
    return minutes > limit;
  };

  // Chart Data: Group by Grade
  const gradeData = Object.values(GradeLevel).map(grade => {
    const gradeStudents = students.filter(s => s.grade === grade);
    // Count unique IDs for this grade in selected date records
    const presentCount = new Set(studentRecordsSelectedDate.filter(r => r.grade === grade).map(r => r.entityId)).size;
    
    return {
      name: grade,
      total: gradeStudents.length,
      present: presentCount
    };
  });

  const handleGenerateReport = async () => {
    setLoadingAi(true);
    const report = await generateAttendanceReport(attendance, students, dashboardDate);
    setAiReport(report);
    setLoadingAi(false);
  };

  const exportCSV = () => {
    const headers = "ID,Name,Type,Grade,Date,Status,Time\n";
    const rows = attendance.filter(r => r.date === dashboardDate).map(r => 
      `${r.id},${r.entityName},${r.entityType},${r.grade || 'N/A'},${r.date},${r.status},${r.timestamp}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${dashboardDate}.csv`;
    a.click();
  };

  const handleUpdateEnrollment = () => {
    if (enrollmentInput <= 0) return;
    if (window.confirm(`Are you sure? This will reset the student database to ${enrollmentInput} mock students and CLEAR all current attendance records.`)) {
      updateEnrollmentCount(Number(enrollmentInput));
      refreshData();
    }
  };

  const handleClearDatabase = () => {
    if (window.confirm("WARNING: This will delete ALL students from the system. Use this if you want to clear demo data and start enrolling real students manually. Attendance records will also be reset.")) {
      clearStudents();
      refreshData();
    }
  }

  const handleClearAttendance = () => {
    if (window.confirm("Are you sure? This will delete ALL attendance history (graphs & logs) but will KEEP the student enrollment list.")) {
      clearAttendanceHistory();
      refreshData();
    }
  }

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    
    const newStudent: Student = {
      id: `s-manual-${Date.now()}`,
      name: newStudentName,
      grade: newStudentGrade
    };
    
    addStudent(newStudent);
    refreshData();
    setNewStudentName('');
    setEnrollSuccess(`${newStudent.name} enrolled successfully in ${newStudent.grade}`);
    setTimeout(() => setEnrollSuccess(null), 3000);
  };

  const handleBulkEnroll = () => {
    if (!bulkNames.trim()) return;
    const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;

    const newStudents: Student[] = names.map((name, index) => ({
      id: `s-bulk-${Date.now()}-${index}`,
      name: name,
      grade: newStudentGrade
    }));

    addStudentsBulk(newStudents);
    refreshData();
    setBulkNames('');
    setEnrollSuccess(`Successfully enrolled ${newStudents.length} students into ${newStudentGrade}`);
    setTimeout(() => setEnrollSuccess(null), 3000);
  };

  const handleRemoveStudent = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove student "${name}"?`)) {
      removeStudent(id);
      refreshData();
    }
  };

  const handleAddStaff = () => {
    if (!newTeacherName.trim() || !staffPosition) {
      alert("Please enter a name and select a position.");
      return;
    }

    let role = UserRole.TEACHER;
    let assignedClass: GradeLevel | undefined = undefined;

    if (staffPosition === 'HEAD_TEACHER') {
      role = UserRole.HEAD_TEACHER;
    } else if (staffPosition === 'DEPUTY_HEAD_TEACHER') {
      role = UserRole.DEPUTY_HEAD_TEACHER;
    } else if (staffPosition === 'GENERAL_STAFF') {
      role = UserRole.TEACHER;
      assignedClass = undefined;
    } else if (staffPosition.startsWith('CLASS_')) {
      role = UserRole.TEACHER;
      assignedClass = staffPosition.replace('CLASS_', '') as GradeLevel;
    }

    const newStaff: User = {
      id: `staff-${Date.now()}`,
      name: newTeacherName,
      role: role,
      assignedClass: assignedClass,
      pin: staffPin.trim() || '1234'
    };

    try {
      addUser(newStaff);
      refreshData();
      setNewTeacherName('');
      setStaffPosition('');
      setStaffPin('');
      setStaffEnrollSuccess(`${newTeacherName} added successfully!`);
      setTimeout(() => setStaffEnrollSuccess(null), 3000);
    } catch (e) {
      alert("Error adding staff member.");
    }
  };

  const handleRemoveUser = (id: string, role: string) => {
    if (window.confirm(`Are you sure you want to remove this ${role}?`)) {
      removeUser(id);
      refreshData();
    }
  };

  const handlePromoteYear = () => {
    if (window.confirm("WARNING: Promote all students to next grade? Grade 7 will graduate. Attendance will be cleared.")) {
      promoteAcademicYear(moveTeachers);
      refreshData();
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.grade.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const getDashboardTitle = () => {
    switch (userRole) {
      case UserRole.ADMIN: return 'School Manager Dashboard';
      case UserRole.HEAD_TEACHER: return 'Headteacher Dashboard';
      case UserRole.DEPUTY_HEAD_TEACHER: return 'Deputy Headteacher Dashboard';
      default: return 'Dashboard';
    }
  };

  // Helper to sort staff list: Administration first, then Teachers by grade
  const sortedStaff = [...users].sort((a, b) => {
    const roleOrder = { [UserRole.ADMIN]: 0, [UserRole.HEAD_TEACHER]: 1, [UserRole.DEPUTY_HEAD_TEACHER]: 2, [UserRole.TEACHER]: 3 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    // If both teachers, sort by grade index
    if (a.role === UserRole.TEACHER && b.role === UserRole.TEACHER) {
      const grades = Object.values(GradeLevel);
      const aIdx = a.assignedClass ? grades.indexOf(a.assignedClass) : 999;
      const bIdx = b.assignedClass ? grades.indexOf(b.assignedClass) : 999;
      return aIdx - bIdx;
    }
    return 0;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            {getDashboardTitle()}
            {isReadOnly && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">View Only</span>}
          </h1>
          <p className="text-slate-500">System Overview & Management</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
           <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-50 rounded-md text-slate-600">
             <ChevronLeft size={20} />
           </button>
           <div className="flex items-center gap-2 px-2 text-slate-700 font-semibold min-w-[140px] justify-center">
             <Calendar size={18} className="text-indigo-600" />
             {new Date(dashboardDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
           </div>
           <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-50 rounded-md text-slate-600">
             <ChevronRight size={20} />
           </button>
        </div>

        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors"
        >
          <Download size={18} /> Export Daily Report
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Student Attendance</p>
              <h3 className="text-2xl font-bold text-slate-800">{uniqueStudentsPresent} / {totalStudents}</h3>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${attendanceRate}%` }}></div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
             <span>Rate: {attendanceRate}%</span>
             <span>Date: {dashboardDate}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Teachers Present</p>
              <h3 className="text-2xl font-bold text-slate-800">{teacherRecordsSelectedDate.length}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Staff checked in for {new Date(dashboardDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-xl shadow-md flex flex-col justify-between">
           <div>
              <p className="text-indigo-200 text-sm font-medium mb-1 flex items-center gap-2">
                <Sparkles size={14} /> AI Analysis
              </p>
              {aiReport ? (
                 <p className="text-sm leading-relaxed line-clamp-4">{aiReport}</p>
              ) : (
                <p className="text-sm text-indigo-100 italic opacity-80">
                  Generate an AI summary for {dashboardDate}...
                </p>
              )}
           </div>
           <button 
             onClick={handleGenerateReport}
             disabled={loadingAi}
             className="mt-4 self-start bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-xs font-semibold backdrop-blur-sm transition-colors"
           >
             {loadingAi ? 'Analyzing...' : 'Generate Insight'}
           </button>
        </div>
      </div>

      {/* Teacher Daily Log */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-600" />
            <h3 className="font-semibold text-slate-800">Staff Attendance Log <span className="text-slate-400 font-normal text-sm ml-2">({dashboardDate})</span></h3>
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">
             {teacherRecordsSelectedDate.length} Records Found
          </span>
        </div>
        
        <div className="overflow-x-auto">
           {teacherRecordsSelectedDate.length > 0 ? (
             <table className="w-full text-sm text-left">
               <thead className="bg-white text-slate-500 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-3 font-medium">Staff Name</th>
                   <th className="px-6 py-3 font-medium">Role / Class</th>
                   <th className="px-6 py-3 font-medium">PIN</th>
                   <th className="px-6 py-3 font-medium">Time In</th>
                   <th className="px-6 py-3 font-medium text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {teacherRecordsSelectedDate.map(record => {
                    const teacherUser = users.find(u => u.id === record.entityId);
                    const isLate = isTeacherLate(record.timestamp);
                    
                    return (
                       <tr key={record.id} className="hover:bg-slate-50/50">
                         <td className="px-6 py-3 font-medium text-slate-700">{record.entityName}</td>
                         <td className="px-6 py-3 text-slate-500">
                           {teacherUser?.assignedClass ? (
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{teacherUser.assignedClass}</span>
                           ) : (
                             <span className="text-slate-400 italic">
                               {teacherUser?.role === UserRole.HEAD_TEACHER ? 'Headteacher' : 
                                teacherUser?.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Deputy' : 'General Staff'}
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                           {teacherUser?.pin || '****'}
                         </td>
                         <td className="px-6 py-3 font-mono text-slate-600">
                            {new Date(record.timestamp).toLocaleTimeString()}
                         </td>
                         <td className="px-6 py-3 text-right">
                            {isLate ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                                <AlertCircle size={12} /> Late Arrival
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                                <CheckCircle size={12} /> On Time
                              </span>
                            )}
                         </td>
                       </tr>
                    );
                 })}
               </tbody>
             </table>
           ) : (
             <div className="p-8 text-center text-slate-400 text-sm italic">
               No staff attendance records found for {dashboardDate}.
             </div>
           )}
        </div>
      </div>

      {/* Detailed Group Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => {
           // Calculate group summary
           const groupStudents = students.filter(s => grades.includes(s.grade));
           const groupTotal = groupStudents.length;
           const groupPresent = new Set(studentRecordsSelectedDate.filter(r => r.grade && grades.includes(r.grade)).map(r => r.entityId)).size;
           const groupRate = groupTotal > 0 ? Math.round((groupPresent / groupTotal) * 100) : 0;

           return (
             <div key={groupName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-slate-500"/>
                    <h3 className="font-bold text-slate-700">{groupName}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${groupRate >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                     {groupRate}% Avg
                  </span>
                </div>
                <div className="p-4 space-y-4 flex-1">
                   {grades.map(grade => {
                      const gStudents = students.filter(s => s.grade === grade);
                      const gTotal = gStudents.length;
                      const gPresent = new Set(studentRecordsSelectedDate.filter(r => r.grade === grade).map(r => r.entityId)).size;
                      const gRate = gTotal > 0 ? Math.round((gPresent / gTotal) * 100) : 0;
                      
                      return (
                        <div key={grade}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 font-medium">{grade}</span>
                            <span className="text-slate-400 text-xs">{gPresent}/{gTotal} Present</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                             <div 
                               className={`h-2 rounded-full transition-all duration-500 ${gRate >= 90 ? 'bg-green-500' : gRate >= 70 ? 'bg-blue-500' : 'bg-red-400'}`} 
                               style={{width: `${gRate}%`}}
                             />
                          </div>
                        </div>
                      )
                   })}
                </div>
             </div>
           )
        })}
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-slate-400" /> Attendance Overview by Grade ({dashboardDate})
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} interval={0} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="total" name="Total Students" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Staff & Students Directory */}
        <div className="space-y-6">
          {/* Staff Management */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800">Staff Directory & Management</h3>
              </div>
              {isReadOnly && <Lock size={14} className="text-slate-400" />}
            </div>
            
            <div className="p-6 space-y-4 border-b border-slate-100 bg-slate-50/30">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enroll / Edit Staff Member</h4>
              
              {staffEnrollSuccess && (
                 <div className="p-3 bg-green-100 text-green-800 border border-green-200 text-sm font-medium rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-sm">
                   <CheckCircle size={16} className="text-green-600" />
                   {staffEnrollSuccess}
                 </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
                <select 
                  value={staffPosition}
                  onChange={(e) => setStaffPosition(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Select Position --</option>
                  <optgroup label="Administration">
                    <option value="HEAD_TEACHER">Headteacher (Principal)</option>
                    <option value="DEPUTY_HEAD_TEACHER">Deputy Headteacher</option>
                  </optgroup>
                  <optgroup label="General Teaching Staff">
                    <option value="GENERAL_STAFF">General Staff / Subject Teacher (No Class)</option>
                  </optgroup>
                  <optgroup label="Class Teachers">
                      {Object.values(GradeLevel).map(g => (
                          <option key={g} value={`CLASS_${g}`}>Class Teacher - {g}</option>
                      ))}
                  </optgroup>
                </select>
                <div className="col-span-1 sm:col-span-2 flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg">
                  <Key size={14} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    placeholder="Set Login PIN (Default: 1234)"
                    maxLength={4}
                    className="flex-1 text-sm bg-transparent focus:outline-none font-mono"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddStaff}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Save Staff Member
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Note: Assigning a Head/Deputy/Class Teacher will automatically replace the existing one.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Position / Class</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStaff.filter(u => u.role !== UserRole.ADMIN).map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-700">
                        {user.name}
                        {user.role === UserRole.HEAD_TEACHER && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">HEAD</span>}
                        {user.role === UserRole.DEPUTY_HEAD_TEACHER && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">DEPUTY</span>}
                      </td>
                      <td className="px-6 py-3">
                         <div className="flex flex-col">
                            {user.assignedClass ? (
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium w-fit mb-1">{user.assignedClass}</span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-xs w-fit mb-1">
                                {user.role === UserRole.HEAD_TEACHER ? 'Administration' : 
                                 user.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Administration' : 'General Staff'}
                              </span>
                            )}
                            <span className="text-slate-400 text-xs font-mono">PIN: {user.pin}</span>
                         </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUser(user.id, user.role);
                          }}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                          title="Remove Staff"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Directory */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
               <div className="flex items-center gap-2">
                 <List size={18} className="text-blue-500" />
                 <h3 className="font-semibold text-slate-800">Student Directory</h3>
               </div>
               {isReadOnly && <Lock size={14} className="text-slate-400" />}
             </div>
             
             <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                     type="text" 
                     placeholder="Search student by name or grade..." 
                     value={studentSearch}
                     onChange={(e) => setStudentSearch(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   />
                </div>
             </div>

             <div className="overflow-y-auto max-h-[300px]">
               {filteredStudents.length > 0 ? (
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                       <tr>
                         <th className="px-6 py-3 font-medium">Student Name</th>
                         <th className="px-6 py-3 font-medium">Grade</th>
                         <th className="px-6 py-3 font-medium text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredStudents.slice(0, 100).map(student => (
                         <tr key={student.id} className="hover:bg-slate-50/50 group">
                           <td className="px-6 py-2 text-slate-700">{student.name}</td>
                           <td className="px-6 py-2">
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{student.grade}</span>
                           </td>
                           <td className="px-6 py-2 text-right">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveStudent(student.id, student.name);
                                }}
                                className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remove Student"
                              >
                                <Trash2 size={14} />
                              </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">
                     No students found.
                  </div>
               )}
             </div>
          </div>
        </div>
        
        {/* Right Column: Enrollment & Progression */}
        <div className="space-y-6">
          {/* Enroll Student */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Plus size={18} className="text-slate-400" />
                  <h3 className="font-semibold text-slate-800">Enroll New Student</h3>
               </div>
               {isReadOnly && <Lock size={14} className="text-slate-400" />}
             </div>
             
             <div className="flex border-b border-slate-100">
               <button onClick={() => setEnrollMode('single')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${enrollMode === 'single' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <UserCheck size={16} /> Single Student
               </button>
               <button onClick={() => setEnrollMode('bulk')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${enrollMode === 'bulk' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <List size={16} /> Bulk Import
               </button>
             </div>

             <div className="p-6 space-y-3">
               {enrollSuccess && (
                 <div className="p-3 bg-green-100 text-green-800 border border-green-200 text-sm font-medium rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-sm mb-4">
                   <CheckCircle size={16} className="text-green-600" />
                   {enrollSuccess}
                 </div>
               )}
               
               <div className="flex items-center gap-3 mb-2">
                 <label className="text-sm font-medium text-slate-700 min-w-fit">Select Class:</label>
                 <select 
                   value={newStudentGrade}
                   onChange={(e) => setNewStudentGrade(e.target.value as GradeLevel)}
                   className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                 >
                   {Object.values(GradeLevel).map(g => (
                     <option key={g} value={g}>{g}</option>
                   ))}
                 </select>
               </div>

               {enrollMode === 'single' ? (
                 <>
                   <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Full Name (e.g., John Doe)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                   <button onClick={handleAddStudent} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                     Enroll Single Student
                   </button>
                 </>
               ) : (
                 <>
                   <textarea value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} placeholder="Paste names here, one per line..." className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono" />
                   <button onClick={handleBulkEnroll} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                     Bulk Enroll Students
                   </button>
                 </>
               )}
             </div>
          </div>

          {/* Academic Progression */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
               <div className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Academic Year Actions</h3>
               </div>
               {isReadOnly && <Lock size={14} className="text-amber-900/50" />}
             </div>
             <div className="p-6">
                <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-lg">
                  <input type="checkbox" id="moveTeachers" checked={moveTeachers} onChange={(e) => setMoveTeachers(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <label htmlFor="moveTeachers" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Move Teachers with their Class?
                  </label>
                </div>
                <button onClick={handlePromoteYear} className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <ArrowRight size={18} /> Promote All Students
                </button>
             </div>
          </div>

          {/* Bulk Reset */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Settings size={18} className="text-slate-400" />
                 <h3 className="font-semibold text-slate-800">System Data Management</h3>
               </div>
               {isReadOnly && <Lock size={14} className="text-slate-400" />}
             </div>
             <div className="p-6 space-y-4">
               
               <button onClick={handleClearAttendance} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors text-left">
                 <FileX size={16} /> 
                 <span className="flex-1">Clear Attendance History (Keep Students)</span>
               </button>

               <button onClick={handleClearDatabase} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors text-left">
                 <Eraser size={16} /> 
                 <span className="flex-1">Clear Student Database (Factory Reset)</span>
               </button>
               
               <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Generate Mock Data:</p>
                  <div className="flex gap-2">
                    <input type="number" value={enrollmentInput} onChange={(e) => setEnrollmentInput(Number(e.target.value))} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" min="10" />
                    <button onClick={handleUpdateEnrollment} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                      <RefreshCw size={14} /> Reset
                    </button>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};