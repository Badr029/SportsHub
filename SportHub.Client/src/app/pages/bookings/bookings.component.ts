import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';


import {BookingService} from '../../core/services/booking.service';
import {BookingResponse} from '../../models/booking.model';
import {NavbarComponent} from '../../shared/navbar/navbar.component';

interface PendingBookingAction {
  kind: 'cancel' | 'clear';
  bookingId: number;
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-bookings',
  imports: [NavbarComponent, RouterLink, ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class BookingsComponent implements OnInit, OnDestroy {

  bookings = signal<BookingResponse[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');

  pendingAction = signal<PendingBookingAction | null>(null);

  // Ticks once a minute so the countdown on the next booking stays honest
  // without re-rendering the whole list on every frame.
  private now = signal(Date.now());
  private clock?: number;

  constructor(private bookingService: BookingService) { }

  ngOnInit() {
    this.loadBookings();
    this.clock = window.setInterval(() => this.now.set(Date.now()), 60_000);
  }

  ngOnDestroy() {
    if (this.clock) {
      window.clearInterval(this.clock);
    }
  }

  /** The soonest booking that has not started and is not closed. */
  nextBooking() {
    const upcoming = this.upcomingBookings();
    return upcoming.length > 0 ? upcoming[0] : null;
  }

  /** Everything still ahead of us, soonest first. */
  upcomingBookings() {
    const now = this.now();

    return this.bookings()
      .filter(booking =>
        booking.status !== 'Cancelled' &&
        booking.status !== 'Completed' &&
        this.startTimeOf(booking) > now)
      .sort((a, b) => this.startTimeOf(a) - this.startTimeOf(b));
  }

  /** Everything else: past, cancelled or completed. Most recent first. */
  pastBookings() {
    const upcoming = new Set(this.upcomingBookings().map(booking => booking.id));

    return this.bookings()
      .filter(booking => !upcoming.has(booking.id))
      .sort((a, b) => this.startTimeOf(b) - this.startTimeOf(a));
  }

  laterBookings() {
    return this.upcomingBookings().slice(1);
  }

  startTimeOf(booking: BookingResponse) {
    const value = booking.bookingType === 'Equipment' ? booking.pickupDate : booking.startDate;
    return value ? new Date(value).getTime() : 0;
  }

  /** "in 3 days", "in 4 hours", "in 25 minutes" — whichever unit reads best. */
  countdownLabel(booking: BookingResponse) {
    const diff = this.startTimeOf(booking) - this.now();

    if (diff <= 0) {
      return 'Starting now';
    }

    const minutes = Math.round(diff / 60_000);

    if (minutes < 60) {
      return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    }

    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? '' : 's'}`;
  }

  isToday(booking: BookingResponse) {
    const start = new Date(this.startTimeOf(booking));
    const today = new Date(this.now());
    return start.toDateString() === today.toDateString();
  }

  dayLabel(booking: BookingResponse) {
    const start = new Date(this.startTimeOf(booking));

    if (this.isToday(booking)) {
      return 'Today';
    }

    const tomorrow = new Date(this.now());
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (start.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  timeOnly(booking: BookingResponse) {
    return new Date(this.startTimeOf(booking)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  summaryLine(booking: BookingResponse) {
    if (booking.facility) {
      return booking.facility.name;
    }

    if (booking.equipment.length === 1) {
      return booking.equipment[0].name;
    }

    if (booking.equipment.length > 1) {
      return `${booking.equipment.length} equipment items`;
    }

    return this.getBookingTypeLabel(booking.bookingType);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingAction()) {
      this.dismissPendingAction();
    }
  }

  requestCancel(booking: BookingResponse) {
    this.pendingAction.set({
      kind: 'cancel',
      bookingId: booking.id,
      title: 'Cancel this booking?',
      message: `${this.getBookingTypeLabel(booking.bookingType)} #${booking.id} will be released and the slot returned to the schedule. This cannot be undone.`,
      confirmLabel: 'Cancel booking'
    });
  }

  requestClear(booking: BookingResponse) {
    this.pendingAction.set({
      kind: 'clear',
      bookingId: booking.id,
      title: 'Clear this booking from your list?',
      message: `Booking #${booking.id} will be hidden from your history permanently. The venue keeps its own record.`,
      confirmLabel: 'Clear booking'
    });
  }

  confirmPendingAction() {
    const action = this.pendingAction();

    if (!action) {
      return;
    }

    this.pendingAction.set(null);

    if (action.kind === 'cancel') {
      this.cancelBooking(action.bookingId);
      return;
    }

    this.clearBooking(action.bookingId);
  }

  dismissPendingAction() {
    this.pendingAction.set(null);
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


