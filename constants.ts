import { GradeLevel, Student, User, UserRole } from './types';

// Configuration for Time Windows (in 24h format HH:MM)
export const TIME_WINDOWS = {
  TEACHER_SIGN_IN: { start: '07:00', end: '08:10' },
  STUDENT_HALF_DAY: { start: '12:00', end: '14:00' },
  STUDENT_FULL_DAY: { start: '16:00', end: '16:30' },
};

// Class Groups Configuration
export const GRADE_GROUPS = {
  'Pre-Unit': [GradeLevel.PLAYGROUP, GradeLevel.PP1, GradeLevel.PP2],
  'Primary': [GradeLevel.GRADE_1, GradeLevel.GRADE_2, GradeLevel.GRADE_3, GradeLevel.GRADE_4, GradeLevel.GRADE_5, GradeLevel.GRADE_6],
  'Junior Secondary': [GradeLevel.GRADE_7],
};

// Mapping for Academic Progression (Current Grade -> Next Grade)
export const NEXT_GRADE_MAPPING: Record<string, GradeLevel | null> = {
  [GradeLevel.PLAYGROUP]: GradeLevel.PP1,
  [GradeLevel.PP1]: GradeLevel.PP2,
  [GradeLevel.PP2]: GradeLevel.GRADE_1,
  [GradeLevel.GRADE_1]: GradeLevel.GRADE_2,
  [GradeLevel.GRADE_2]: GradeLevel.GRADE_3,
  [GradeLevel.GRADE_3]: GradeLevel.GRADE_4,
  [GradeLevel.GRADE_4]: GradeLevel.GRADE_5,
  [GradeLevel.GRADE_5]: GradeLevel.GRADE_6,
  [GradeLevel.GRADE_6]: GradeLevel.GRADE_7,
  [GradeLevel.GRADE_7]: null, // Graduating Class
};

// Mock Users
export const MOCK_USERS: User[] = [
  { id: 'admin1', name: 'School Manager', role: UserRole.ADMIN, pin: '1234' },
  { id: 'head1', name: 'Mr. Kamau (Principal)', role: UserRole.HEAD_TEACHER, pin: '1234' },
  { id: 'deputy1', name: 'Tr. Grace (Deputy)', role: UserRole.DEPUTY_HEAD_TEACHER, pin: '1234' },
  // Pre-Unit
  { id: 't1', name: 'Tr. Mary', role: UserRole.TEACHER, assignedClass: GradeLevel.PLAYGROUP, pin: '1234' },
  { id: 't2', name: 'Tr. Rose', role: UserRole.TEACHER, assignedClass: GradeLevel.PP1, pin: '1234' },
  { id: 't3', name: 'Tr. Alice', role: UserRole.TEACHER, assignedClass: GradeLevel.PP2, pin: '1234' },
  // Primary
  { id: 't4', name: 'Tr. James', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_1, pin: '1234' },
  { id: 't5', name: 'Tr. Kamau', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_2, pin: '1234' },
  { id: 't6', name: 'Tr. Lucy', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_3, pin: '1234' },
  { id: 't7', name: 'Tr. John', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_4, pin: '1234' },
  { id: 't8', name: 'Tr. Peter', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_5, pin: '1234' },
  { id: 't9', name: 'Tr. David', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_6, pin: '1234' },
  // Junior Secondary
  { id: 't10', name: 'Tr. Sarah', role: UserRole.TEACHER, assignedClass: GradeLevel.GRADE_7, pin: '1234' },
  // General / Subject Teachers (No Class Assigned)
  { id: 't11', name: 'Tr. Kevin (Games)', role: UserRole.TEACHER, pin: '1234' },
];

// Mock Students Generator
export const generateStudents = (totalCount: number = 98): Student[] => {
  const students: Student[] = [];
  let idCounter = 1;
  
  const grades = Object.values(GradeLevel);
  // Calculate base distribution
  const baseCount = Math.floor(totalCount / grades.length);
  let remainder = totalCount % grades.length;

  grades.forEach(grade => {
    // Distribute remainder students to first few classes
    const count = baseCount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    for (let i = 0; i < count; i++) {
      students.push({
        id: `s${idCounter++}`,
        name: `Student ${idCounter - 1} (${grade})`,
        grade: grade
      });
    }
  });
  
  return students;
};

export const MOCK_STUDENTS = generateStudents(98);

export const SCHOOL_NAME = "Mlina Education Center";