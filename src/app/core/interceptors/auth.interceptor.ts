import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { StorageService } from '@services/storage.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { StorageKey, AuthModalRoute } from '@core/enums';
import { environment } from '@env/environment';
import { extractErrorMessage } from '@core/utils/http-error.util';

/** Prevents infinite 401 refresh loops on a single request. */
export const RETRY_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

function isOwnApiRequest(url: string): boolean {
  return !/^https?:\/\//i.test(url) || url.startsWith(environment.apiUrl);
}

function isPublicApiRequest(url: string): boolean {
  return url.includes('/api/v1/public/');
}

function isPublicAuthRequest(url: string): boolean {
  return (
    url.includes('/api/v1/public/auth/') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register')
  );
}

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApiRequest(req.url)) {
    return next(req);
  }

  const storageService = inject(StorageService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const shouldAttachToken = !isPublicApiRequest(req.url);
  const token = shouldAttachToken
    ? storageService.getItem(StorageKey.JWT_TOKEN)
    : null;

  const cloned = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicAuthRequest(req.url)) {
        const authService = injector.get(AuthService);

        if (authService.isDemo()) {
          return throwError(() => error);
        }

        const alreadyRetried = req.context.get(RETRY_AFTER_REFRESH);
        if (!alreadyRetried && authService.hasRefreshToken()) {
          return authService.refreshToken().pipe(
            switchMap((refreshRes) => {
              const retried = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${refreshRes.access_token}`,
                },
                context: req.context.set(RETRY_AFTER_REFRESH, true),
              });
              return next(retried);
            }),
            catchError((refreshErr) => {
              handleSessionExpired(authService, router, notificationService);
              return throwError(() => refreshErr);
            }),
          );
        }

        handleSessionExpired(authService, router, notificationService);
      } else if (error.status === 403) {
        const detail = extractErrorMessage(
          error,
          'You do not have permission to perform this action.',
        );
        notificationService.addNotification(
          'Access Denied',
          detail,
          'error',
          null,
        );
      }

      return throwError(() => error);
    }),
  );
};

function handleSessionExpired(
  authService: AuthService,
  router: Router,
  notificationService: NotificationService,
): void {
  const currentUrl = router.url;
  authService.logOut(false);
  notificationService.addNotification(
    'Session Expired',
    'Your session has expired. Please sign in again.',
    'warning',
    null,
  );
  void router.navigate(
    [{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }],
    {
      queryParams: { returnUrl: currentUrl },
    },
  );
}
