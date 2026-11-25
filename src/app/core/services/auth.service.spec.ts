import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { BaseurlService } from './baseurl.service';
import { NotificationService } from './notification.service';
import { StorageKey } from '@core/enums';

function makeJwt(
  email: string,
  expOffsetSec = 900,
  authorities = ['ROLE_USER'],
): string {
  const payload = {
    sub: email,
    email,
    exp: Math.floor(Date.now() / 1000) + expOffsetSec,
    authorities,
  };
  return `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload))}.sig`;
}

describe('AuthService (API v1)', () => {
  const BASE = 'http://api.test';
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
        { provide: Router, useValue: routerSpy },
        {
          provide: NotificationService,
          useValue: { addNotification: vi.fn() },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('POSTs login to /api/v1/public/auth/login, stores JWT in localStorage and refresh_token in sessionStorage', () => {
    const jwt = makeJwt('user@example.com');
    let result: unknown;

    service
      .login({ email: 'user@example.com', password: 'secret' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${BASE}/api/v1/public/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      access_token: jwt,
      expires_in: 900,
      refresh_token: 'refresh-1',
      tokenType: 'Bearer',
    });

    expect(result).toBeTruthy();
    expect(localStorage.getItem(StorageKey.JWT_TOKEN)).toBe(jwt);
    expect(sessionStorage.getItem(StorageKey.REFRESH_TOKEN)).toBe('refresh-1');
    expect(localStorage.getItem(StorageKey.REFRESH_TOKEN)).toBeNull();
    expect(service.userEmail()).toBe('user@example.com');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('POSTs register to /api/v1/public/auth/register with text responseType and privacyNoticeVersion', () => {
    let responseText = '';

    service
      .register({
        email: 'new@example.com',
        password: 'password123',
        role: 'USER',
        privacyNoticeVersion: '2026-01',
      })
      .subscribe((res) => (responseText = res));

    const req = httpMock.expectOne(`${BASE}/api/v1/public/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');
    expect(req.request.body).toEqual({
      email: 'new@example.com',
      password: 'password123',
      role: 'USER',
      privacyNoticeVersion: '2026-01',
    });
    req.flush('User registered successfully');

    expect(responseText).toBe('User registered successfully');
  });

  it('deduplicates concurrent refreshToken() calls (single-flight) and rotates both tokens', () => {
    sessionStorage.setItem(StorageKey.REFRESH_TOKEN, 'refresh-old');
    const newJwt = makeJwt('user@example.com');
    const results: string[] = [];

    service.refreshToken().subscribe((r) => results.push(r.access_token));
    service.refreshToken().subscribe((r) => results.push(r.access_token));

    const req = httpMock.expectOne(`${BASE}/api/v1/public/auth/token/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh_token: 'refresh-old' });
    req.flush({
      access_token: newJwt,
      expires_in: 900,
      refresh_token: 'refresh-rotated',
      tokenType: 'Bearer',
    });

    expect(results).toEqual([newJwt, newJwt]);
    expect(localStorage.getItem(StorageKey.JWT_TOKEN)).toBe(newJwt);
    expect(sessionStorage.getItem(StorageKey.REFRESH_TOKEN)).toBe(
      'refresh-rotated',
    );
  });

  it('calls POST /api/v1/public/auth/logout (204) and clears localStorage + sessionStorage on logOut()', () => {
    localStorage.setItem(StorageKey.JWT_TOKEN, makeJwt('user@example.com'));
    sessionStorage.setItem(StorageKey.REFRESH_TOKEN, 'refresh-to-revoke');

    service.logOut(true);

    const req = httpMock.expectOne(`${BASE}/api/v1/public/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh_token: 'refresh-to-revoke' });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(localStorage.getItem(StorageKey.JWT_TOKEN)).toBeNull();
    expect(sessionStorage.getItem(StorageKey.REFRESH_TOKEN)).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('PUTs changePassword to /api/v1/me/auth/password with text responseType', () => {
    let text = '';
    service
      .changePassword('user@example.com', 'oldPass', 'newPass')
      .subscribe((r) => (text = r));

    const req = httpMock.expectOne(`${BASE}/api/v1/me/auth/password`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.responseType).toBe('text');
    expect(req.request.body).toEqual({
      email: 'user@example.com',
      password: 'oldPass',
      newPassword: 'newPass',
    });
    req.flush('Password updated');
    expect(text).toBe('Password updated');
  });
});
