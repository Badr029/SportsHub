import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { AdminBookingResponse } from '../../../models/booking.model';

@Component({
  selector: 'app-admin-bookings',
  imports: [FormsModule, NavbarComponent],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css'
})
export class AdminBookingsComponent implements OnInit {
  bookings = signal<AdminBookingResponse[]>([]);
  statusFilter = signal('All');
  page = signal(1);
  pageSize = 6;
  totalPages = signal(1);
  totalCount = signal(0);
  loading = signal(true);
  error = signal('');
  success = signal('');

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.adminService.getAdminBookings(this.page(), this.pageSize, this.statusFilter()).subscribe({
      next: result => {
        this.bookings.set(result.items);
        this.totalPages.set(result.totalPages || 1);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: error => {
        if (error.status === 0 ) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to load bookings.'));
        }

        this.loading.set(false);
      }
    });
  }

  changeStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadBookings();
  }

  nextPage() {
    if (this.page() >= this.totalPages()) {
      return;
    }

    this.page.set(this.page() + 1);
    this.loadBookings();
  }

  previousPage() {
    if (this.page() <= 1) {
      return;
    }

    this.page.set(this.page() - 1);
    this.loadBookings();
  }

  confirmBooking(id: number) {
    this.runAction(this.adminService.confirmBooking(id), 'Booking confirmed.');
  }

  markPickedUp(id: number) {
    this.runAction(this.adminService.markPickedUp(id), 'Equipment marked as picked up.');
  }

  markReturned(id: number) {
    this.runAction(this.adminService.markReturned(id), 'Equipment marked as returned.');
  }

  completeBooking(id: number) {
    this.runAction(this.adminService.completeBooking(id), 'Booking completed.');
  }

  cancelBooking(id: number) {
    this.runAction(this.adminService.cancelBooking(id), 'Booking cancelled.');
  }

  runAction(request: any, successMessage: string) {
    this.error.set('');
    this.success.set('');

    request.subscribe({
      next: () => {
        this.success.set(successMessage);
        this.loadBookings();
      },
      error: (error: any) => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Action failed.'));
        }
      }
    });
  }

  canConfirm(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) && booking.status === 'Pending';
  }

  canPickup(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) &&
      booking.bookingType === 'Equipment' &&
      booking.rentalStatus === 'PendingPickup';
  }

  canReturn(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) &&
      booking.bookingType === 'Equipment' &&
      booking.rentalStatus === 'Active';
  }

  canComplete(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) && booking.status === 'Confirmed';
  }

  isClosedBooking(booking: AdminBookingResponse) {
    return booking.status === 'Cancelled' || booking.status === 'Completed';
  }

  canCancel(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking);
  }

  filteredBookings() {
    return this.bookings();
  }

  getStatusOrder(status: string) {
    if (status === 'Pending') {
      return 1;
    }

    if (status === 'Confirmed') {
      return 2;
    }

    if (status === 'Cancelled') {
      return 3;
    }

    if (status === 'Completed') {
      return 4;
    }

    return 5;
  }

  isFacilityBooking(booking: AdminBookingResponse) {
    return booking.bookingType === 'Facility' || booking.bookingType === 'Package';
  }

  isEquipmentBooking(booking: AdminBookingResponse) {
    return booking.bookingType === 'Equipment' || booking.bookingType === 'Package';
  }

  formatDateTime(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    return new Date(value).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatTime(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    return new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  getErrorMessage(error: any, fallback: string) {
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.message) {
      return error.message;
    }

    return fallback;
  }
}
