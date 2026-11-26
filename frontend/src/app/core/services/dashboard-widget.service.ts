import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgendaEvent,
  NoticeItem,
  WeeklyAttendance,
} from '../models/dashboard-widgets.model';

export interface AgendaEventPayload {
  event_date: string;
  event_time: string;
  title: string;
  tag: string;
  tone: 'violet' | 'amber' | 'mint';
}

@Injectable({
  providedIn: 'root',
})
export class DashboardWidgetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAgenda(): Observable<AgendaEvent[]> {
    return this.http
      .get<AgendaEvent[]>(`${this.apiUrl}/agenda`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getAllAgenda(): Observable<AgendaEvent[]> {
    return this.http
      .get<AgendaEvent[]>(`${this.apiUrl}/agenda?all=1`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  createAgendaEvent(payload: AgendaEventPayload): Observable<AgendaEvent> {
    return this.http
      .post<AgendaEvent>(`${this.apiUrl}/agenda`, payload)
      .pipe(catchError((error) => throwError(() => error)));
  }

  deleteAgendaEvent(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/agenda/${id}`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getWeeklyAttendance(): Observable<WeeklyAttendance[]> {
    return this.http
      .get<WeeklyAttendance[]>(`${this.apiUrl}/attendance/weekly`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  getNotices(): Observable<NoticeItem[]> {
    return this.http
      .get<NoticeItem[]>(`${this.apiUrl}/notices`)
      .pipe(catchError((error) => throwError(() => error)));
  }
}
