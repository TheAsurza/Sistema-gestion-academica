export type CourseStatus = 'active' | 'draft' | 'inactive';

export interface CourseModule {
  id?: number;
  title: string;
  hours: number;
  sort_order?: number;
}

export interface Course {
  id: number;
  code: string;
  title: string;
  description: string;
  credits: number;
  status: CourseStatus;
  teacher_id: number | null;
  teacher_name?: string | null;
  modules: CourseModule[];
  created_at?: string;
}

export interface CoursePayload {
  code: string;
  title: string;
  description: string;
  credits: number;
  status: CourseStatus;
  teacher_id: number | null;
  modules: CourseModule[];
}
