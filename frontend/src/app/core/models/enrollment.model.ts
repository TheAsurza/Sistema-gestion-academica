export interface EnrollmentHistory {
  id: number;
  course_id: number;
  code: string;
  title: string;
  credits: number;
  cycle: string;
  status: 'enrolled' | 'completed';
  final_grade: number | null;
}
