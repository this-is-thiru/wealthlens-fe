import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '@services/auth.service';
import { BaseurlService } from '@services/baseurl.service';
import { NotificationService } from '@services/notification.service';
import { StorageKey } from '@core/enums';
import { environment } from '@env/environment';

function makeJwt(email: string, expOffsetSec = 900): string {
  const payload = {
    sub: email,
    email,
    exp: Math.floor(Date.now() / 1000) + expOffsetSec,
  };
  return `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload))}.sig`;
}

describe('AuthInterceptor (API v1)', () => {
  const API = environment.apiUrl;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: { url: string; navigate: ReturnType<typeof vi.fn> };
  let notificationSpy: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    routerSpy = { url: '/portfolio-analytics', navigate: vi.fn() };
    notificationSpy = { addNotification: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([AuthInterceptor])),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => API } },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does NOT unwrap { data } bodies (W-359a) and skips Bearer on /api/v1/public/', () => {
    localStorage.setItem(StorageKey.JWT_TOKEN, makeJwt('u@test.com'));

    let pubRes: unknown;
    http
      .get(`${API}/api/v1/public/privacy/rights`)
      .subscribe((r) => (pubRes = r));
    const pubReq = httpMock.expectOne(`${API}/api/v1/public/privacy/rights`);
    expect(pubReq.request.headers.has('Authorization')).toBe(false);
    pubReq.flush({ data: { raw: true }, version: '1.0' });
    expect(pubRes).toEqual({ data: { raw: true }, version: '1.0' });
  });

  it('refreshes once on concurrent 401s and retries both requests with rotated token', () => {
    const expiredJwt = makeJwt('u@test.com', -60);
    const freshJwt = makeJwt('u@test.com', 900);
    localStorage.setItem(StorageKey.JWT_TOKEN, expiredJwt);
    sessionStorage.setItem(StorageKey.REFRESH_TOKEN, 'rt-1');

    let resA: unknown;
    let resB: unknown;
    http.get(`${API}/api/v1/me/portfolio/stocks`).subscribe((r) => (resA = r));
    http.get(`${API}/api/v1/me/corporate-actions`).subscribe((r) => (resB = r));

    const reqA = httpMock.expectOne(`${API}/api/v1/me/portfolio/stocks`);
    const reqB = httpMock.expectOne(`${API}/api/v1/me/corporate-actions`);
    expect(reqA.request.headers.get('Authorization')).toBe(
      `Bearer ${expiredJwt}`,
    );
    expect(reqB.request.headers.get('Authorization')).toBe(
      `Bearer ${expiredJwt}`,
    );

    reqA.flush(
      { title: 'Unauthorized', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
    reqB.flush(
      { title: 'Unauthorized', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Exactly ONE refresh request despite two concurrent 401s
    const refreshReq = httpMock.expectOne(
      `${API}/api/v1/public/auth/token/refresh`,
    );
    expect(refreshReq.request.headers.has('Authorization')).toBe(false);
    refreshReq.flush({
      access_token: freshJwt,
      expires_in: 900,
      refresh_token: 'rt-2',
      tokenType: 'Bearer',
    });

    const retryA = httpMock.expectOne(`${API}/api/v1/me/portfolio/stocks`);
    const retryB = httpMock.expectOne(`${API}/api/v1/me/corporate-actions`);
    expect(retryA.request.headers.get('Authorization')).toBe(
      `Bearer ${freshJwt}`,
    );
    expect(retryB.request.headers.get('Authorization')).toBe(
      `Bearer ${freshJwt}`,
    );
    retryA.flush([{ stockCode: 'INFY' }]);
    retryB.flush({
      content: [],
      page: { number: 0, size: 50, totalElements: 0, totalPages: 0 },
    });

    expect(resA).toEqual([{ stockCode: 'INFY' }]);
    expect(resB).toBeTruthy();
    expect(sessionStorage.getItem(StorageKey.REFRESH_TOKEN)).toBe('rt-2');
  });

  it('logs out and redirects to sign-in when refresh fails on 401', () => {
    localStorage.setItem(StorageKey.JWT_TOKEN, makeJwt('u@test.com', -60));
    sessionStorage.setItem(StorageKey.REFRESH_TOKEN, 'rt-revoked');

    let errored = false;
    http.get(`${API}/api/v1/me/portfolio/stocks`).subscribe({
      error: () => (errored = true),
    });

    httpMock
      .expectOne(`${API}/api/v1/me/portfolio/stocks`)
      .flush(
        { title: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock
      .expectOne(`${API}/api/v1/public/auth/token/refresh`)
      .flush(
        { detail: 'Refresh token revoked' },
        { status: 401, statusText: 'Unauthorized' },
      );

    // Best-effort logout call may be fired
    const logoutReqs = httpMock.match(`${API}/api/v1/public/auth/logout`);
    logoutReqs.forEach((r) =>
      r.flush(null, { status: 204, statusText: 'No Content' }),
    );

    expect(errored).toBe(true);
    expect(localStorage.getItem(StorageKey.JWT_TOKEN)).toBeNull();
    expect(sessionStorage.getItem(StorageKey.REFRESH_TOKEN)).toBeNull();
    expect(notificationSpy.addNotification).toHaveBeenCalledWith(
      'Session Expired',
      'Your session has expired. Please sign in again.',
      'warning',
      null,
    );
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  it('surfaces RFC 9457 ProblemDetail detail on 403 Access Denied', () => {
    localStorage.setItem(StorageKey.JWT_TOKEN, makeJwt('u@test.com'));

    http
      .post(`${API}/api/v1/admin/corporate-actions`, {})
      .subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${API}/api/v1/admin/corporate-actions`)
      .flush(
        { title: 'Forbidden', status: 403, detail: 'SUPER_USER role required' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(notificationSpy.addNotification).toHaveBeenCalledWith(
      'Access Denied',
      'SUPER_USER role required',
      'error',
      null,
    );
  });
});
