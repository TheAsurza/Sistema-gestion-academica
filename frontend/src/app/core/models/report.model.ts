import { CourseStatus } from './course.model';
import { UserRole } from './user.model';

export interface AcademicKpis {
  approval_rate: number;
  average_grade: number | null;
  total_planned_hours: number;
  unassigned_courses: number;
}

export interface CoursePerformanceRow {
  id: number;
  code: string;
  title: string;
  career: string;
  teacher_name: string;
  enrolled_count: number;
  completed_count: number;
  average_grade: number | null;
  approval_rate: number | null;
}

export interface TeacherWorkloadRow {
  id: number;
  name: string;
  courses_count: number;
  modules_count: number;
  total_hours: number;
}

export interface ReportSummary {
  users_by_role: Record<UserRole, number>;
  courses_by_status: Record<CourseStatus, number>;
  enrollments?: {
    enrolled: number;
    completed: number;
    total: number;
  };
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  academic_kpis?: AcademicKpis;
  course_performance?: CoursePerformanceRow[];
  teacher_workload?: TeacherWorkloadRow[];
}
