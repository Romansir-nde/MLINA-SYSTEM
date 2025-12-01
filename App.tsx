import React, { useState, useEffect } from 'react';
import { initStorage, clearData, getStudents, getUsers, updateUserPin } from './services/storageService';
import { SCHOOL_NAME, GRADE_GROUPS } from './constants';
import { User, UserRole, Student, GradeLevel } from './types';
import { ClassAttendance } from './components/ClassAttendance';
import { TeacherAttendance } from './components/TeacherAttendance';
import { AdminDashboard } from './components/AdminDashboard';
import { LogOut, School, User as UserIcon, Shield, Briefcase, Lock, Key, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Login PIN Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change PIN Modal State
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState('');

  useEffect(() => {
    // Initialize DB on first load
    initStorage();
    
    // Load initial data
    setStudents(getStudents());
    setUsers(getUsers());
    
    // Real-time clock: Updates every second
    const timer = setInterval(() => {
       setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initiateLogin = (user: User) => {
    setSelectedUserForLogin(user);
    setPinInput('');
    setLoginError('');
    setIsLoginModalOpen(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForLogin) return;

    // Default PIN check (in real app, use secure storage/hashing)
    const userPin = selectedUserForLogin.pin || '1234';
    
    if (pinInput === userPin) {
      setCurrentUser(selectedUserForLogin);
      setIsLoginModalOpen(false);
      
      // Refresh data on successful login
      const latestUsers = getUsers();
      const latestStudents = getStudents();
      setUsers(latestUsers);
      setStudents(latestStudents);
    } else {
      setLoginError('Incorrect PIN');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // Refresh data on logout too, so the login screen reflects any new teachers added by Admin
    setUsers(getUsers());
    setStudents(getStudents());
  };

  const openChangePinModal = () => {
    setNewPinInput('');
    setConfirmPinInput('');
    setChangePinError('');
    setChangePinSuccess('');
    setIsChangePinModalOpen(true);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      setChangePinError('PIN must be exactly 4 digits');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setChangePinError('PINs do not match');
      return;
    }

    // Update in storage
    updateUserPin(currentUser.id, newPinInput);
    
    // Update local state
    const updatedUser = { ...currentUser, pin: newPinInput };
    setCurrentUser(updatedUser);
    
    setChangePinSuccess('PIN changed successfully!');
    setTimeout(() => {
      setIsChangePinModalOpen(false);
    }, 1500);
  };

  // Filter users for the login screen based on the DYNAMIC users state
  const adminUsers = users.filter(u => 
    u.role === UserRole.ADMIN || 
    u.role === UserRole.HEAD_TEACHER || 
    u.role === UserRole.DEPUTY_HEAD_TEACHER
  );
  
  // Group Teachers Logic
  const getTeachersByGroup = (groupName: string) => {
    const grades = GRADE_GROUPS[groupName as keyof typeof GRADE_GROUPS];
    if (!grades) return [];
    
    return users
      .filter(u => u.role === UserRole.TEACHER && u.assignedClass && grades.includes(u.assignedClass))
      .sort((a, b) => {
        // Sort by index in the grades array (Grade 1 before Grade 2, etc.)
        return grades.indexOf(a.assignedClass!) - grades.indexOf(b.assignedClass!);
      });
  };

  const preUnitTeachers = getTeachersByGroup('Pre-Unit');
  const primaryTeachers = getTeachersByGroup('Primary');
  const juniorTeachers = getTeachersByGroup('Junior Secondary');
  const supportTeachers = users.filter(u => u.role === UserRole.TEACHER && !u.assignedClass);

  const renderTeacherGroup = (title: string, groupUsers: User[], colorClass: string) => {
    if (groupUsers.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
          {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupUsers.map(user => (
            <button
              key={user.id}
              onClick={() => initiateLogin(user)}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-600 hover:bg-slate-50 transition-all group text-left bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <UserIcon size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-slate-700 group-hover:text-indigo-700">{user.name}</span>
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${user.assignedClass ? 'text-slate-400' : 'text-slate-500 bg-slate-100 px-1 rounded max-w-fit'}`}>
                    {user.assignedClass || 'General Staff'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Manager';
      case UserRole.HEAD_TEACHER: return 'Headteacher';
      case UserRole.DEPUTY_HEAD_TEACHER: return 'Deputy Headteacher';
      default: return 'Teacher';
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-600 bg-slate-50">
      
      {/* Login Modal */}
      {isLoginModalOpen && selectedUserForLogin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-6 animate-in zoom-in-95 duration-200">
             <div className="text-center mb-6">
               <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Lock size={28} />
               </div>
               <h3 className="text-lg font-bold text-slate-800">Security Check</h3>
               <p className="text-sm text-slate-500">Enter PIN for {selectedUserForLogin.name}</p>
             </div>
             
             <form onSubmit={handleLoginSubmit} className="space-y-4">
               <div>
                 <input 
                   type="password" 
                   autoFocus
                   maxLength={4}
                   value={pinInput}
                   onChange={(e) => setPinInput(e.target.value)}
                   placeholder="Enter 4-digit PIN"
                   className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                 />
                 {loginError && <p className="text-red-500 text-xs text-center mt-2 font-medium">{loginError}</p>}
               </div>
               
               <div className="flex gap-3">
                 <button 
                   type="button"
                   onClick={() => setIsLoginModalOpen(false)}
                   className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                 >
                   Unlock
                 </button>
               </div>
             </form>
             <p className="text-[10px] text-center text-slate-400 mt-4">Default PIN: 1234</p>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isChangePinModalOpen && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Key size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Change PIN</h3>
                <p className="text-xs text-slate-500">Set a new 4-digit login PIN</p>
              </div>

              {changePinSuccess ? (
                <div className="text-green-600 bg-green-50 p-3 rounded-lg text-center font-medium text-sm mb-4 border border-green-100">
                  {changePinSuccess}
                </div>
              ) : (
                <form onSubmit={handleChangePinSubmit} className="space-y-3">
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="New PIN (4 digits)"
                    className="w-full text-center text-lg tracking-widest px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input 
                    type="password" 
                    maxLength={4}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Confirm PIN"
                    className="w-full text-center text-lg tracking-widest px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {changePinError && <p className="text-red-500 text-xs text-center font-medium">{changePinError}</p>}
                  
                  <div className="flex gap-2 mt-4">
                    <button 
                      type="button"
                      onClick={() => setIsChangePinModalOpen(false)}
                      className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </form>
              )}
           </div>
         </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <School size={20} />
                </div>
                <span className="font-bold text-lg text-slate-800 tracking-tight hidden sm:inline">{SCHOOL_NAME}</span>
                <span className="font-bold text-lg text-slate-800 tracking-tight sm:hidden">Mlina</span>
              </div>
              
              {/* LIVE CLOCK DISPLAY */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm font-mono text-indigo-700 font-bold border border-slate-200 shadow-inner">
                 <Clock size={16} />
                 {currentTime.toLocaleTimeString()}
              </div>
            </div>
            
            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                  <p className="text-xs text-slate-500">
                     {getRoleLabel(currentUser.role)}
                  </p>
                </div>
                
                <button 
                  onClick={openChangePinModal}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Change PIN"
                >
                  <Key size={20} />
                </button>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow py-8 px-4">
        {/* Mobile Clock */}
        <div className="md:hidden flex justify-center mb-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm font-mono text-indigo-700 font-bold border border-slate-200 shadow-sm">
                 <Clock size={16} />
                 {currentTime.toLocaleTimeString()}
            </div>
        </div>

        {!currentUser ? (
          <div className="max-w-6xl mx-auto mt-2 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome Back</h2>
            <p className="text-center text-slate-500 mb-8">Select a role to access the portal</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
               
               {/* Left Column: Admin */}
               <div className="lg:col-span-1 space-y-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Administration</h3>
                 <div className="space-y-3">
                   {adminUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => initiateLogin(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 transition-all group text-left shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-200 text-indigo-700 shrink-0">
                             <Shield size={20} />
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                          <span className="font-semibold text-slate-700 group-hover:text-indigo-700 truncate w-full">{user.name}</span>
                          <span className="text-xs text-slate-500">
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                      </button>
                   ))}
                 </div>
               </div>

               {/* Right Column: Teachers Categorized */}
               <div className="lg:col-span-3">
                  {renderTeacherGroup('Pre-Unit Department', preUnitTeachers, 'bg-emerald-100 text-emerald-600')}
                  {renderTeacherGroup('Primary School', primaryTeachers, 'bg-blue-100 text-blue-600')}
                  {renderTeacherGroup('Junior Secondary', juniorTeachers, 'bg-purple-100 text-purple-600')}
                  {renderTeacherGroup('Subject Teachers & General Staff', supportTeachers, 'bg-slate-100 text-slate-600')}
                  
                  {users.filter(u => u.role === UserRole.TEACHER).length === 0 && (
                     <div className="text-center py-12 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No teachers found. Please enroll staff via Admin Dashboard.
                     </div>
                  )}
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
               <button 
                 onClick={clearData}
                 className="text-xs text-red-400 hover:text-red-600 underline"
               >
                 Reset Demo Data & Enrollments
               </button>
            </div>
          </div>
        ) : (
          <>
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_TEACHER || currentUser.role === UserRole.DEPUTY_HEAD_TEACHER) && (
              <AdminDashboard userRole={currentUser.role} currentTime={currentTime} />
            )}
            
            {currentUser.role === UserRole.TEACHER && (
              <div className="space-y-8">
                 {/* 1. Teacher Self Attendance */}
                 <TeacherAttendance user={currentUser} currentTime={currentTime} />
                 
                 {/* 2. Class Student Attendance - Only if assigned to a class */}
                 {currentUser.assignedClass ? (
                   <ClassAttendance user={currentUser} students={students} currentTime={currentTime} />
                 ) : (
                   <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700">General Staff Dashboard</h3>
                      <p className="text-slate-500 mt-2">
                        You have successfully signed in. You are not assigned to a specific class register.
                      </p>
                   </div>
                 )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;