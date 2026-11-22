import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, CoursePayload } from '../models/course.model';
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
}
