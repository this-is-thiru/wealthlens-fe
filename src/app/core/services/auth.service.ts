import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest } from '../../features/auth/models/login-request.model';
import {
  LoginResponse,
  RefreshResponse,
} from '../../features/auth/models/login-response.model';
import { RegisterRequest } from '../../features/auth/models/register-request.model';
import { PrivacyNotice } from '../../features/auth/models/privacy-notice.model';
import { StorageService } from './storage.service';
import { BaseurlService } from './baseurl.service';
import { NotificationService } from './notification.service';
import { StorageKey, UserRole, AuthModalRoute } from '@core/enums';

/**
 * Refresh token transport mode. Defaults to `session-storage` for the current
 * backend contract (body `{ refresh_token }`), and is isolated so a future
 * `HttpOnly`/`Secure`/`SameSite` cookie mode can be enabled without changing callers.
 */
export type RefreshTokenTransport = 'session-storage' | 'cookie';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  static readonly DEMO_EMAIL = 'demo@wealthlens.com';
  private static readonly PROACTIVE_REFRESH_LEAD_MS = 60_000;

  private http = inject(HttpClient);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private BASE_URL = inject(BaseurlService);
  private notificationService = inject(NotificationService);

  private readonly refreshTokenTransport: RefreshTokenTransport =
    'session-storage';
  private inFlightRefresh$: Observable<RefreshResponse> | null = null;
  private privacyNotice$: Observable<PrivacyNotice> | null = null;

  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  isLoggedIn = signal(this.isUserAuthenticated());
  userEmail = signal<string | null>(
    this.storageService.getItem(StorageKey.USER_EMAIL),
  );
  userRoles = signal<string[]>(this.getInitialRoles());
  userRole = computed(() => this.userRoles()[0] || null);
  isDemo = computed(
    () => this.isLoggedIn() && this.userEmail() === AuthService.DEMO_EMAIL,
  );
  isSuperUser = computed(() => this.hasRole(UserRole.SUPER_USER));
  isAdminUser = computed(
    () => this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_USER),
  );

  constructor() {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
    const savedEmail = this.storageService.getItem(StorageKey.USER_EMAIL);

    if (token && this.storageService.isTokenValid(token)) {
      const email =
        savedEmail || this.storageService.getUserEmailFromToken(token);
      if (email) this.userEmail.set(email);
      this.userRoles.set(
        this.storageService.getUserAuthoritiesFromToken(token),
      );
      this.isLoggedIn.set(true);
      this.startAutoLogout(token);
    } else {
      this.isLoggedIn.set(false);
      this.userRoles.set([]);
    }
  }

  private getInitialRoles(): string[] {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
    if (token && this.storageService.isTokenValid(token)) {
      return this.storageService.getUserAuthoritiesFromToken(token);
    }
    return [];
  }

  getPrivacyNoticeUrl(): string {
    return `${this.BASE_URL.getBaseUrl()}/privacy`;
  }

  getPrivacyNotice(forceRefresh = false): Observable<PrivacyNotice> {
    if (!this.privacyNotice$ || forceRefresh) {
      this.privacyNotice$ = this.http
        .get<PrivacyNotice>(
          `${this.BASE_URL.getBaseUrl()}/api/v1/public/privacy/rights`,
        )
        .pipe(
          shareReplay(1),
          catchError((err) => {
            this.privacyNotice$ = null;
            return throwError(() => err);
          }),
        );
    }
    return this.privacyNotice$;
  }

  login(user: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.BASE_URL.getBaseUrl()}/api/v1/public/auth/login`,
        user,
      )
      .pipe(
        map((res) => {
          this.applyAuthTokens(res.access_token, res.refresh_token, res.email);
          return res;
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          return throwError(() => error);
        }),
      );
  }

  register(user: RegisterRequest): Observable<string> {
    return this.http
      .post(`${this.BASE_URL.getBaseUrl()}/api/v1/public/auth/register`, user, {
        responseType: 'text',
      })
      .pipe(
        catchError((error) => {
          console.error('Registration failed:', error);
          return throwError(() => error);
        }),
      );
  }

  hasRefreshToken(): boolean {
    if (this.refreshTokenTransport === 'cookie') {
      return true;
    }
    return !!this.getStoredRefreshToken();
  }

  /**
   * Single-flight refresh-token rotation: concurrent callers share the same in-flight
   * HTTP request so refresh-token reuse revocation is never triggered.
   */
  refreshToken(): Observable<RefreshResponse> {
    if (this.inFlightRefresh$) {
      return this.inFlightRefresh$;
    }

    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/public/auth/token/refresh`;
    let request$: Observable<RefreshResponse>;

    if (this.refreshTokenTransport === 'cookie') {
      request$ = this.http.post<RefreshResponse>(
        url,
        {},
        { withCredentials: true },
      );
    } else {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) {
        return throwError(() => new Error('No refresh token available'));
      }
      request$ = this.http.post<RefreshResponse>(url, {
        refresh_token: refreshToken,
      });
    }

    this.inFlightRefresh$ = request$.pipe(
      tap((res) => {
        this.applyAuthTokens(res.access_token, res.refresh_token);
      }),
      finalize(() => {
        this.inFlightRefresh$ = null;
      }),
      shareReplay(1),
    );

    return this.inFlightRefresh$;
  }

  logOut(redirect = true, returnUrl?: string): void {
    const wasDemo = this.isDemo();
    const refreshToken = this.getStoredRefreshToken();

    this.clearLogoutTimer();
    this.storageService.removeItem(StorageKey.JWT_TOKEN);
    this.storageService.removeItem(StorageKey.USER_EMAIL);
    this.clearStoredRefreshToken();
    this.userEmail.set(null);
    this.userRoles.set([]);
    this.isLoggedIn.set(false);

    if (!wasDemo && (refreshToken || this.refreshTokenTransport === 'cookie')) {
      const url = `${this.BASE_URL.getBaseUrl()}/api/v1/public/auth/logout`;
      const logoutCall$ =
        this.refreshTokenTransport === 'cookie'
          ? this.http.post<void>(url, {}, { withCredentials: true })
          : this.http.post<void>(url, { refresh_token: refreshToken });

      logoutCall$.pipe(catchError(() => EMPTY)).subscribe();
    }

    if (redirect) {
      if (returnUrl) {
        this.router.navigate(
          [{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }],
          {
            queryParams: { returnUrl },
          },
        );
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  loginAsDemo(): void {
    const payloadObj = {
      sub: 'demo@wealthlens.com',
      email: 'demo@wealthlens.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      authorities: [`ROLE_${UserRole.USER}`],
      role: UserRole.USER,
    };
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify(payloadObj)) +
      '.demoSignature';
    this.clearStoredRefreshToken();
    this.storageService.setItem(StorageKey.JWT_TOKEN, token);
    this.storageService.setItem(StorageKey.USER_EMAIL, 'demo@wealthlens.com');
    this.userEmail.set('demo@wealthlens.com');
    this.userRoles.set([UserRole.USER]);
    this.startAutoLogout(token);
    this.isLoggedIn.set(true);
    this.router.navigate(['/portfolio-analytics']);
  }

  isUserAuthenticated(): boolean {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
    return !!token && this.storageService.isTokenValid(token);
  }

  getUserEmail(): string | null {
    return this.userEmail();
  }

  changePassword(
    email: string,
    oldPassword: string,
    newPassword: string,
  ): Observable<string> {
    return this.http.put(
      `${this.BASE_URL.getBaseUrl()}/api/v1/me/auth/password`,
      {
        email,
        password: oldPassword,
        newPassword,
      },
      { responseType: 'text' },
    );
  }

  getUserRole(): string | null {
    return this.userRole();
  }

  getUserRoles(): string[] {
    return this.userRoles();
  }

  hasRole(role: string): boolean {
    const normalized = role.toUpperCase().replace(/^ROLE_/, '');
    return this.userRoles().includes(normalized);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_USER);
  }

  isSuperUserRole(): boolean {
    return this.hasRole(UserRole.SUPER_USER);
  }

  private applyAuthTokens(
    accessToken: string,
    refreshToken?: string,
    fallbackEmail?: string,
  ): void {
    this.storageService.setItem(StorageKey.JWT_TOKEN, accessToken);
    if (this.refreshTokenTransport === 'session-storage' && refreshToken) {
      this.storageService.setSessionItem(
        StorageKey.REFRESH_TOKEN,
        refreshToken,
      );
    }

    const resolvedEmail =
      fallbackEmail ||
      this.storageService.getUserEmailFromToken(accessToken) ||
      this.storageService.getItem(StorageKey.USER_EMAIL);
    if (resolvedEmail) {
      this.storageService.setItem(StorageKey.USER_EMAIL, resolvedEmail);
      this.userEmail.set(resolvedEmail);
    }

    const authorities =
      this.storageService.getUserAuthoritiesFromToken(accessToken);
    this.userRoles.set(authorities);
    this.isLoggedIn.set(true);
    this.startAutoLogout(accessToken);
  }

  private getStoredRefreshToken(): string | null {
    return this.storageService.getSessionItem(StorageKey.REFRESH_TOKEN);
  }

  private clearStoredRefreshToken(): void {
    this.storageService.removeSessionItem(StorageKey.REFRESH_TOKEN);
  }

  private startAutoLogout(token: string): void {
    this.clearLogoutTimer();
    const expiry = this.storageService.getTokenExpiry(token);
    if (!expiry) return;

    const timeout = expiry - Date.now();
    if (timeout <= 0) {
      this.logOut(false);
      return;
    }

    // Proactively rotate access token 60s before expiry when a refresh token exists
    if (!this.isDemo() && this.hasRefreshToken()) {
      const refreshDelay = Math.max(
        0,
        timeout - AuthService.PROACTIVE_REFRESH_LEAD_MS,
      );
      this.proactiveRefreshTimer = setTimeout(() => {
        this.refreshToken().subscribe({
          error: () => {
            this.logOut(true);
            this.notificationService.addNotification(
              'Session Expired',
              'Your session has expired. Please sign in again.',
              'warning',
              null,
            );
          },
        });
      }, refreshDelay);
      return;
    }

    // Fallback (e.g. demo session without refresh token): logout at expiry
    this.logoutTimer = setTimeout(() => {
      this.logOut(true);
      this.notificationService.addNotification(
        'Session Expired',
        'Your session has expired. Please sign in again.',
        'warning',
        null,
      );
    }, timeout);

    const warningDelay = timeout - 120_000;
    if (warningDelay > 0) {
      this.warningTimer = setTimeout(() => {
        this.notificationService.addNotification(
          'Session Expiring Soon',
          'Your session will expire in 2 minutes. Please save your work.',
          'warning',
          null,
        );
      }, warningDelay);
    }
  }

  private clearLogoutTimer(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer);
      this.proactiveRefreshTimer = null;
    }
  }
}
