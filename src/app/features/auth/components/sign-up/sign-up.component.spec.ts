import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignUpComponent } from './sign-up.component';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

describe('SignUpComponent (DPDP consent)', () => {
  let component: SignUpComponent;
  let fixture: ComponentFixture<SignUpComponent>;
  let authServiceMock: {
    getPrivacyNoticeUrl: ReturnType<typeof vi.fn>;
    getPrivacyNotice: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authServiceMock = {
      getPrivacyNoticeUrl: vi.fn(() => 'http://api.test/privacy'),
      getPrivacyNotice: vi.fn(() =>
        of({
          rights: [],
          identifier: 'email',
          contact: 'privacy@example.com',
          grievanceResponseDays: 30,
          purposeLapse: 'P3Y',
          version: '2026-01',
        }),
      ),
      register: vi.fn(() => of('Registered')),
    };

    await TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: NotificationService,
          useValue: { addNotification: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('fetches privacyNoticeVersion and keeps consent checkbox unchecked by default', () => {
    expect(component.privacyNoticeVersion).toBe('2026-01');
    expect(component.registrationForm.get('acceptPrivacyNotice')?.value).toBe(
      false,
    );
    expect(component.canSubmit).toBe(false);
  });

  it('blocks submission without explicit consent and submits exact privacyNoticeVersion when consented', () => {
    component.registrationForm.patchValue({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(component.canSubmit).toBe(false);

    component.registrationForm.patchValue({ acceptPrivacyNotice: true });
    expect(component.canSubmit).toBe(true);

    component.onRegistration();
    expect(authServiceMock.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      role: 'USER',
      privacyNoticeVersion: '2026-01',
    });
  });

  it('disables registration when privacyNoticeVersion cannot be retrieved', () => {
    authServiceMock.getPrivacyNotice.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    component.loadPrivacyNotice(true);

    component.registrationForm.patchValue({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      acceptPrivacyNotice: true,
    });

    expect(component.privacyNoticeError).toBe(true);
    expect(component.privacyNoticeVersion).toBeNull();
    expect(component.canSubmit).toBe(false);
  });
});
