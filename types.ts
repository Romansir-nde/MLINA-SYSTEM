export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  HEAD_TEACHER = 'HEAD_TEACHER',
  DEPUTY_HEAD_TEACHER = 'DEPUTY_HEAD_TEACHER',
}

export enum GradeLevel {
  PLAYGROUP = 'Playgroup',
  PP1 = 'PP1',
  PP2 = 'PP2',
  GRADE_1 = 'Grade 1',
  GRADE_2 = 'Grade 2',
  GRADE_3 = 'Grade 3',
  GRADE_4 = 'Grade 4',
  GRADE_5 = 'Grade 5',
  GRADE_6 = 'Grade 6',
  GRADE_7 = 'Grade 7',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  assignedClass?: GradeLevel; // Only for teachers
  pin?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: GradeLevel;
}

export enum AttendanceStatus {
  PRESENT_HALF = 'HALF_DAY',
  PRESENT_FULL = 'FULL_DAY',
  ABSENT = 'ABSENT', // Implicit if record missing, but useful for reports
}

export interface AttendanceRecord {
  id: string;
  entityId: string; // Student ID or Teacher ID
  entityName: string;
  entityType: 'STUDENT' | 'TEACHER';
  grade?: GradeLevel; // If student
  date: string; // ISO Date YYYY-MM-DD
  status: AttendanceStatus | 'PRESENT'; // Teachers are just PRESENT
  timestamp: string; // ISO String of exact marking time
  markedBy: string; // User ID of who marked it
}

export interface DailyStats {
  date: string;
  totalStudents: number;
  presentStudents: number;
  totalTeachers: number;
  presentTeachers: number;
}