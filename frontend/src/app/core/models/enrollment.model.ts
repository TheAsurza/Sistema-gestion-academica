export interface EnrollmentHistory {
  id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  credits: number;
  teacher_name?: string | null;
  cycle: string;
  status: 'enrolled' | 'completed';
  final_grade: number | null;
  passed?: boolean;
}
