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
  career: string;
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
  career: string;
  description: string;
  credits: number;
  status: CourseStatus;
  teacher_id: number | null;
  modules: CourseModule[];
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface CourseEnrolledStudent {
  enrollment_id: number;
  student_id: number;
  user_code: string;
  name: string;
  email: string;
  career: string | null;
  cycle: string;
  status: 'enrolled' | 'completed';
  final_grade: number | null;
  attendance_pct: number;
}

export interface CourseDetail extends Course {
  students: CourseEnrolledStudent[];
}

export interface CourseAttendanceRecord {
  student_id: number;
  user_code: string;
  name: string;
  status: AttendanceStatus;
  attendance_pct: number;
}

export interface CourseAttendanceResponse {
  date: string;
  sessions: string[];
  records: CourseAttendanceRecord[];
}

export interface StudentCourseView {
  id: number;
  code: string;
  title: string;
  career: string;
  description: string;
  credits: number;
  status: CourseStatus;
  teacher_name: string | null;
  enrollment: {
    cycle: string;
    status: 'enrolled' | 'completed';
    final_grade: number | null;
  };
  modules: CourseModule[];
  attendance: {
    attendance_pct: number;
    total_sessions: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    records: { session_date: string; status: AttendanceStatus }[];
  };
  upcoming_events: {
    id: number;
    event_date: string;
    event_time: string;
    title: string;
    tag: string;
    tone: 'violet' | 'amber' | 'mint';
  }[];
}
