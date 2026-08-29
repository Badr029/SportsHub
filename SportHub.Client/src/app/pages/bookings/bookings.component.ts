import { Component, signal , OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';


import {BookingService} from '../../core/services/booking.service';
import {BookingResponse} from '../../models/booking.model';
import {NavbarComponent} from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-bookings',
  imports: [NavbarComponent, RouterLink, ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class BookingsComponent  implements OnInit {

  bookings = signal<BookingResponse[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');

  constructor(private bookingService: BookingService) { }

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.bookingService.getMyBookings().subscribe({
      next: bookings => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else if (error.status === 404) {
          this.bookings.set([]);
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to load bookings.'));
        }

        this.loading.set(false);
      }
    })
  }

  cancelBooking(id: number){
    this.error.set('');
    this.success.set('');

    this.bookingService.cancelBooking(id).subscribe({
      next: () =>{
        this.bookings.set(this.bookings().map(booking =>
          booking.id === id
            ? {
                ...booking,
                status: 'Cancelled',
                paymentStatus: booking.paymentStatus === 'Paid'
                  ? 'Refunded'
                  : booking.paymentMethod === 'Online' ? 'Cancelled' : booking.paymentStatus
              }
            : booking
        ));
        this.success.set('Booking cancelled successfully.');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to cancel booking.'));
        }
      }
    })
  }

  clearBooking(id: number) {
    this.error.set('');
    this.success.set('');

    this.bookingService.clearBooking(id).subscribe({
      next: () => {
        this.bookings.set(this.bookings().filter(booking => booking.id !== id));
        this.success.set('Booking cleared.');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to clear booking.'));
        }
      }
    });
  }

  canClearBooking(booking: BookingResponse) {
    return booking.status === 'Cancelled' || booking.status === 'Completed';
  }

  canPayOnline(booking: BookingResponse) {
    return booking.paymentMethod === 'Online' &&
      !!booking.paymentId &&
      !['Paid', 'Processing', 'Refunded'].includes(booking.paymentStatus) &&
      booking.status !== 'Cancelled' &&
      booking.status !== 'Completed';
  }

  canCancelBooking(booking: BookingResponse) {
    if (booking.status === 'Cancelled' || booking.status === 'Completed') {
      return false;
    }

    const cancellationStart = booking.bookingType === 'Equipment' ? booking.pickupDate : booking.startDate;
    if (!cancellationStart) return false;
    const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
    return new Date(cancellationStart).getTime() > twoHoursFromNow;
  }

  isFacilityBooking(booking: BookingResponse) {
    return booking.bookingType === 'Facility' || booking.bookingType === 'Package';
  }

  isEquipmentBooking(booking: BookingResponse) {
    return booking.bookingType === 'Equipment' || booking.bookingType === 'Package';
  }

  getBookingTypeLabel(bookingType: string) {
    if (bookingType === 'Facility') {
      return 'Facility booking';
    }

    if (bookingType === 'Equipment') {
      return 'Equipment rental';
    }

    if (bookingType === 'Package') {
      return 'Facility + equipment package';
    }

    return bookingType;
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

  getDurationHours(startDate: string, endDate: string) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const hours = (end - start) / 1000 / 60 / 60;

    return Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
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


