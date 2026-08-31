import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
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
  // Both paths render the same component so switching between them is an
  // in-place transition, not a navigation. The routes stay real: direct entry,
  // bookmarks and the auth guard's redirect to /login all still work.
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: 'sports', component: SportsComponent, canActivate: [authGuard] },
  { path: 'sports/:id', component: SportDetailsComponent, canActivate: [authGuard] },
  // The booking flow is a real route so the phone's back button returns to the
  // facility list and a refresh does not lose the step. It renders the same
  // component; on a wide screen the side panel is shown as before.
  { path: 'sports/:id/book', component: SportDetailsComponent, canActivate: [authGuard] },
  { path: 'equipment', component: EquipmentBookingComponent, canActivate: [authGuard] },
  { path: 'equipment/review', component: EquipmentBookingComponent, canActivate: [authGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [authGuard] },
  { path: 'payment/:id', component: PaymentComponent, canActivate: [authGuard] },
  { path: 'admin/bookings', component: AdminBookingsComponent, canActivate: [adminGuard] },
  { path: 'admin/sports', component: AdminSportsComponent, canActivate: [adminGuard] },
  { path: 'admin/sports/:id', component: AdminSportDetailsComponent, canActivate: [adminGuard] },
  { path: 'admin/equipment', component: AdminEquipmentComponent, canActivate: [adminGuard] },
];
