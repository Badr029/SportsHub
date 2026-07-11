import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { SportsComponent } from './pages/sports/sports.component';
import { SportDetailsComponent } from './pages/sport-details/sport-details.component';
import { EquipmentBookingComponent } from './pages/equipment-booking/equipment-booking.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { AdminBookingsComponent } from './pages/admin/admin-bookings/admin-bookings.component';
import { AdminEquipmentComponent } from './pages/admin/admin-equipment/admin-equipment.component';
import { AdminSportsComponent } from './pages/admin/admin-sports/admin-sports.component';
import { AdminSportDetailsComponent } from './pages/admin/admin-sport-details/admin-sport-details.component';
import { PaymentComponent } from './pages/payment/payment.component';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'sports', component: SportsComponent, canActivate: [authGuard] },
  { path: 'sports/:id', component: SportDetailsComponent, canActivate: [authGuard] },
  { path: 'equipment', component: EquipmentBookingComponent, canActivate: [authGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [authGuard] },
  { path: 'payment/:id', component: PaymentComponent, canActivate: [authGuard] },
  { path: 'admin/bookings', component: AdminBookingsComponent, canActivate: [adminGuard] },
  { path: 'admin/sports', component: AdminSportsComponent, canActivate: [adminGuard] },
  { path: 'admin/sports/:id', component: AdminSportDetailsComponent, canActivate: [adminGuard] },
  { path: 'admin/equipment', component: AdminEquipmentComponent, canActivate: [adminGuard] },
];
