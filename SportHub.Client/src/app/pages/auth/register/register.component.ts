import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name = ''
  email = ''
  phoneNumber = ''
  password = ''
  confirmPassword = ''
  error = signal('')
  loading = signal(false)

  constructor(private authService: AuthService, private router: Router) { }

  register() {
    this.error.set('');
    if (!this.name || !this.email || !this.phoneNumber || !this.password || !this.confirmPassword) {
      this.error.set('Please enter required field.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.loading.set(true);

    this.authService.register({
      name: this.name,
      email: this.email,
      phoneNumber: this.phoneNumber,
      password: this.password
    }).subscribe({
      next: () => {
        this.router.navigateByUrl('/sports');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(error.error || 'Registration failed.');
        }

        this.loading.set(false);
      }
    });
  }

}
