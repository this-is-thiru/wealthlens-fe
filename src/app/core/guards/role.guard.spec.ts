import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { roleGuard, superUserGuard, adminGuard } from './role.guard';
import { UserRole } from '@core/enums';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

describe('RoleGuards', () => {
  let mockAuthService: MockedObject<AuthService>;
  let mockRouter: MockedObject<Router>;
  let mockNotificationService: MockedObject<NotificationService>;
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/admin-test' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      isUserAuthenticated: vi.fn().mockName('AuthService.isUserAuthenticated'),
      hasRole: vi.fn().mockName('AuthService.hasRole'),
    } as unknown as MockedObject<AuthService>;
    mockRouter = {
      createUrlTree: vi.fn().mockName('Router.createUrlTree'),
    } as unknown as MockedObject<Router>;
    mockNotificationService = {
      addNotification: vi.fn().mockName('NotificationService.addNotification'),
    } as unknown as MockedObject<NotificationService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });
  });

  describe('roleGuard', () => {
    it('should redirect to sign-in modal if user is not authenticated', () => {
      mockAuthService.isUserAuthenticated.mockReturnValue(false);
      const guard = roleGuard([UserRole.ADMIN]);

      TestBed.runInInjectionContext(() => {
        guard(dummyRoute, dummyState);
      });

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        [{ outlets: { primary: ['home'], modal: ['sign-in'] } }],
        { queryParams: { returnUrl: '/admin-test' } },
      );
    });

    it('should allow navigation if user possesses one of the allowed roles', () => {
      mockAuthService.isUserAuthenticated.mockReturnValue(true);
      mockAuthService.hasRole.mockImplementation(
        (role) => role === UserRole.ADMIN,
      );
      const guard = roleGuard([UserRole.ADMIN, UserRole.SUPER_USER]);

      let result: any;
      TestBed.runInInjectionContext(() => {
        result = guard(dummyRoute, dummyState);
      });

      expect(result).toBe(true);
    });

    it('should deny navigation, show notification, and redirect if role is missing', () => {
      mockAuthService.isUserAuthenticated.mockReturnValue(true);
      mockAuthService.hasRole.mockReturnValue(false);
      const guard = roleGuard([UserRole.SUPER_USER]);

      TestBed.runInInjectionContext(() => {
        guard(dummyRoute, dummyState);
      });

      expect(mockNotificationService.addNotification).toHaveBeenCalledWith(
        'Access Restricted',
        expect.any(String),
        'error',
        null,
      );
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
        '/portfolio-analytics',
      ]);
    });
  });

  describe('superUserGuard', () => {
    it('should allow access when user has SUPER_USER role', () => {
      mockAuthService.isUserAuthenticated.mockReturnValue(true);
      mockAuthService.hasRole.mockImplementation(
        (role) => role === UserRole.SUPER_USER,
      );

      let result: any;
      TestBed.runInInjectionContext(() => {
        result = superUserGuard(dummyRoute, dummyState);
      });

      expect(result).toBe(true);
    });
  });
});
