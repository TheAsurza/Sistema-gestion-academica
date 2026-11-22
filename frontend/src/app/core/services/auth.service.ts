import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, JwtPayload, LoginRequest } from '../models/auth.model';
import { User, UserRole } from '../models/user.model';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly currentUserSubject: BehaviorSubject<User | null>;
  readonly currentUser$: Observable<User | null>;

  constructor() {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.loadInitialUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      }),
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      if (token || localStorage.getItem(USER_KEY)) {
        this.clearSession();
      }
      return false;
    }
    return true;
  }

  isTokenExpired(token: string): boolean {
    if (!token) {
      return true;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    try {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        base64 += '='.repeat(4 - pad);
      }

      const payload = JSON.parse(atob(base64)) as Partial<JwtPayload>;
      if (typeof payload.exp !== 'number') {
        return true;
      }

      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return !!user && roles.includes(user.role);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private loadInitialUser(): User | null {
    const token = this.getToken();
    const rawUser = localStorage.getItem(USER_KEY);

    if (!token || !rawUser || this.isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
