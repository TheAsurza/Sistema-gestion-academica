import { CourseStatus } from './course.model';
import { UserRole } from './user.model';

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
}
