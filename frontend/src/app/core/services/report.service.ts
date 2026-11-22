import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReportSummary } from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSummary(): Observable<ReportSummary> {
    return this.http
      .get<ReportSummary>(`${this.apiUrl}/reports/summary`)
      .pipe(catchError((error) => throwError(() => error)));
  }
}
