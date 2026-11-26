import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttendanceStatus,
  Course,
  CourseAttendanceResponse,
  CourseDetail,
  CoursePayload,
  StudentCourseView,
} from '../models/course.model';
import { EnrollmentHistory } from '../models/enrollment.model';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly coursesSubject = new BehaviorSubject<Course[]>([]);
  readonly courses$: Observable<Course[]> = this.coursesSubject.asObservable();

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/courses`).pipe(
      tap((courses) => this.coursesSubject.next(courses)),
      catchError((error) => throwError(() => error)),
    );
  }

  createCourse(payload: CoursePayload): Observable<Course> {
    return this.http.post<Course>(`${this.apiUrl}/courses`, payload).pipe(
      tap((course) => this.coursesSubject.next([course, ...this.coursesSubject.value])),
      catchError((error) => throwError(() => error)),
    );
  }

  updateCourse(id: number, payload: CoursePayload): Observable<Course> {
    return this.http.put<Course>(`${this.apiUrl}/courses/${id}`, payload).pipe(
      tap((updated) =>
        this.coursesSubject.next(
          this.coursesSubject.value.map((course) => (course.id === id ? updated : course)),
        ),
      ),
      catchError((error) => throwError(() => error)),
    );
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/courses/${id}`).pipe(
      tap(() =>
        this.coursesSubject.next(this.coursesSubject.value.filter((course) => course.id !== id)),
      ),
      catchError((error) => throwError(() => error)),
    );
  }

  checkCodeAvailable(code: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('code', code);
    if (excludeId !== undefined) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http
      .get<{ available: boolean }>(`${this.apiUrl}/courses/check-code`, { params })
      .pipe(
        map((response) => response.available),
        catchError((error) => throwError(() => error)),
      );
  }

  getStudentHistory(): Observable<EnrollmentHistory[]> {
    return this.http
      .get<EnrollmentHistory[]>(`${this.apiUrl}/enrollments/history`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getStudentCourseView(courseId: number): Observable<StudentCourseView> {
    return this.http
      .get<StudentCourseView>(`${this.apiUrl}/courses/${courseId}/my-view`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getCourseDetail(courseId: number): Observable<CourseDetail> {
    return this.http
      .get<CourseDetail>(`${this.apiUrl}/courses/${courseId}`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  updateEnrollmentGrade(
    enrollmentId: number,
    finalGrade: number | null,
    status: 'enrolled' | 'completed',
  ): Observable<{ enrollment_id: number; final_grade: number | null; status: 'enrolled' | 'completed' }> {
    return this.http
      .put<{ enrollment_id: number; final_grade: number | null; status: 'enrolled' | 'completed' }>(
        `${this.apiUrl}/enrollments/${enrollmentId}/grade`,
        { final_grade: finalGrade, status },
      )
      .pipe(catchError((error) => throwError(() => error)));
  }

  getCourseAttendance(courseId: number, date: string): Observable<CourseAttendanceResponse> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<CourseAttendanceResponse>(`${this.apiUrl}/courses/${courseId}/attendance`, { params })
      .pipe(catchError((error) => throwError(() => error)));
  }

  saveCourseAttendance(
    courseId: number,
    date: string,
    records: { student_id: number; status: AttendanceStatus }[],
  ): Observable<{ message: string; date: string }> {
    return this.http
      .put<{ message: string; date: string }>(`${this.apiUrl}/courses/${courseId}/attendance`, {
        date,
        records,
      })
      .pipe(catchError((error) => throwError(() => error)));
  }
}
