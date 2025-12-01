import { AttendanceRecord, Student, User, UserRole, GradeLevel } from '../types';
import { MOCK_STUDENTS, MOCK_USERS, generateStudents, NEXT_GRADE_MAPPING } from '../constants';

const KEYS = {
  ATTENDANCE: 'mlina_attendance_records',
  STUDENTS: 'mlina_students',
  USERS: 'mlina_users',
};

// Initialize DB with mock data if empty
export const initStorage = () => {
  if (!localStorage.getItem(KEYS.STUDENTS)) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(MOCK_STUDENTS));
  }
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
  }
};

export const getStudents = (): Student[] => {
  const data = localStorage.getItem(KEYS.STUDENTS);
  return data ? JSON.parse(data) : [];
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

// --- Staff Management ---

export const addUser = (newUser: User) => {
  let users = getUsers();
  
  // Simple check to ensure ID uniqueness
  if (users.find(u => u.id === newUser.id)) {
      throw new Error("User ID already exists");
  }

  // 1. Headteacher Replacement Logic
  // If adding a new Headteacher, remove the existing one (Edit/Replace scenario)
  if (newUser.role === UserRole.HEAD_TEACHER) {
    users = users.filter(u => u.role !== UserRole.HEAD_TEACHER);
  }

  // 2. Deputy Replacement Logic
  // If adding a new Deputy, remove the existing one
  if (newUser.role === UserRole.DEPUTY_HEAD_TEACHER) {
    users = users.filter(u => u.role !== UserRole.DEPUTY_HEAD_TEACHER);
  }

  // 3. Class Teacher Replacement Logic
  // If the new user is a Teacher and assigned to a class, 
  // check if that class is already assigned to someone else.
  if (newUser.role === UserRole.TEACHER && newUser.assignedClass) {
    users = users.map(u => {
      // If found another teacher with the same class, unassign them (convert to General Staff)
      if (u.id !== newUser.id && u.role === UserRole.TEACHER && u.assignedClass === newUser.assignedClass) {
        return { ...u, assignedClass: undefined }; 
      }
      return u;
    });
  }

  // Ensure PIN is set (default 1234 if missing)
  if (!newUser.pin) {
    newUser.pin = '1234';
  }

  users.push(newUser);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const updateUserPin = (userId: string, newPin: string) => {
  const users = getUsers();
  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      return { ...u, pin: newPin };
    }
    return u;
  });
  localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
};

export const removeUser = (userId: string) => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem(KEYS.USERS, JSON.stringify(filtered));
};

// --- Student Management ---

export const updateEnrollmentCount = (count: number) => {
  const newStudents = generateStudents(count);
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(newStudents));
  // Clear attendance to avoid ID mismatches/orphaned records when student list changes
  localStorage.removeItem(KEYS.ATTENDANCE); 
  window.location.reload();
};

export const clearStudents = () => {
  // Wipes all students for a fresh start (Manual Entry Mode)
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify([]));
  localStorage.removeItem(KEYS.ATTENDANCE);
  window.location.reload();
}

export const addStudent = (student: Student) => {
  const students = getStudents();
  // Add to the beginning of the list so they appear at the top,
  // effectively taking precedence over existing "dummy" data.
  students.unshift(student);
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
};

export const addStudentsBulk = (newStudents: Student[]) => {
  const students = getStudents();
  // Prepend all new students
  const updatedStudents = [...newStudents, ...students];
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updatedStudents));
};

export const removeStudent = (studentId: string) => {
  const students = getStudents();
  const filtered = students.filter(s => s.id !== studentId);
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(filtered));

  // Also remove attendance records for this student to prevent orphaned data
  const attendance = getAttendance();
  const filteredAttendance = attendance.filter(a => a.entityId !== studentId);
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));
};

// --- Academic Progression ---

export const promoteAcademicYear = (moveTeachersWithClass: boolean) => {
  const students = getStudents();
  const users = getUsers();
  
  // 1. Promote Students
  const promotedStudents: Student[] = [];
  
  students.forEach(student => {
    const nextGrade = NEXT_GRADE_MAPPING[student.grade];
    if (nextGrade) {
      // Move to next grade
      promotedStudents.push({ ...student, grade: nextGrade });
    } else {
      // Student graduates (Grade 7 -> Out). We simply don't add them to the new list.
      // In a real DB, we might archive them.
    }
  });

  // 2. Move Teachers (Optional)
  let updatedUsers = [...users];
  if (moveTeachersWithClass) {
    updatedUsers = updatedUsers.map(user => {
      if (user.role === UserRole.TEACHER && user.assignedClass) {
        const nextClass = NEXT_GRADE_MAPPING[user.assignedClass];
        if (nextClass) {
          return { ...user, assignedClass: nextClass };
        } else {
          // Teacher was teaching Grade 7, now they have no class (or cycle back? For now, unassigned)
          return { ...user, assignedClass: undefined };
        }
      }
      return user;
    });
  }

  // 3. Save Changes & Clear Attendance
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(promotedStudents));
  localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
  localStorage.removeItem(KEYS.ATTENDANCE); // New year, new records

  window.location.reload();
};

// --- Attendance ---

export const saveAttendance = (record: AttendanceRecord): void => {
  const existingRaw = localStorage.getItem(KEYS.ATTENDANCE);
  const existing: AttendanceRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
  
  // Check specifically for duplicate daily records
  const isDuplicate = existing.some(r => 
    r.entityId === record.entityId && 
    r.date === record.date && 
    r.status === record.status
  );

  if (!isDuplicate) {
    const updated = [...existing, record];
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updated));
  }
};

export const getAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

export const getAttendanceForDate = (date: string): AttendanceRecord[] => {
  return getAttendance().filter(r => r.date === date);
};

export const clearAttendanceHistory = () => {
  localStorage.removeItem(KEYS.ATTENDANCE);
  window.location.reload();
}

// Helper for demo: Clear data
export const clearData = () => {
  localStorage.removeItem(KEYS.ATTENDANCE);
  localStorage.removeItem(KEYS.STUDENTS); // Also clear students to reset to default 98 on reload
  localStorage.removeItem(KEYS.USERS);
  window.location.reload();
};