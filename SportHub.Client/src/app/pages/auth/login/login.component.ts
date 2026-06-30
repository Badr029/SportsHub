import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(private authService: AuthService, private router: Router) { }

  login() {
    this.error.set('');
    if (!this.email || !this.password){
      this.error.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: response =>{
        if (response.role === 'Admin'){
          this.router.navigateByUrl('/admin/bookings');
          return;
        }
        this.router.navigateByUrl('/sports');

      },
        error: error => {
          if (error.status === 0) {
            this.error.set('Cannot connect to the server.');
          } else if (error.status === 401) {
            this.error.set('Invalid email or password.');
          } else {
            this.error.set(error.error || 'Login failed.');
          }

          this.loading.set(false);
        }
    });
  }


}
