import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StorageService } from '@services/storage.service';
import { AuthService } from '@services/auth.service';
import { StorageKey, AuthModalRoute } from '@core/enums';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const storageService = inject(StorageService);
  const authService = inject(AuthService);

  const token = storageService.getItem(StorageKey.JWT_TOKEN);
  if (token && storageService.isTokenValid(token)) {
    return true;
  }

  // Expired or not found → prepare sign-in modal UrlTree remembering where the user was headed.
  // Drop the modal outlet from the target, otherwise the sign-in modal reopens after login.
  const target = router.parseUrl(state.url);
  delete target.root.children['modal'];
  const signInTree = router.createUrlTree(
    [{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }],
    { queryParams: { returnUrl: router.serializeUrl(target) } },
  );

  // If a refresh token is present in sessionStorage, silently rotate before redirecting
  if (authService.hasRefreshToken()) {
    return authService.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        authService.logOut(false);
        return of(signInTree);
      }),
    );
  }

  return signInTree;
};
