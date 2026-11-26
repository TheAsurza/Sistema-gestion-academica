import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StaffRow, StudentActiveCourse, StudentRow, TeacherRow, User, UserPayload } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  readonly users$: Observable<User[]> = this.usersSubject.asObservable();

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      tap((users) => this.usersSubject.next(users)),
      catchError((error) => throwError(() => error)),
    );
  }

  getTeachers(): Observable<TeacherRow[]> {
    return this.http
      .get<TeacherRow[]>(`${this.apiUrl}/teachers`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getStudents(): Observable<StudentRow[]> {
    return this.http
      .get<StudentRow[]>(`${this.apiUrl}/students`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getStaff(): Observable<StaffRow[]> {
    return this.http
      .get<StaffRow[]>(`${this.apiUrl}/staff`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  enrollStudent(
    studentId: number,
    courseId: number,
    cycle = '2026-II',
  ): Observable<StudentActiveCourse> {
    return this.http
      .post<StudentActiveCourse>(`${this.apiUrl}/enrollments`, {
        student_id: studentId,
        course_id: courseId,
        cycle,
      })
      .pipe(catchError((error) => throwError(() => error)));
  }

  unenrollStudent(enrollmentId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/enrollments/${enrollmentId}`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  createUser(payload: UserPayload): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, payload).pipe(
      tap((user) => this.usersSubject.next([user, ...this.usersSubject.value])),
      catchError((error) => throwError(() => error)),
    );
  }

  updateUser(id: number, payload: UserPayload): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, payload).pipe(
      tap((updated) =>
        this.usersSubject.next(
          this.usersSubject.value.map((user) => (user.id === id ? updated : user)),
        ),
      ),
      catchError((error) => throwError(() => error)),
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`).pipe(
      tap(() =>
        this.usersSubject.next(this.usersSubject.value.filter((user) => user.id !== id)),
      ),
      catchError((error) => throwError(() => error)),
    );
  }

  checkEmailAvailable(email: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('email', email);
    if (excludeId !== undefined) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http
      .get<{ available: boolean }>(`${this.apiUrl}/users/check-email`, { params })
      .pipe(
        map((response) => response.available),
        catchError((error) => throwError(() => error)),
      );
  }
}
