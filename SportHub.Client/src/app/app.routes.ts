import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { SportsComponent } from './pages/sports/sports.component';
import { SportDetailsComponent } from './pages/sport-details/sport-details.component';
import { BookingsComponent } from './pages/bookings/bookings.component';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'sports', component: SportsComponent, canActivate: [authGuard] },
  { path: 'sport/:id', component: SportDetailsComponent, canActivate: [authGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },

];
