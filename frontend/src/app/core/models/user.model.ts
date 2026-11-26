export type UserRole = 'admin' | 'profesor' | 'estudiante';

export interface User {
  id: number;
  user_code?: string;
  name: string;
  email: string;
  role: UserRole;
  career?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  career?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface TeacherRow {
  id: number;
  user_code?: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  courses_summary: string;
  assigned_classes: number;
  created_at?: string;
}

export interface StudentActiveCourse {
  enrollment_id: number;
  course_id: number;
  code: string;
  title: string;
  cycle: string;
  credits: number;
  teacher_name: string | null;
}

export interface StudentRow {
  id: number;
  user_code?: string;
  name: string;
  email: string;
  career: string | null;
  phone: string | null;
  address: string | null;
  created_at?: string;
  active_courses: StudentActiveCourse[];
}

export interface StaffRow {
  id: number;
  user_code?: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at?: string;
}
