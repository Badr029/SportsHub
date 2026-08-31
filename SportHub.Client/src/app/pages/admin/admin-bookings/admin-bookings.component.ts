import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { AdminBookingResponse } from '../../../models/booking.model';

interface PendingAdminAction {
  kind: 'confirm' | 'cancel';
  booking: AdminBookingResponse;
  title: string;
  body: string;
  confirmLabel: string;
  busyLabel: string;
  dismissLabel: string;
  destructive: boolean;
}

@Component({
  selector: 'app-admin-bookings',
  imports: [FormsModule, NavbarComponent],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css'
})
export class AdminBookingsComponent implements OnInit, OnDestroy {
  // Cancelling releases a customer's reservation and cannot be undone,
  // so it is the one action here that asks first (SRS UI-05).
  // State-changing actions are guarded by a dialog so a single stray click
  // cannot commit them. The dialog owns its own in-flight state so the confirm
  // button can be disabled while the request is running (prevents double
  // submission) without disabling the whole row.
  pendingAction = signal<PendingAdminAction | null>(null);
  actionInFlight = signal(false);
  busyBookingId = signal<number | null>(null);

  bookings = signal<AdminBookingResponse[]>([]);
  statusFilter = signal('All');
  page = signal(1);
  pageSize = 6;
  totalPages = signal(1);
  totalCount = signal(0);
  loading = signal(true);
  /** Failure to load the list. Blocks the queue, because there is nothing to show. */
  error = signal('');
  /** Failure of an action on one row. Must not destroy the list around it. */
  actionError = signal('');
  success = signal('');

  readonly statuses = ['All', 'Pending', 'Confirmed', 'Cancelled', 'Completed'];

  // Time gates open on their own: without a ticking clock an admin would sit
  // looking at a disabled Complete button after the booking had ended.
  private now = signal(Date.now());
  private clock?: number;

  /** "Football ×2, Away Vest ×5" — or a count once the list gets long. */
  equipmentSummary(booking: AdminBookingResponse) {
    const items = booking.equipment;

    if (items.length === 0) {
      return '';
    }

    if (items.length > 3) {
      return `${items.length} equipment items`;
    }

    return this.equipmentFull(booking);
  }

  /** Every item spelled out, for the tooltip behind a summarised count. */
  equipmentFull(booking: AdminBookingResponse) {
    return booking.equipment.map(item => `${item.name} ×${item.quantity}`).join(', ');
  }

  /**
   * An equipment-only rental. Its own startDate is midnight on the pickup day,
   * so its timings must be read from pickupDate/returnDate instead.
   */
  isRentalOnly(booking: AdminBookingResponse) {
    return booking.bookingType === 'Equipment';
  }

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadBookings();
    this.clock = window.setInterval(() => this.now.set(Date.now()), 30_000);
  }

  ngOnDestroy() {
    if (this.clock) {
      window.clearInterval(this.clock);
    }
  }

  loadBookings(keepSuccess = false) {
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');

    if (!keepSuccess) {
      this.success.set('');
    }

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
    this.runAction(this.adminService.confirmBooking(id), `Booking #${id} confirmed.`, id);
  }

  markPickedUp(id: number) {
    this.runAction(this.adminService.markPickedUp(id), `Booking #${id}: equipment picked up.`, id);
  }

  markReturned(id: number) {
    this.runAction(this.adminService.markReturned(id), `Booking #${id}: equipment returned.`, id);
  }

  completeBooking(id: number) {
    this.runAction(this.adminService.completeBooking(id), `Booking #${id} completed.`, id);
  }

  requestCancel(booking: AdminBookingResponse) {
    this.pendingAction.set({
      kind: 'cancel',
      booking,
      title: `Cancel booking #${booking.id}?`,
      body: `${booking.user.name}'s ${booking.bookingType} booking will be released and the slot returned to the schedule. The customer is not notified automatically, and this cannot be undone.`,
      confirmLabel: 'Cancel booking',
      busyLabel: 'Cancelling…',
      dismissLabel: 'Keep it',
      destructive: true
    });
  }

  requestConfirm(booking: AdminBookingResponse) {
    const when = booking.bookingType === 'Equipment'
      ? `pickup ${this.formatDateTime(booking.pickupDate ?? booking.startDate)}`
      : `${this.formatDateTime(booking.startDate)} to ${this.formatTime(booking.endDate)}`;

    this.pendingAction.set({
      kind: 'confirm',
      booking,
      title: `Confirm booking #${booking.id}?`,
      body: `${booking.user.name}'s ${booking.bookingType} booking for ${when} will be confirmed and the customer will be expected to attend. Total ${booking.totalPrice} EGP, ${booking.paymentMethod === 'PayOnSite' ? 'payable on site' : 'paid online'}.`,
      confirmLabel: 'Confirm booking',
      busyLabel: 'Confirming…',
      dismissLabel: 'Not yet',
      destructive: false
    });
  }

  dismissAction() {
    // A request already in flight must not be abandoned mid-way.
    if (this.actionInFlight()) {
      return;
    }

    this.pendingAction.set(null);
  }

  commitAction() {
    const pending = this.pendingAction();

    // Guard against a double click landing twice on the same request.
    if (!pending || this.actionInFlight()) {
      return;
    }

    const { kind, booking } = pending;
    this.actionInFlight.set(true);

    const request = kind === 'cancel'
      ? this.adminService.cancelBooking(booking.id)
      : this.adminService.confirmBooking(booking.id);

    const message = kind === 'cancel'
      ? `Booking #${booking.id} cancelled.`
      : `Booking #${booking.id} confirmed.`;

    this.runAction(request, message, booking.id, () => {
      this.actionInFlight.set(false);
      this.pendingAction.set(null);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingAction()) {
      this.dismissAction();
    }
  }

  runAction(request: any, successMessage: string, bookingId?: number, done?: () => void) {
    this.actionError.set('');
    this.success.set('');
    this.busyBookingId.set(bookingId ?? null);

    request.subscribe({
      next: () => {
        this.busyBookingId.set(null);
        done?.();
        this.success.set(successMessage);
        // Keep the confirmation visible: the refresh below would otherwise
        // clear it before the admin ever sees the action succeeded.
        this.loadBookings(true);
      },
      error: (error: any) => {
        this.busyBookingId.set(null);
        done?.();

        // Reported inline; the queue, the filter and the page position stay put.
        if (error.status === 0) {
          this.actionError.set('Cannot reach the server. The booking was not changed.');
        } else {
          this.actionError.set(this.getErrorMessage(error, 'That action could not be completed. The booking was not changed.'));
        }
      }
    });
  }

  isBusy(booking: AdminBookingResponse) {
    return this.busyBookingId() === booking.id;
  }

  // --- Action gates ---------------------------------------------------------
  // These mirror AdminBookingsController exactly. The UI must never offer an
  // action the API will reject, and when it withholds one it should say why.

  /** Staff may hand equipment over this many minutes before the booked time. */
  private readonly pickupGraceMinutes = 60;

  /** When the customer is due — the pickup time for rentals. */
  private startOf(booking: AdminBookingResponse) {
    const value = booking.bookingType === 'Equipment'
      ? booking.pickupDate ?? booking.startDate
      : booking.startDate;
    return new Date(value).getTime();
  }

  /** When the booking is over — the return time for rentals. */
  private endOf(booking: AdminBookingResponse) {
    const value = booking.bookingType === 'Equipment'
      ? booking.returnDate ?? booking.endDate
      : booking.endDate;
    return new Date(value).getTime();
  }

  private isPaidOrOnsite(booking: AdminBookingResponse) {
    return booking.paymentMethod === 'PayOnSite' || booking.paymentStatus === 'Paid';
  }

  isClosedBooking(booking: AdminBookingResponse) {
    return booking.status === 'Cancelled' || booking.status === 'Completed';
  }

  hasEnded(booking: AdminBookingResponse) {
    return this.endOf(booking) <= this.now();
  }

  canConfirm(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) &&
      booking.status === 'Pending' &&
      !this.hasEnded(booking) &&
      this.isPaidOrOnsite(booking);
  }

  confirmBlockedReason(booking: AdminBookingResponse) {
    if (booking.status !== 'Pending') return '';
    if (this.hasEnded(booking)) return 'This booking has already ended.';
    if (!this.isPaidOrOnsite(booking)) return 'Waiting on online payment.';
    return '';
  }

  /** Pickup opens shortly before the booked time, never days early. */
  canPickup(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) &&
      booking.bookingType === 'Equipment' &&
      booking.status === 'Confirmed' &&
      booking.rentalStatus === 'PendingPickup' &&
      this.isPaidOrOnsite(booking) &&
      this.now() >= this.startOf(booking) - this.pickupGraceMinutes * 60_000;
  }

  pickupBlockedReason(booking: AdminBookingResponse) {
    if (booking.bookingType !== 'Equipment' || booking.rentalStatus !== 'PendingPickup') return '';
    if (booking.status !== 'Confirmed') return 'Confirm the booking before handing gear over.';
    if (!this.isPaidOrOnsite(booking)) return 'Waiting on online payment.';

    const opensAt = this.startOf(booking) - this.pickupGraceMinutes * 60_000;

    if (this.now() < opensAt) {
      return `Pickup opens ${this.clockLabel(opensAt)}.`;
    }

    return '';
  }

  canReturn(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking) &&
      booking.bookingType === 'Equipment' &&
      booking.rentalStatus === 'Active';
  }

  /** A booking is only complete once the time it reserved has passed. */
  canComplete(booking: AdminBookingResponse) {
    if (this.isClosedBooking(booking) || booking.status !== 'Confirmed') {
      return false;
    }

    if (!this.hasEnded(booking)) {
      return false;
    }

    // Gear still out means the rental is not finished, whatever the clock says.
    return booking.bookingType !== 'Equipment' || booking.rentalStatus === 'Returned';
  }

  completeBlockedReason(booking: AdminBookingResponse) {
    if (booking.status !== 'Confirmed') return '';

    if (!this.hasEnded(booking)) {
      return `Runs until ${this.clockLabel(this.endOf(booking))}.`;
    }

    if (booking.bookingType === 'Equipment' && booking.rentalStatus !== 'Returned') {
      return 'Mark the equipment returned first.';
    }

    return '';
  }

  canCancel(booking: AdminBookingResponse) {
    return !this.isClosedBooking(booking);
  }

  /** The single next thing a human should do with this booking, if anything. */
  pendingActionNote(booking: AdminBookingResponse) {
    if (this.isClosedBooking(booking)) {
      return '';
    }

    // A visible Confirm button already states the next step; repeating it as a
    // note beside the button just adds noise.
    if (this.canConfirm(booking)) {
      return '';
    }

    return this.confirmBlockedReason(booking) ||
      this.pickupBlockedReason(booking) ||
      this.completeBlockedReason(booking);
  }

  // --- Lifecycle ------------------------------------------------------------

  /** The stages this booking type moves through, and where it currently is. */
  lifecycle(booking: AdminBookingResponse) {
    const stages = booking.bookingType === 'Equipment'
      ? ['Pending', 'Confirmed', 'Picked up', 'Returned', 'Done']
      : ['Pending', 'Confirmed', 'Done'];

    return stages.map((label, index) => ({
      label,
      state: this.stageState(booking, label, index)
    }));
  }

  private stageState(booking: AdminBookingResponse, label: string, index: number) {
    if (booking.status === 'Cancelled') {
      return index === 0 ? 'cancelled' : 'idle';
    }

    const reached = this.stageIndex(booking);

    if (index < reached) return 'done';
    if (index === reached) return 'current';
    return 'idle';
  }

  private stageIndex(booking: AdminBookingResponse) {
    if (booking.status === 'Completed') {
      return booking.bookingType === 'Equipment' ? 4 : 2;
    }

    if (booking.status === 'Confirmed') {
      if (booking.bookingType !== 'Equipment') return 1;
      if (booking.rentalStatus === 'Returned') return 3;
      if (booking.rentalStatus === 'Active') return 2;
      return 1;
    }

    return 0;
  }

  // --- Time -----------------------------------------------------------------

  /** "in 3 days", "in 40 minutes", "2 hours ago" — whichever reads best. */
  relativeLabel(value: string | number) {
    const diff = (typeof value === 'number' ? value : new Date(value).getTime()) - this.now();
    const abs = Math.abs(diff);
    const minutes = Math.round(abs / 60_000);

    let text: string;
    if (minutes < 60) {
      text = `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      text = `${hours} hour${hours === 1 ? '' : 's'}`;
    } else {
      const days = Math.round(minutes / 1440);
      text = `${days} day${days === 1 ? '' : 's'}`;
    }

    return diff >= 0 ? `in ${text}` : `${text} ago`;
  }

  isToday(value: string | number) {
    const d = new Date(value);
    const today = new Date(this.now());
    return d.toDateString() === today.toDateString();
  }

  /** Exposed for the template's time context. */
  startsAt(booking: AdminBookingResponse) { return this.startOf(booking); }
  endsAt(booking: AdminBookingResponse) { return this.endOf(booking); }

  private clockLabel(timestamp: number) {
    const date = new Date(timestamp);
    const today = new Date(this.now());
    const sameDay = date.toDateString() === today.toDateString();

    return sameDay
      ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : date.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  }

  filteredBookings() {
    return this.bookings();
  }

  isFacilityBooking(booking: AdminBookingResponse) {
    return booking.bookingType === 'Facility' || booking.bookingType === 'Package';
  }

  isEquipmentBooking(booking: AdminBookingResponse) {
    return booking.bookingType === 'Equipment' || booking.bookingType === 'Package';
  }

  formatDateTime(value: string | number | null | undefined) {
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
    // The API returns a plain-text reason for rejected actions; anything else
    // (transport failures, HTML error pages) is not fit to show an admin.
    if (typeof error.error === 'string' && error.error.length > 0 && error.error.length < 300 &&
        !error.error.trimStart().startsWith('<')) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    // error.message is Angular's transport description ("Http failure response
    // for <url>: 404 Not Found"). It names an internal endpoint and means
    // nothing to an administrator, so it is deliberately not surfaced.
    return fallback;
  }
}
