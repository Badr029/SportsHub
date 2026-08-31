import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';

type AuthMode = 'login' | 'register';
type Field = 'email' | 'password' | 'name' | 'phoneNumber' | 'confirmPassword';

/** FR-AUTH-02, mirrored from AuthController.ValidatePassword. */
interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit {
  mode = signal<AuthMode>('login');
  loading = signal(false);
  error = signal('');
  fieldErrors = signal<Partial<Record<Field, string>>>({});

  // Login
  email = '';
  password = '';
  showPassword = false;

  // Register
  name = '';
  regEmail = '';
  phoneNumber = '';
  regPassword = '';
  confirmPassword = '';
  showRegPassword = false;
  showConfirmPassword = false;

  /**
   * The server rejects anything that fails these (AuthController.ValidatePassword),
   * so the client checks exactly the same list. Anything weaker just moves the
   * rejection to after the round trip.
   */
  readonly passwordRules: PasswordRule[] = [
    { id: 'len', label: 'At least 8 characters', test: v => v.length >= 8 },
    { id: 'upper', label: 'An uppercase letter', test: v => /[A-Z]/.test(v) },
    { id: 'lower', label: 'A lowercase letter', test: v => /[a-z]/.test(v) },
    { id: 'digit', label: 'A number', test: v => /\d/.test(v) },
    { id: 'special', label: 'A special character', test: v => /[^A-Za-z0-9]/.test(v) }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit() {
    const path = this.route.snapshot.routeConfig?.path;
    this.mode.set(path === 'register' ? 'register' : 'login');
  }

  /**
   * Switching swaps the panel in place rather than navigating, so the slide is
   * not interrupted by a component teardown. The URL is still corrected so
   * /login and /register stay real, shareable, bookmarkable routes and the
   * guard's redirect to /login keeps working (FR-AUTH-06).
   */
  switchTo(mode: AuthMode) {
    if (this.mode() === mode) {
      return;
    }

    this.mode.set(mode);
    this.error.set('');
    this.fieldErrors.set({});
    this.location.replaceState('/' + mode);
  }

  passwordRuleMet(rule: PasswordRule) {
    return rule.test(this.regPassword);
  }

  metRuleCount() {
    return this.passwordRules.filter(rule => rule.test(this.regPassword)).length;
  }

  fieldError(field: Field) {
    return this.fieldErrors()[field] ?? '';
  }

  clearFieldError(field: Field) {
    if (!this.fieldErrors()[field]) {
      return;
    }

    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
  }

  // --- Login ----------------------------------------------------------------

  login() {
    this.error.set('');

    const errors: Partial<Record<Field, string>> = {};

    if (!this.email.trim()) {
      errors.email = 'Enter the email you registered with.';
    } else if (!this.isEmail(this.email)) {
      errors.email = 'That does not look like an email address.';
    }

    if (!this.password) {
      errors.password = 'Enter your password.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    this.loading.set(true);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: response => {
        this.router.navigateByUrl(response.role === 'Admin' ? '/admin/bookings' : '/sports');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot reach the server. Check that the API is running, then try again.');
        } else if (error.status === 401) {
          this.error.set('That email and password do not match an account.');
        } else {
          this.error.set(error.error || 'Sign in failed. Please try again.');
        }

        this.loading.set(false);
      }
    });
  }

  // --- Register -------------------------------------------------------------

  register() {
    this.error.set('');

    const errors: Partial<Record<Field, string>> = {};

    if (!this.name.trim()) {
      errors.name = 'Enter your name.';
    }

    if (!this.regEmail.trim()) {
      errors.email = 'Enter your email address.';
    } else if (!this.isEmail(this.regEmail)) {
      errors.email = 'That does not look like an email address.';
    }

    if (!this.phoneNumber.trim()) {
      errors.phoneNumber = 'Enter a phone number so the venue can reach you.';
    } else if (!this.isValidPhoneNumber(this.phoneNumber)) {
      errors.phoneNumber = 'Use 10 to 15 digits, for example 01012345678.';
    }

    if (!this.regPassword) {
      errors.password = 'Choose a password.';
    } else if (this.metRuleCount() < this.passwordRules.length) {
      errors.password = 'Your password does not meet all the requirements below.';
    }

    if (!this.confirmPassword) {
      errors.confirmPassword = 'Repeat your password.';
    } else if (this.regPassword !== this.confirmPassword) {
      errors.confirmPassword = 'The two passwords do not match.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    this.loading.set(true);

    this.authService.register({
      name: this.name,
      email: this.regEmail,
      phoneNumber: this.phoneNumber,
      password: this.regPassword
    }).subscribe({
      next: () => {
        this.router.navigateByUrl('/sports');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot reach the server. Check that the API is running, then try again.');
        } else {
          this.error.set(error.error || 'Registration failed. Please try again.');
        }

        this.loading.set(false);
      }
    });
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  isValidPhoneNumber(phoneNumber: string) {
    return /^\+?\d{10,15}$/.test(phoneNumber.trim());
  }
}
