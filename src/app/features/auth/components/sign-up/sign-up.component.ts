import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthService } from '@services/auth.service';
import { RegisterRequest } from '../../models/register-request.model';
import { UserRole, AuthModalRoute } from '@core/enums';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AlertComponent } from '@shared/ui/alert/alert.component';
import {
  extractErrorMessage,
  formatRateLimitMessage,
} from '@core/utils/http-error.util';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    LucideIconsModule,
    ModalComponent,
    InputComponent,
    ButtonComponent,
    AlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent implements OnInit {
  registrationForm: FormGroup;
  isLoading = false;
  hideRegistrationP = true;
  hideRegistrationCP = true;

  privacyNoticeUrl: string;
  privacyNoticeVersion: string | null = null;
  isLoadingPrivacyNotice = false;
  privacyNoticeError = false;

  constructor(
    public router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef,
    private notificationService: NotificationService,
  ) {
    this.registrationForm = this.initForm();
    this.privacyNoticeUrl = this.authService.getPrivacyNoticeUrl();
  }

  ngOnInit(): void {
    this.loadPrivacyNotice();
  }

  get canSubmit(): boolean {
    return (
      this.registrationForm.valid &&
      !!this.privacyNoticeVersion &&
      !this.isLoadingPrivacyNotice &&
      !this.isLoading
    );
  }

  loadPrivacyNotice(forceRefresh = false): void {
    this.isLoadingPrivacyNotice = true;
    this.privacyNoticeError = false;
    this.cd.markForCheck();

    this.authService
      .getPrivacyNotice(forceRefresh)
      .pipe(
        finalize(() => {
          this.isLoadingPrivacyNotice = false;
          this.cd.markForCheck();
        }),
      )
      .subscribe({
        next: (notice) => {
          const version =
            typeof notice?.version === 'string' ? notice.version.trim() : '';
          if (version) {
            this.privacyNoticeVersion = version;
            this.privacyNoticeError = false;
          } else {
            this.privacyNoticeVersion = null;
            this.privacyNoticeError = true;
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.privacyNoticeVersion = null;
          this.privacyNoticeError = true;
          this.cd.markForCheck();
        },
      });
  }

  private initForm(): FormGroup {
    return this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(128),
          ],
        ],
        confirmPassword: ['', Validators.required],
        // Explicit DPDP consent: never preselected
        acceptPrivacyNotice: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onRegistration(): void {
    if (this.registrationForm.invalid || !this.privacyNoticeVersion) {
      Object.values(this.registrationForm.controls).forEach((ctrl) =>
        ctrl.markAsTouched(),
      );
      return;
    }

    this.isLoading = true;
    this.cd.markForCheck();

    const signUpData: RegisterRequest = {
      email: this.registrationForm.get('email')?.value,
      password: this.registrationForm.get('password')?.value,
      role: UserRole.USER,
      privacyNoticeVersion: this.privacyNoticeVersion,
    };

    this.authService
      .register(signUpData)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cd.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.addNotification(
            'Registration Success',
            'Account created successfully! You can now sign in.',
            'success',
          );
          void this.router.navigate(
            [{ outlets: { modal: [AuthModalRoute.SIGN_IN] } }],
            {
              queryParamsHandling: 'preserve',
            },
          );
        },
        error: (err) => {
          console.error('Registration error:', err);

          let message = 'Registration failed. Please try again later.';
          const detail = extractErrorMessage(err, '');
          if (err?.status === 429) {
            message = formatRateLimitMessage(err);
          } else if (
            err?.status === 409 ||
            detail.toLowerCase().includes('already exists')
          ) {
            message =
              detail ||
              'This email is already registered. Please try signing in instead.';
          } else if (err?.status === 400) {
            message = detail || 'Please check your information and try again.';
          } else if (err?.status === 0) {
            message =
              'Unable to connect to the server. Please check your internet connection.';
          } else if (detail) {
            message = detail;
          }

          this.notificationService.addNotification(
            'Registration Failed',
            message,
            'error',
          );
          this.cd.markForCheck();
        },
      });
  }

  onClose(): void {
    void this.router.navigate([{ outlets: { modal: null } }]);
  }
}
